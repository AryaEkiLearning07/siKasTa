import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireClassAccess } from '@/lib/authorize'
import { createAuditLog, getRequestAuditFields } from '@/lib/audit'
import { createSavingsDepositSchema } from '@/lib/validations'

export const dynamic = 'force-dynamic'

function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00`)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireClassAccess(id)

    if (user.role !== 'WALI_KELAS') {
      return NextResponse.json(
        { error: 'Hanya wali kelas yang dapat mencatat setoran tabungan' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = createSavingsDepositSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data tidak valid', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { studentId, amount, transactionDate, note } = parsed.data

    const student = await prisma.student.findFirst({
      where: { id: studentId, classId: id },
      select: { id: true, classId: true, status: true },
    })

    if (!student) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 })
    }

    if (student.status === 'PINDAH') {
      return NextResponse.json(
        { error: 'Tidak dapat mencatat tabungan untuk siswa pindah' },
        { status: 400 }
      )
    }

    const transaction = await prisma.$transaction(async (tx) => {
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

      const created = await tx.savingsTransaction.create({
        data: {
          accountId: account.id,
          studentId,
          classId: id,
          type: 'DEPOSIT',
          amount,
          transactionDate: parseDateOnly(transactionDate),
          note: note?.trim() || null,
          recordedById: user.id,
        },
      })

      await createAuditLog(tx, {
        eventType: 'KEUANGAN',
        eventAction: 'savings_deposit_created',
        status: 'SUCCESS',
        severity: 'LOW',
        actorId: user.id,
        actorRole: user.role,
        entityType: 'SavingsTransaction',
        entityId: created.id,
        classId: id,
        ...getRequestAuditFields(request),
        metadata: {
          studentId,
          amount,
          transactionDate,
        },
        newValue: {
          studentId,
          amount,
          transactionDate,
          note: note?.trim() || null,
        },
      })

      return created
    })

    return NextResponse.json({ transaction }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'SAVINGS_LOCKED') {
      return NextResponse.json(
        { error: 'Tabungan siswa sedang dikunci' },
        { status: 400 }
      )
    }

    console.error('Create savings deposit error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
