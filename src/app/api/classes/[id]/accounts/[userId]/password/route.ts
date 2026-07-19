import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { createAuditLog, getRequestAuditFields } from '@/lib/audit'
import { hashPassword } from '@/lib/password'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const updatePasswordSchema = z.object({
  password: z.string().min(6, 'Password minimal 6 karakter'),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const user = await getCurrentUser()
    const { id, userId } = await params

    if (!user) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu' }, { status: 401 })
    }

    if (user.role !== 'WALI_KELAS' || user.classId !== id) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = updatePasswordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data tidak valid', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        id: userId,
        classId: id,
        role: { in: ['WALI_KELAS', 'BENDAHARA'] },
      },
      select: { id: true, name: true, username: true, role: true },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 })
    }

    const passwordHash = await hashPassword(parsed.data.password)

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash },
      })

      await tx.session.deleteMany({
        where: {
          userId,
          ...(userId === user.id ? { id: { not: request.cookies.get('spensakas_session')?.value || '' } } : {}),
        },
      })

      await createAuditLog(tx, {
        eventType: 'MANAJEMEN',
        eventAction: 'class_account_password_updated',
        status: 'SUCCESS',
        severity: 'HIGH',
        actorId: user.id,
        actorRole: user.role,
        entityType: 'User',
        entityId: targetUser.id,
        classId: id,
        ...getRequestAuditFields(request),
        metadata: {
          targetName: targetUser.name,
          targetUsername: targetUser.username,
          targetRole: targetUser.role,
        },
        oldValue: {
          credentialState: 'previous_password_active',
        },
        newValue: {
          credentialState: 'password_replaced',
          otherSessionsRevoked: true,
        },
      })
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Update class account password error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
