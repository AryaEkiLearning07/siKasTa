import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createAuditLog, getRequestAuditFields } from '@/lib/audit'
import { hashPassword } from '@/lib/password'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createUserSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  username: z.string().min(3, 'Username minimal 3 karakter').regex(/^[a-zA-Z0-9._-]+$/, 'Username hanya boleh berisi huruf, angka, titik, garis bawah, atau strip'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  role: z.enum(['WALI_KELAS', 'BENDAHARA']),
  classId: z.string().min(1, 'Kelas wajib dipilih'),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu' }, { status: 401 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'WALI_KELAS') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createUserSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data tidak valid', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { name, password, role, classId } = parsed.data
    const username = parsed.data.username.trim().toLowerCase()

    if (user.role === 'ADMIN' && role !== 'WALI_KELAS') {
      return NextResponse.json(
        { error: 'Admin hanya dapat membuat akun wali kelas' },
        { status: 403 }
      )
    }

    if (user.role === 'WALI_KELAS' && role !== 'BENDAHARA') {
      return NextResponse.json(
        { error: 'Wali kelas hanya dapat membuat akun bendahara' },
        { status: 403 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { username },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username sudah digunakan' },
        { status: 409 }
      )
    }

    const selectedClass = await prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, name: true, tingkat: true, tahunAjaran: true },
    })

    if (!selectedClass) {
      return NextResponse.json(
        { error: 'Kelas tidak ditemukan' },
        { status: 404 }
      )
    }

    if (role === 'WALI_KELAS') {
      const existingWali = await prisma.user.findFirst({
        where: { classId, role: 'WALI_KELAS' },
      })
      if (existingWali) {
        return NextResponse.json(
          { error: 'Kelas ini sudah memiliki Wali Kelas' },
          { status: 409 }
        )
      }
    }

    if (role === 'BENDAHARA') {
      const existingBendahara = await prisma.user.findFirst({
        where: { classId, role: 'BENDAHARA' },
      })
      if (existingBendahara) {
        return NextResponse.json(
          { error: 'Kelas ini sudah memiliki Bendahara' },
          { status: 409 }
        )
      }
    }

    if (user.role === 'WALI_KELAS' && user.classId !== classId) {
      return NextResponse.json(
        { error: 'Anda hanya bisa membuat akun untuk kelas Anda sendiri' },
        { status: 403 }
      )
    }

    const passwordHash = await hashPassword(password)

    const newUser = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name,
          username,
          passwordHash,
          role,
          classId,
        },
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          classId: true,
          class: {
            select: { id: true, name: true },
          },
        },
      })

      await createAuditLog(tx, {
        eventType: 'MANAJEMEN',
        eventAction: 'user_created',
        status: 'SUCCESS',
        severity: 'LOW',
        actorId: user.id,
        actorRole: user.role,
        entityType: 'User',
        entityId: createdUser.id,
        classId,
        ...getRequestAuditFields(request),
        metadata: {
          targetName: createdUser.name,
          targetUsername: createdUser.username,
          targetRole: createdUser.role,
          className: selectedClass.name,
          tingkat: selectedClass.tingkat,
          tahunAjaran: selectedClass.tahunAjaran,
        },
        newValue: {
          name: createdUser.name,
          username: createdUser.username,
          role: createdUser.role,
          classId,
          className: selectedClass.name,
        },
      })

      return createdUser
    })

    return NextResponse.json({ user: newUser }, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu' }, { status: 401 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'WALI_KELAS') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    if (!userId) {
      return NextResponse.json({ error: 'ID user wajib diisi' }, { status: 400 })
    }

    // Cannot delete self
    if (userId === user.id) {
      return NextResponse.json({ error: 'Tidak dapat menghapus akun sendiri' }, { status: 400 })
    }

    // Get target user
    const targetUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!targetUser) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }

    if (targetUser.role === 'ADMIN' || targetUser.role === 'KEPALA_SEKOLAH') {
      return NextResponse.json({ error: 'Tidak dapat menghapus role ini' }, { status: 403 })
    }

    if (user.role === 'WALI_KELAS' && user.classId !== targetUser.classId) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    if (user.role === 'WALI_KELAS' && targetUser.role !== 'BENDAHARA') {
      return NextResponse.json({ error: 'Wali kelas hanya dapat menghapus akun bendahara' }, { status: 403 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.session.deleteMany({ where: { userId } })

      await tx.user.update({
        where: { id: userId },
        data: { classId: null },
      })

      await createAuditLog(tx, {
        eventType: 'MANAJEMEN',
        eventAction: 'user_access_removed',
        status: 'SUCCESS',
        severity: 'MEDIUM',
        actorId: user.id,
        actorRole: user.role,
        entityType: 'User',
        entityId: targetUser.id,
        classId: targetUser.classId,
        ...getRequestAuditFields(request),
        metadata: {
          targetName: targetUser.name,
          targetUsername: targetUser.username,
          targetRole: targetUser.role,
        },
        oldValue: {
          name: targetUser.name,
          username: targetUser.username,
          role: targetUser.role,
          classId: targetUser.classId,
        },
        newValue: {
          name: targetUser.name,
          username: targetUser.username,
          role: targetUser.role,
          classId: null,
        },
      })
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
