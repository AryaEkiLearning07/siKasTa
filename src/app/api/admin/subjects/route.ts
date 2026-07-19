import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureDefaultSubjects } from '@/lib/subjects'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    await ensureDefaultSubjects()

    const subjects = await prisma.subject.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(
      { subjects },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('List subjects error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
