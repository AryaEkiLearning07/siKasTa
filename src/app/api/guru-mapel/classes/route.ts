import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { errorResponse } from '@/core/http/errors'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu' }, { status: 401 })
    }

    const assignments = await prisma.teachingAssignment.findMany({
      where: {
        teacherId: user.id,
        isActive: true,
      },
      select: {
        id: true,
        tahunAjaran: true,
        class: {
          select: {
            id: true,
            name: true,
            tingkat: true,
            tahunAjaran: true,
            _count: {
              select: { students: true },
            },
          },
        },
        subject: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { class: { tingkat: 'asc' } },
        { class: { name: 'asc' } },
        { subject: { name: 'asc' } },
      ],
    })

    return NextResponse.json(
      { assignments },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    return errorResponse(error, 'List teacher assignments error:')
  }
}
