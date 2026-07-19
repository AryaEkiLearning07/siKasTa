import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { user: null },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
          classId: user.classId,
          teachingAssignments: user.teachingAssignments,
          homeroomAssignments: user.homeroomAssignments,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
