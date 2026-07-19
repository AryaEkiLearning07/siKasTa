import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    const { id } = await params

    if (!user) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu' }, { status: 401 })
    }

    if (user.role !== 'WALI_KELAS' || user.classId !== id) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const accounts = await prisma.user.findMany({
      where: {
        classId: id,
        role: { in: ['WALI_KELAS', 'BENDAHARA'] },
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    })

    const roleOrder = { WALI_KELAS: 0, BENDAHARA: 1 } as Record<string, number>
    const sortedAccounts = accounts.sort((left, right) => roleOrder[left.role] - roleOrder[right.role])

    return NextResponse.json({ accounts: sortedAccounts })
  } catch (error) {
    console.error('List class accounts error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
