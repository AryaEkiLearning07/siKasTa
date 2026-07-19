import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createAuditLog, getRequestAuditFields } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { updateStudentSchema } from '@/lib/validations'

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
        { error: 'Hanya wali kelas yang dapat mengubah data siswa' },
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

    const body = await request.json()
    const parsed = updateStudentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data tidak valid', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { name, nisn, gender } = parsed.data

    const updatedStudent = await prisma.$transaction(async (tx) => {
      const updated = await tx.student.update({
        where: { id },
        data: {
          name: name.trim(),
          nisn: nisn?.trim() || null,
          gender: gender || null,
        },
      })

      await createAuditLog(tx, {
        eventType: 'MANAJEMEN',
        eventAction: 'student_updated',
        status: 'SUCCESS',
        severity: 'LOW',
        actorId: user.id,
        actorRole: user.role,
        entityType: 'Student',
        entityId: id,
        classId: student.classId,
        ...getRequestAuditFields(request),
        metadata: {
          targetName: updated.name,
          nisn: updated.nisn,
          gender: updated.gender,
        },
        oldValue: {
          name: student.name,
          nisn: student.nisn,
          gender: student.gender,
        },
        newValue: {
          name: updated.name,
          nisn: updated.nisn,
          gender: updated.gender,
        },
      })

      return updated
    })

    return NextResponse.json({ student: updatedStudent })
  } catch (error) {
    console.error('Update student error:', error)
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
          nisn: student.nisn,
          gender: student.gender,
        },
        oldValue: {
          name: student.name,
          nisn: student.nisn,
          gender: student.gender,
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
