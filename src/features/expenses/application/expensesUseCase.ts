import type { Expense, Prisma, Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { createExpenseSchema } from '@/lib/validations'
import { appErrors } from '@/core/errors'
import type { RequestAuditContext } from '@/core/audit/context'

type Actor = {
  id: string
  role: Role
  classId: string | null
}

const expenseInclude = {
  recordedBy: {
    select: { id: true, name: true },
  },
} satisfies Prisma.ExpenseInclude

export type ExpenseWithRecorder = Prisma.ExpenseGetPayload<{ include: typeof expenseInclude }>

export async function listClassExpenses(classId: string, query: { year?: string | null; month?: string | null }): Promise<ExpenseWithRecorder[]> {
  const { year, month } = query

  return prisma.expense.findMany({
    where: {
      classId,
      ...(year && month
        ? {
            spentAt: {
              gte: new Date(`${year}-${month}-01`),
              lt: new Date(`${year}-${parseInt(month) + 1}-01`),
            },
          }
        : {}),
    },
    include: expenseInclude,
    orderBy: { spentAt: 'desc' },
  })
}

export async function createClassExpense(input: unknown, classId: string, actor: Actor, auditContext: RequestAuditContext): Promise<ExpenseWithRecorder> {
  assertBendaharaOwnsClass(actor, classId, 'Hanya bendahara yang dapat membuat pengeluaran')

  const parsed = createExpenseSchema.safeParse(input)
  if (!parsed.success) {
    throw appErrors.validation('Data tidak valid', parsed.error.flatten())
  }

  const { category, itemName, amount, photoUrl, note, spentAt } = parsed.data

  return prisma.$transaction(async (tx) => {
    const created = await tx.expense.create({
      data: {
        classId,
        category,
        itemName,
        amount,
        photoUrl,
        note,
        spentAt: new Date(spentAt),
        recordedById: actor.id,
      },
      include: expenseInclude,
    })

    await createAuditLog(tx, {
      eventType: 'KEUANGAN',
      eventAction: 'expense_created',
      status: 'SUCCESS',
      severity: 'MEDIUM',
      actorId: actor.id,
      actorRole: actor.role,
      entityType: 'Expense',
      entityId: created.id,
      classId,
      ...auditContext,
      metadata: {
        itemName,
        category,
        amount,
      },
      newValue: {
        itemName,
        category,
        amount,
        spentAt,
        hasPhoto: Boolean(photoUrl),
        note: note || null,
      },
    })

    return created
  })
}

export async function deleteClassExpense(classId: string, expenseId: string, actor: Actor, auditContext: RequestAuditContext): Promise<void> {
  assertBendahara(actor, 'Hanya bendahara yang dapat menghapus pengeluaran')

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
  })

  if (!expense) {
    throw appErrors.notFound('Pengeluaran tidak ditemukan')
  }

  if (actor.classId !== classId || actor.classId !== expense.classId) {
    throw appErrors.forbidden('Anda tidak memiliki akses ke pengeluaran ini')
  }

  await prisma.$transaction(async (tx) => {
    await tx.expense.delete({ where: { id: expenseId } })

    await createAuditLog(tx, {
      eventType: 'KEUANGAN',
      eventAction: 'expense_deleted',
      status: 'SUCCESS',
      severity: 'HIGH',
      actorId: actor.id,
      actorRole: actor.role,
      entityType: 'Expense',
      entityId: expenseId,
      classId,
      ...auditContext,
      metadata: {
        itemName: expense.itemName,
        category: expense.category,
        amount: expense.amount,
      },
      oldValue: serializeExpenseForAudit(expense),
      newValue: {
        status: 'DELETED',
      },
    })
  })
}

export function assertCanReadExpenses(actor: Actor) {
  assertBendahara(actor, 'Hanya bendahara yang dapat melihat pengeluaran')
}

function assertBendaharaOwnsClass(actor: Actor, classId: string, roleMessage: string) {
  assertBendahara(actor, roleMessage)

  if (actor.classId !== classId) {
    throw appErrors.forbidden('Anda tidak memiliki akses ke kelas ini')
  }
}

function assertBendahara(actor: Actor, roleMessage: string) {
  if (actor.role !== 'BENDAHARA') {
    throw appErrors.forbidden(roleMessage)
  }
}

function serializeExpenseForAudit(expense: Expense) {
  return {
    itemName: expense.itemName,
    category: expense.category,
    amount: expense.amount,
    spentAt: expense.spentAt,
    hasPhoto: Boolean(expense.photoUrl),
    note: expense.note,
  }
}
