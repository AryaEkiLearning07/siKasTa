import { prisma } from './prisma'

export type MonthlyClassReportRow = {
  classId: string
  className: string
  tingkat: string
  waliKelas: string | null
  bendahara: string | null
  totalSiswa: number
  bebasKas: number
  aktifCount: number
  paidCount: number
  kasNominal: number
  pemasukan: number
  pengeluaran: number
  saldo: number
  persenLunas: number | null
}

export type MonthlyClassReport = {
  year: number
  month: number
  classes: MonthlyClassReportRow[]
  totals: {
    totalSiswa: number
    bebasKas: number
    aktifCount: number
    paidCount: number
    pemasukan: number
    pengeluaran: number
    saldo: number
    persenLunas: number | null
  }
}

function getMonthRange(year: number, month: number) {
  return {
    startDate: new Date(year, month - 1, 1),
    endDate: new Date(year, month, 1),
  }
}

export async function getMonthlyClassReport(year: number, month: number): Promise<MonthlyClassReport> {
  const { startDate, endDate } = getMonthRange(year, month)

  const classes = await prisma.class.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      tingkat: true,
      kasNominal: true,
      members: {
        select: { name: true, role: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  const classIds = classes.map((cls) => cls.id)

  if (classIds.length === 0) {
    return {
      year,
      month,
      classes: [],
      totals: {
        totalSiswa: 0,
        bebasKas: 0,
        aktifCount: 0,
        paidCount: 0,
        pemasukan: 0,
        pengeluaran: 0,
        saldo: 0,
        persenLunas: null,
      },
    }
  }

  const [studentCounts, paidPayments, expenseTotals] = await Promise.all([
    prisma.student.groupBy({
      by: ['classId', 'status'],
      where: { classId: { in: classIds } },
      _count: { _all: true },
    }),
    prisma.payment.findMany({
      where: {
        year,
        month,
        isPaid: true,
        OR: [
          { classId: { in: classIds } },
          { classId: null, student: { classId: { in: classIds } } },
        ],
        student: {
          status: 'AKTIF',
        },
      },
      select: {
        classId: true,
        amount: true,
        student: {
          select: { classId: true },
        },
      },
    }),
    prisma.expense.groupBy({
      by: ['classId'],
      where: {
        classId: { in: classIds },
        spentAt: { gte: startDate, lt: endDate },
      },
      _sum: { amount: true },
    }),
  ])

  const countsByClass = new Map<string, { totalSiswa: number; bebasKas: number; aktifCount: number }>()
  for (const count of studentCounts) {
    const current = countsByClass.get(count.classId) || { totalSiswa: 0, bebasKas: 0, aktifCount: 0 }
    current.totalSiswa += count._count._all
    if (count.status === 'BEBAS_KAS') current.bebasKas += count._count._all
    if (count.status === 'AKTIF') current.aktifCount += count._count._all
    countsByClass.set(count.classId, current)
  }

  const paymentsByClass = new Map<string, { paidCount: number; pemasukan: number }>()
  for (const payment of paidPayments) {
    const classId = payment.classId || payment.student.classId
    const current = paymentsByClass.get(classId) || { paidCount: 0, pemasukan: 0 }
    current.paidCount += 1
    current.pemasukan += payment.amount
    paymentsByClass.set(classId, current)
  }

  const expensesByClass = new Map(
    expenseTotals.map((expense) => [expense.classId, expense._sum.amount || 0])
  )

  const rows = classes.map((cls) => {
    const counts = countsByClass.get(cls.id) || { totalSiswa: 0, bebasKas: 0, aktifCount: 0 }
    const payments = paymentsByClass.get(cls.id) || { paidCount: 0, pemasukan: 0 }
    const pengeluaran = expensesByClass.get(cls.id) || 0
    const waliKelas = cls.members.find((member) => member.role === 'WALI_KELAS')?.name || null
    const bendahara = cls.members.find((member) => member.role === 'BENDAHARA')?.name || null

    return {
      classId: cls.id,
      className: cls.name,
      tingkat: cls.tingkat,
      waliKelas,
      bendahara,
      totalSiswa: counts.totalSiswa,
      bebasKas: counts.bebasKas,
      aktifCount: counts.aktifCount,
      paidCount: payments.paidCount,
      kasNominal: cls.kasNominal,
      pemasukan: payments.pemasukan,
      pengeluaran,
      saldo: payments.pemasukan - pengeluaran,
      persenLunas: counts.aktifCount > 0 ? Math.round((payments.paidCount / counts.aktifCount) * 100) : null,
    }
  })

  const totals = rows.reduce(
    (acc, row) => ({
      totalSiswa: acc.totalSiswa + row.totalSiswa,
      bebasKas: acc.bebasKas + row.bebasKas,
      aktifCount: acc.aktifCount + row.aktifCount,
      paidCount: acc.paidCount + row.paidCount,
      pemasukan: acc.pemasukan + row.pemasukan,
      pengeluaran: acc.pengeluaran + row.pengeluaran,
    }),
    { totalSiswa: 0, bebasKas: 0, aktifCount: 0, paidCount: 0, pemasukan: 0, pengeluaran: 0 }
  )

  return {
    year,
    month,
    classes: rows,
    totals: {
      ...totals,
      saldo: totals.pemasukan - totals.pengeluaran,
      persenLunas: totals.aktifCount > 0 ? Math.round((totals.paidCount / totals.aktifCount) * 100) : null,
    },
  }
}
