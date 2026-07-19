import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createAuditLog, getRequestAuditFields } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { id } = await params // classId

    // Find the wali kelas for this class
    const waliKelas = await prisma.user.findFirst({
      where: { classId: id, role: 'WALI_KELAS' },
    })

    if (!waliKelas) {
      return NextResponse.json(
        { error: 'Kelas ini belum memiliki wali kelas' },
        { status: 404 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.session.deleteMany({ where: { userId: waliKelas.id } })

      await tx.user.update({
        where: { id: waliKelas.id },
        data: { classId: null },
      })

      await createAuditLog(tx, {
        eventType: 'MANAJEMEN',
        eventAction: 'wali_kelas_unassigned',
        status: 'SUCCESS',
        severity: 'MEDIUM',
        actorId: user.id,
        actorRole: user.role,
        entityType: 'User',
        entityId: waliKelas.id,
        classId: id,
        ...getRequestAuditFields(request),
        metadata: {
          targetName: waliKelas.name,
          targetUsername: waliKelas.username,
          targetRole: waliKelas.role,
        },
        oldValue: {
          classId: waliKelas.classId,
        },
        newValue: {
          classId: null,
        },
      })
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Remove wali kelas error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
