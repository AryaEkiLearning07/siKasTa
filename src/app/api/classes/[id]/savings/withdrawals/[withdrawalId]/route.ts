import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireClassAccess } from '@/lib/authorize'
import { createAuditLog, getRequestAuditFields } from '@/lib/audit'
import { processWithdrawalRequestSchema } from '@/lib/validations'

export const dynamic = 'force-dynamic'

type TransactionTotal = {
  type: 'DEPOSIT' | 'WITHDRAWAL'
  _sum: { amount: number | null }
}

function balanceFromTotals(totals: TransactionTotal[]) {
  return totals.reduce((balance, total) => {
    const amount = total._sum.amount || 0
    return total.type === 'DEPOSIT' ? balance + amount : balance - amount
  }, 0)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; withdrawalId: string }> }
) {
  try {
    const { id, withdrawalId } = await params
    const user = await requireClassAccess(id)

    if (user.role !== 'WALI_KELAS') {
      return NextResponse.json(
        { error: 'Hanya wali kelas yang dapat memproses penarikan' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = processWithdrawalRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data tidak valid', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { status, rejectedReason } = parsed.data

    const withdrawalRequest = await prisma.$transaction(async (tx) => {
      const existing = await tx.withdrawalRequest.findFirst({
        where: {
          id: withdrawalId,
          classId: id,
        },
        include: {
          account: true,
          student: { select: { id: true, name: true, nisn: true } },
          requestedBy: { select: { id: true, name: true, role: true } },
        },
      })

      if (!existing) {
        throw new Error('NOT_FOUND')
      }

      if (existing.status !== 'MENUNGGU') {
        throw new Error('ALREADY_PROCESSED')
      }

      if (existing.account.isLocked) {
        throw new Error('SAVINGS_LOCKED')
      }

      if (status === 'DISETUJUI') {
        const totals = await tx.savingsTransaction.groupBy({
          by: ['type'],
          where: { accountId: existing.accountId },
          _sum: { amount: true },
        })

        const balance = balanceFromTotals(totals)
        if (balance < existing.amount) {
          throw new Error('INSUFFICIENT_BALANCE')
        }

        await tx.savingsTransaction.create({
          data: {
            accountId: existing.accountId,
            studentId: existing.studentId,
            classId: id,
            type: 'WITHDRAWAL',
            amount: existing.amount,
            transactionDate: new Date(),
            note: existing.reason,
            recordedById: existing.requestedById,
            approvedById: user.id,
            withdrawalRequestId: existing.id,
          },
        })
      }

      const updated = await tx.withdrawalRequest.update({
        where: { id: existing.id },
        data: {
          status,
          processedById: user.id,
          processedAt: new Date(),
          rejectedReason: status === 'DITOLAK' ? rejectedReason?.trim() || null : null,
        },
        include: {
          student: { select: { id: true, name: true, nisn: true } },
          requestedBy: { select: { id: true, name: true, role: true } },
          processedBy: { select: { id: true, name: true, role: true } },
        },
      })

      if (existing.requestedById !== user.id) {
        await tx.notification.create({
          data: {
            userId: existing.requestedById,
            classId: id,
            title: status === 'DISETUJUI' ? 'Penarikan Disetujui' : 'Penarikan Ditolak',
            body:
              status === 'DISETUJUI'
                ? 'Pengajuan penarikan tabungan sudah disetujui wali kelas.'
                : `Pengajuan penarikan tabungan ditolak: ${rejectedReason?.trim()}`,
            type: status === 'DISETUJUI' ? 'withdrawal_approved' : 'withdrawal_rejected',
            entityId: existing.id,
          },
        })
      }

      await createAuditLog(tx, {
        eventType: 'KEUANGAN',
        eventAction: status === 'DISETUJUI' ? 'withdrawal_approved' : 'withdrawal_rejected',
        status: 'SUCCESS',
        severity: status === 'DISETUJUI' ? 'MEDIUM' : 'HIGH',
        actorId: user.id,
        actorRole: user.role,
        entityType: 'WithdrawalRequest',
        entityId: existing.id,
        classId: id,
        ...getRequestAuditFields(request),
        metadata: {
          studentId: existing.studentId,
          amount: existing.amount,
          status,
        },
        oldValue: {
          status: existing.status,
          processedById: existing.processedById,
          processedAt: existing.processedAt,
          rejectedReason: existing.rejectedReason,
        },
        newValue: {
          status: updated.status,
          processedById: updated.processedById,
          processedAt: updated.processedAt,
          rejectedReason: updated.rejectedReason,
        },
      })

      return updated
    })

    return NextResponse.json({ withdrawalRequest })
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Pengajuan tidak ditemukan' }, { status: 404 })
    }

    if (error instanceof Error && error.message === 'ALREADY_PROCESSED') {
      return NextResponse.json(
        { error: 'Pengajuan sudah diproses' },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'SAVINGS_LOCKED') {
      return NextResponse.json(
        { error: 'Tabungan siswa sedang dikunci' },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json(
        { error: 'Saldo tabungan tidak mencukupi' },
        { status: 400 }
      )
    }

    console.error('Process withdrawal request error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
