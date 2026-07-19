import { prisma } from '@/lib/prisma'
import { appErrors } from '@/core/errors'

export type ClassSaldo = {
  year: number
  month: number
  pemasukan: number
  pengeluaran: number
  saldo: number
  saldoTerkini: number
}

export async function getClassSaldo(classId: string, query: { year?: string | null; month?: string | null }): Promise<ClassSaldo> {
  const { year, month } = query

  if (!year || !month) {
    throw appErrors.validation('Parameter year dan month wajib diisi')
  }

  const selectedYear = parseInt(year, 10)
  const selectedMonth = parseInt(month, 10)
  const startDate = new Date(selectedYear, selectedMonth - 1, 1)
  const endDate = new Date(selectedYear, selectedMonth, 1)

  const [monthlyPayments, monthlyExpenses, totalPayments, totalExpenses] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        OR: [
          { classId },
          { classId: null, student: { classId } },
        ],
        year: selectedYear,
        month: selectedMonth,
        isPaid: true,
      },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: {
        classId,
        spentAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        OR: [
          { classId },
          { classId: null, student: { classId } },
        ],
        isPaid: true,
      },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { classId },
      _sum: { amount: true },
    }),
  ])

  const pemasukan = monthlyPayments._sum.amount || 0
  const pengeluaran = monthlyExpenses._sum.amount || 0
  const saldoTerkini = (totalPayments._sum.amount || 0) - (totalExpenses._sum.amount || 0)

  return {
    year: selectedYear,
    month: selectedMonth,
    pemasukan,
    pengeluaran,
    saldo: pemasukan - pengeluaran,
    saldoTerkini,
  }
}
