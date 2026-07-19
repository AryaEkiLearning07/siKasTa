import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireClassAccess } from '@/lib/authorize'
import { createAuditLog, getRequestAuditFields } from '@/lib/audit'
import { createWithdrawalRequestSchema } from '@/lib/validations'

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireClassAccess(id)

    const withdrawalRequests = await prisma.withdrawalRequest.findMany({
      where: { classId: id },
      include: {
        student: { select: { id: true, name: true, nisn: true } },
        requestedBy: { select: { id: true, name: true, role: true } },
        processedBy: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ withdrawalRequests })
  } catch (error) {
    console.error('List withdrawal requests error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireClassAccess(id)

    if (user.role !== 'WALI_KELAS' && user.role !== 'BENDAHARA') {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses untuk mengajukan penarikan' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = createWithdrawalRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data tidak valid', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { studentId, amount, reason } = parsed.data

    const student = await prisma.student.findFirst({
      where: { id: studentId, classId: id },
      select: { id: true, classId: true, status: true },
    })

    if (!student) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 })
    }

    if (student.status === 'PINDAH') {
      return NextResponse.json(
        { error: 'Tidak dapat mengajukan penarikan untuk siswa pindah' },
        { status: 400 }
      )
    }

    const withdrawalRequest = await prisma.$transaction(async (tx) => {
      const account = await tx.savingsAccount.upsert({
        where: { studentId },
        update: {},
        create: {
          studentId,
          classId: id,
        },
      })

      if (account.isLocked) {
        throw new Error('SAVINGS_LOCKED')
      }

      const totals = await tx.savingsTransaction.groupBy({
        by: ['type'],
        where: { accountId: account.id },
        _sum: { amount: true },
      })

      const balance = balanceFromTotals(totals)
      if (balance < amount) {
        throw new Error('INSUFFICIENT_BALANCE')
      }

      const created = await tx.withdrawalRequest.create({
        data: {
          accountId: account.id,
          studentId,
          classId: id,
          amount,
          reason: reason?.trim() || null,
          requestedById: user.id,
        },
        include: {
          student: { select: { id: true, name: true, nisn: true } },
          requestedBy: { select: { id: true, name: true, role: true } },
          processedBy: { select: { id: true, name: true, role: true } },
        },
      })

      await createAuditLog(tx, {
        eventType: 'KEUANGAN',
        eventAction: 'withdrawal_requested',
        status: 'SUCCESS',
        severity: 'MEDIUM',
        actorId: user.id,
        actorRole: user.role,
        entityType: 'WithdrawalRequest',
        entityId: created.id,
        classId: id,
        ...getRequestAuditFields(request),
        metadata: {
          studentId,
          amount,
        },
        newValue: {
          studentId,
          amount,
          status: created.status,
          reason: reason?.trim() || null,
        },
      })

      if (user.role === 'BENDAHARA') {
        const waliKelas = await tx.user.findMany({
          where: { classId: id, role: 'WALI_KELAS' },
          select: { id: true },
        })

        if (waliKelas.length > 0) {
          await tx.notification.createMany({
            data: waliKelas.map((wali) => ({
              userId: wali.id,
              classId: id,
              title: 'Pengajuan Penarikan',
              body: 'Ada pengajuan penarikan tabungan yang menunggu keputusan.',
              type: 'withdrawal_requested',
              entityId: created.id,
            })),
          })
        }
      }

      return created
    })

    return NextResponse.json({ withdrawalRequest }, { status: 201 })
  } catch (error) {
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

    console.error('Create withdrawal request error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
