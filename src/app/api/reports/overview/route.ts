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
    return NextResponse.json(await getMonthlyClassReport(yearNum, monthNum))
  } catch (error) {
    console.error('Overview error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
