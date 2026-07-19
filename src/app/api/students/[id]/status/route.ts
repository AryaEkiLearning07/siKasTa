import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createAuditLog, getRequestAuditFields } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { updateStudentStatusSchema } from '@/lib/validations'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu' }, { status: 401 })
    }

    if (user.role !== 'WALI_KELAS') {
      return NextResponse.json(
        { error: 'Hanya wali kelas yang dapat mengubah status siswa' },
        { status: 403 }
      )
    }

    const { id } = await params

    const student = await prisma.student.findUnique({
      where: { id },
      include: { class: true },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Siswa tidak ditemukan' },
        { status: 404 }
      )
    }

    if (user.classId !== student.classId) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses ke siswa ini' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = updateStudentStatusSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data tidak valid', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { status, statusReason } = parsed.data

    const nextStatusReason = status === 'BEBAS_KAS' ? statusReason || null : null
    const updatedStudent = await prisma.$transaction(async (tx) => {
      const updated = await tx.student.update({
        where: { id },
        data: {
          status,
          statusReason: nextStatusReason,
          statusSetById: user.id,
          statusSetAt: new Date(),
        },
      })

      await createAuditLog(tx, {
        eventType: 'MANAJEMEN',
        eventAction: 'student_status_updated',
        status: 'SUCCESS',
        severity: status === 'PINDAH' ? 'HIGH' : 'MEDIUM',
        actorId: user.id,
        actorRole: user.role,
        entityType: 'Student',
        entityId: id,
        classId: student.classId,
        ...getRequestAuditFields(request),
        metadata: {
          targetName: student.name,
          className: student.class.name,
        },
        oldValue: {
          status: student.status,
          statusReason: student.statusReason,
        },
        newValue: {
          status: updated.status,
          statusReason: updated.statusReason,
        },
      })

      return updated
    })

    return NextResponse.json({ student: updatedStudent })
  } catch (error) {
    console.error('Update student status error:', error)
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
    if (!user) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu' }, { status: 401 })
    }

    if (user.role !== 'WALI_KELAS') {
      return NextResponse.json(
        { error: 'Hanya wali kelas yang dapat menghapus siswa' },
        { status: 403 }
      )
    }

    const { id } = await params

    const student = await prisma.student.findUnique({
      where: { id },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Siswa tidak ditemukan' },
        { status: 404 }
      )
    }

    if (user.classId !== student.classId) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses ke siswa ini' },
        { status: 403 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.student.delete({ where: { id } })

      await createAuditLog(tx, {
        eventType: 'MANAJEMEN',
        eventAction: 'student_deleted',
        status: 'SUCCESS',
        severity: 'HIGH',
        actorId: user.id,
        actorRole: user.role,
        entityType: 'Student',
        entityId: id,
        classId: student.classId,
        ...getRequestAuditFields(request),
        metadata: {
          targetName: student.name,
        },
        oldValue: {
          name: student.name,
          status: student.status,
          statusReason: student.statusReason,
        },
        newValue: {
          status: 'DELETED',
        },
      })
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete student error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
