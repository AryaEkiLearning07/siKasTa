import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireClassAccess } from '@/lib/authorize'

export const dynamic = 'force-dynamic'

type SavingsTotals = { totalDeposits: number; totalWithdrawals: number; balance: number }

function getEmptySavingsTotals(): SavingsTotals {
  return { totalDeposits: 0, totalWithdrawals: 0, balance: 0 }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireClassAccess(id)

    const classData = await prisma.class.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        tingkat: true,
        tahunAjaran: true,
      },
    })

    if (!classData) {
      return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 })
    }

    const [classStudents, existingAccounts] = await Promise.all([
      prisma.student.findMany({
        where: { classId: id },
        select: { id: true, classId: true },
      }),
      prisma.savingsAccount.findMany({
        where: { classId: id },
        select: { studentId: true },
      }),
    ])

    const existingAccountStudentIds = new Set(existingAccounts.map((account) => account.studentId))
    const studentsWithoutAccounts = classStudents.filter((student) => !existingAccountStudentIds.has(student.id))

    if (studentsWithoutAccounts.length > 0) {
      await prisma.savingsAccount.createMany({
        data: studentsWithoutAccounts.map((student) => ({
          studentId: student.id,
          classId: student.classId,
        })),
        skipDuplicates: true,
      })
    }

    const accounts = await prisma.savingsAccount.findMany({
      where: { classId: id },
      select: {
        id: true,
        isLocked: true,
        student: {
          select: {
            id: true,
            name: true,
            nisn: true,
            status: true,
          },
        },
      },
    })
    const accountIds = accounts.map((account) => account.id)

    const [transactionTotals, lastTransactions, recentTransactions, withdrawalRequests] = await Promise.all([
      prisma.savingsTransaction.groupBy({
        by: ['studentId', 'type'],
        where: { accountId: { in: accountIds } },
        _sum: { amount: true },
      }),
      prisma.savingsTransaction.groupBy({
        by: ['studentId'],
        where: { accountId: { in: accountIds } },
        _max: { transactionDate: true },
      }),
      prisma.savingsTransaction.findMany({
        where: { accountId: { in: accountIds } },
        include: {
          student: { select: { id: true, name: true, nisn: true } },
          recordedBy: { select: { id: true, name: true, role: true } },
          approvedBy: { select: { id: true, name: true, role: true } },
        },
        orderBy: [
          { transactionDate: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 15,
      }),
      prisma.withdrawalRequest.findMany({
        where: { classId: id },
        include: {
          student: { select: { id: true, name: true, nisn: true } },
          requestedBy: { select: { id: true, name: true, role: true } },
          processedBy: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ])

    const totalsByStudent = new Map<string, SavingsTotals>()
    for (const total of transactionTotals) {
      const current = totalsByStudent.get(total.studentId) || getEmptySavingsTotals()
      const amount = total._sum.amount || 0

      if (total.type === 'DEPOSIT') {
        current.totalDeposits += amount
      } else {
        current.totalWithdrawals += amount
      }

      current.balance = current.totalDeposits - current.totalWithdrawals
      totalsByStudent.set(total.studentId, current)
    }

    const lastTransactionByStudent = new Map(
      lastTransactions.map((transaction) => [transaction.studentId, transaction._max.transactionDate])
    )

    const students = accounts
      .map((account) => {
        const totals = totalsByStudent.get(account.student.id) || getEmptySavingsTotals()

        return {
          id: account.student.id,
          name: account.student.name,
          nisn: account.student.nisn,
          status: account.student.status,
          accountId: account.id,
          isLocked: account.isLocked,
          balance: totals.balance,
          totalDeposits: totals.totalDeposits,
          totalWithdrawals: totals.totalWithdrawals,
          lastTransactionAt: lastTransactionByStudent.get(account.student.id) ?? null,
        }
      })
      .sort((left, right) => left.name.localeCompare(right.name, 'id-ID'))

    const totals = students.reduce(
      (summary, student) => ({
        balance: summary.balance + student.balance,
        totalDeposits: summary.totalDeposits + student.totalDeposits,
        totalWithdrawals: summary.totalWithdrawals + student.totalWithdrawals,
        lockedAccounts: summary.lockedAccounts + (student.isLocked ? 1 : 0),
      }),
      { balance: 0, totalDeposits: 0, totalWithdrawals: 0, lockedAccounts: 0 }
    )

    return NextResponse.json({
      class: classData,
      totals: {
        ...totals,
        totalStudents: students.length,
      },
      students,
      recentTransactions,
      withdrawalRequests,
    })
  } catch (error) {
    console.error('Get savings error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
