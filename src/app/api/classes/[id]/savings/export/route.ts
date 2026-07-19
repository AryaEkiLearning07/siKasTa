import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { prisma } from '@/lib/prisma'
import { requireClassAccess } from '@/lib/authorize'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const monthLabelFormatter = new Intl.DateTimeFormat('id-ID', {
  month: 'long',
  year: 'numeric',
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireClassAccess(id)

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') || currentMonthValue()
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'Bulan tidak valid' }, { status: 400 })
    }

    const { start, end, label } = getMonthRange(month)
    const classData = await prisma.class.findUnique({
      where: { id },
      select: { id: true, name: true, tingkat: true, tahunAjaran: true },
    })

    if (!classData) {
      return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 })
    }

    const accounts = await prisma.savingsAccount.findMany({
      where: { classId: id },
      select: {
        id: true,
        student: {
          select: {
            id: true,
            name: true,
            nis: true,
            nisn: true,
            status: true,
          },
        },
      },
      orderBy: { student: { name: 'asc' } },
    })
    const accountIds = accounts.map((account) => account.id)

    const [beforeTotals, monthlyTotals] = await Promise.all([
      prisma.savingsTransaction.groupBy({
        by: ['studentId', 'type'],
        where: {
          accountId: { in: accountIds },
          transactionDate: { lt: start },
        },
        _sum: { amount: true },
      }),
      prisma.savingsTransaction.groupBy({
        by: ['studentId', 'type'],
        where: {
          accountId: { in: accountIds },
          transactionDate: { gte: start, lt: end },
        },
        _sum: { amount: true },
      }),
    ])

    const beforeByStudent = toTotalsByStudent(beforeTotals)
    const monthByStudent = toTotalsByStudent(monthlyTotals)
    const rows = accounts.map((account, index) => {
      const opening = beforeByStudent.get(account.student.id) || emptyTotals()
      const current = monthByStudent.get(account.student.id) || emptyTotals()
      const openingBalance = opening.deposits - opening.withdrawals
      const endingBalance = openingBalance + current.deposits - current.withdrawals

      return {
        no: index + 1,
        name: account.student.name,
        nisn: account.student.nisn || account.student.nis || '',
        status: formatStudentStatus(account.student.status),
        openingBalance,
        deposits: current.deposits,
        withdrawals: current.withdrawals,
        endingBalance,
      }
    })
    const totals = rows.reduce(
      (summary, row) => ({
        openingBalance: summary.openingBalance + row.openingBalance,
        deposits: summary.deposits + row.deposits,
        withdrawals: summary.withdrawals + row.withdrawals,
        endingBalance: summary.endingBalance + row.endingBalance,
      }),
      { openingBalance: 0, deposits: 0, withdrawals: 0, endingBalance: 0 }
    )

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['REKAP TABUNGAN SISWA'],
      [`Kelas ${classData.name} - Tahun Ajaran ${classData.tahunAjaran}`],
      [`Periode ${label}`],
      [],
      ['No', 'NISN', 'Nama Siswa', 'Status', 'Saldo Awal', 'Setoran', 'Penarikan', 'Saldo Akhir', 'Keterangan'],
      ...rows.map((row) => [
        row.no,
        row.nisn,
        row.name,
        row.status,
        row.openingBalance,
        row.deposits,
        row.withdrawals,
        row.endingBalance,
        '',
      ]),
      [],
      ['', '', '', 'TOTAL', totals.openingBalance, totals.deposits, totals.withdrawals, totals.endingBalance, ''],
      [],
      ['Catatan', 'Saldo akhir = saldo awal + setoran - penarikan'],
    ])

    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 15 },
      { wch: 34 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
    ]
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } },
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Tabungan')
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer
    const fileName = `rekap-tabungan-${slugify(classData.name)}-${month}.xlsx`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Export savings recap error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

function emptyTotals() {
  return { deposits: 0, withdrawals: 0 }
}

function toTotalsByStudent(totals: { studentId: string; type: 'DEPOSIT' | 'WITHDRAWAL'; _sum: { amount: number | null } }[]) {
  const byStudent = new Map<string, ReturnType<typeof emptyTotals>>()

  totals.forEach((total) => {
    const current = byStudent.get(total.studentId) || emptyTotals()
    if (total.type === 'DEPOSIT') {
      current.deposits += total._sum.amount || 0
    } else {
      current.withdrawals += total._sum.amount || 0
    }
    byStudent.set(total.studentId, current)
  })

  return byStudent
}

function getMonthRange(value: string) {
  const [year, month] = value.split('-').map(Number)
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)
  const label = monthLabelFormatter.format(start)
  return { start, end, label }
}

function currentMonthValue() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatStudentStatus(value: string) {
  if (value === 'BEBAS_KAS') return 'Bebas Kas'
  if (value === 'PINDAH') return 'Pindah'
  return 'Aktif'
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'kelas'
}
