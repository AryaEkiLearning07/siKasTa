import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getMonthlyClassReport } from '@/lib/reports'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'KEPALA_SEKOLAH')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    if (!year || !month) {
      return NextResponse.json(
        { error: 'Parameter year dan month wajib diisi' },
        { status: 400 }
      )
    }

    const yearNum = parseInt(year)
    const monthNum = parseInt(month)
    const headers = [
      'Kelas',
      'Tingkat',
      'Wali Kelas',
      'Total Siswa',
      'Bebas Kas',
      'Kas Nominal',
      'Pemasukan',
      'Pengeluaran',
      'Saldo',
      'Persen Lunas',
    ]

    const report = await getMonthlyClassReport(yearNum, monthNum)
    const rows = report.classes.map((cls) => [
      cls.className,
      cls.tingkat,
      cls.waliKelas || '-',
      cls.totalSiswa.toString(),
      cls.bebasKas.toString(),
      cls.kasNominal.toString(),
      cls.pemasukan.toString(),
      cls.pengeluaran.toString(),
      cls.saldo.toString(),
      `${cls.persenLunas ?? 0}%`,
    ])

    rows.push([
      'TOTAL',
      '',
      '',
      '',
      '',
      '',
      report.totals.pemasukan.toString(),
      report.totals.pengeluaran.toString(),
      report.totals.saldo.toString(),
      '',
    ])

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ]

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="laporan-kas-${year}-${monthNames[monthNum - 1]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
