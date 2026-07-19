import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { createAuditLog, getRequestAuditFields } from '@/lib/audit'
import { hashPassword } from '@/lib/password'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const updateAccountSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter'),
  username: z.string().trim().min(3, 'Username minimal 3 karakter').regex(/^[a-zA-Z0-9._-]+$/, 'Username hanya boleh berisi huruf, angka, titik, garis bawah, atau strip'),
  password: z.string().min(6, 'Password minimal 6 karakter').optional().or(z.literal('')),
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
    const parsed = updateAccountSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data tidak valid', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const username = parsed.data.username.toLowerCase()
    const targetUser = await prisma.user.findFirst({
      where: {
        id: userId,
        classId: id,
        role: 'BENDAHARA',
      },
      select: { id: true, name: true, username: true, role: true },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Akun bendahara tidak ditemukan' }, { status: 404 })
    }

    const usernameOwner = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    })

    if (usernameOwner && usernameOwner.id !== userId) {
      return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 409 })
    }

    const passwordHash = parsed.data.password ? await hashPassword(parsed.data.password) : null
    const updatedUser = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          name: parsed.data.name,
          username,
          ...(passwordHash ? { passwordHash } : {}),
        },
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
        },
      })

      if (passwordHash || username !== targetUser.username) {
        await tx.session.deleteMany({ where: { userId } })
      }

      await createAuditLog(tx, {
        eventType: 'MANAJEMEN',
        eventAction: 'class_account_updated',
        status: 'SUCCESS',
        severity: passwordHash ? 'HIGH' : 'MEDIUM',
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
          name: targetUser.name,
          username: targetUser.username,
          credentialState: passwordHash ? 'previous_password_active' : undefined,
        },
        newValue: {
          name: updated.name,
          username: updated.username,
          credentialState: passwordHash ? 'password_replaced' : undefined,
          sessionsRevoked: Boolean(passwordHash || username !== targetUser.username),
        },
      })

      return updated
    })

    return NextResponse.json({ account: updatedUser })
  } catch (error) {
    console.error('Update class account error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
