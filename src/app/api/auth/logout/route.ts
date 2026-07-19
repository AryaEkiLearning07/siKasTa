import { NextRequest, NextResponse } from 'next/server'
import { deleteSession, getCurrentUser } from '@/lib/auth'
import { createAuditLog, getRequestAuditFields } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (user) {
      await createAuditLog(prisma, {
        eventType: 'AUTH',
        eventAction: 'logout',
        status: 'SUCCESS',
        severity: 'LOW',
        actorId: user.id,
        actorRole: user.role,
        entityType: 'User',
        entityId: user.id,
        classId: user.classId,
        ...getRequestAuditFields(request),
      })
    }

    await deleteSession()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
