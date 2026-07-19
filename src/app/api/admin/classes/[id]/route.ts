import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createAuditLog, getRequestAuditFields } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'KEPALA_SEKOLAH')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { id } = await params

    const classData = await prisma.class.findUnique({
      where: { id },
      include: {
        members: {
          select: { id: true, name: true, username: true, role: true },
        },
        _count: {
          select: { students: true },
        },
      },
    })

    if (!classData) {
      return NextResponse.json(
        { error: 'Kelas tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({ class: classData })
  } catch (error) {
    console.error('Get class error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { id } = await params

    const classData = await prisma.class.findUnique({
      where: { id },
      include: {
        members: true,
        students: true,
      },
    })

    if (!classData) {
      return NextResponse.json(
        { error: 'Kelas tidak ditemukan' },
        { status: 404 }
      )
    }

    await prisma.$transaction(async (tx) => {
      for (const member of classData.members) {
        await tx.session.deleteMany({ where: { userId: member.id } })
      }

      const classSnapshot = {
        name: classData.name,
        tingkat: classData.tingkat,
        tahunAjaran: classData.tahunAjaran,
        status: classData.status,
        studentsCount: classData.students.length,
        members: classData.members.map((member) => ({
          id: member.id,
          name: member.name,
          username: member.username,
          role: member.role,
        })),
      }

      await createAuditLog(tx, {
        eventType: 'MANAJEMEN',
        eventAction: 'class_deleted',
        status: 'SUCCESS',
        severity: 'HIGH',
        actorId: user.id,
        actorRole: user.role,
        entityType: 'Class',
        entityId: id,
        classId: id,
        ...getRequestAuditFields(request),
        metadata: classSnapshot,
        oldValue: classSnapshot,
        newValue: {
          name: classData.name,
          status: 'DELETED',
        },
      })

      await tx.class.delete({ where: { id } })
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete class error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
