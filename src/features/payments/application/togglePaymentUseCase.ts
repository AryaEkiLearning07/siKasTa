import type { Payment, Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { togglePaymentSchema } from '@/lib/validations'
import { appErrors } from '@/core/errors'
import type { RequestAuditContext } from '@/core/audit/context'

type Actor = {
  id: string
  role: Role
  classId: string | null
}

export async function toggleStudentPayment(input: unknown, actor: Actor, auditContext: RequestAuditContext): Promise<Payment> {
  if (actor.role !== 'BENDAHARA') {
    throw appErrors.forbidden('Hanya bendahara yang dapat mengubah pembayaran')
  }

  const parsed = togglePaymentSchema.safeParse(input)
  if (!parsed.success) {
    throw appErrors.validation('Data tidak valid', parsed.error.flatten())
  }

  const { studentId, year, month, isPaid } = parsed.data
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      classId: true,
      status: true,
      class: {
        select: { kasNominal: true },
      },
    },
  })

  if (!student) {
    throw appErrors.notFound('Siswa tidak ditemukan')
  }

  if (actor.classId !== student.classId) {
    throw appErrors.forbidden('Anda tidak memiliki akses ke siswa ini')
  }

  if (student.status !== 'AKTIF') {
    throw appErrors.businessRule(`Tidak dapat mengubah pembayaran untuk siswa dengan status ${student.status}`)
  }

  const amount = student.class.kasNominal
  const existingPayment = await prisma.payment.findUnique({
    where: {
      studentId_year_month: { studentId, year, month },
    },
  })

  return prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.upsert({
      where: {
        studentId_year_month: { studentId, year, month },
      },
      create: {
        studentId,
        classId: student.classId,
        year,
        month,
        isPaid,
        amount,
        paidAt: isPaid ? new Date() : null,
        recordedById: actor.id,
      },
      update: {
        classId: student.classId,
        isPaid,
        amount,
        paidAt: isPaid ? new Date() : null,
        recordedById: actor.id,
      },
    })

    await createAuditLog(tx, {
      eventType: 'KEUANGAN',
      eventAction: existingPayment ? 'payment_updated' : 'payment_created',
      status: 'SUCCESS',
      severity: 'MEDIUM',
      actorId: actor.id,
      actorRole: actor.role,
      entityType: 'Payment',
      entityId: updatedPayment.id,
      classId: student.classId,
      ...auditContext,
      metadata: {
        studentId,
        year,
        month,
      },
      oldValue: existingPayment
        ? {
            isPaid: existingPayment.isPaid,
            amount: existingPayment.amount,
            paidAt: existingPayment.paidAt,
          }
        : undefined,
      newValue: {
        isPaid: updatedPayment.isPaid,
        amount: updatedPayment.amount,
        paidAt: updatedPayment.paidAt,
      },
    })

    return updatedPayment
  })
}
