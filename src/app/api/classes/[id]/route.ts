import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createAuditLog, getRequestAuditFields } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { requireClassAccess } from '@/lib/authorize'
import { updateClassSchema } from '@/lib/validations'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireClassAccess((await params).id)

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
        { error: 'Hanya wali kelas yang dapat mengubah konfigurasi kelas' },
        { status: 403 }
      )
    }

    const { id } = await params

    if (user.classId !== id) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses ke kelas ini' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = updateClassSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data tidak valid', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { kasNominal } = parsed.data

    const existingClass = await prisma.class.findUnique({
      where: { id },
      select: { id: true, name: true, tingkat: true, tahunAjaran: true, kasNominal: true },
    })

    if (!existingClass) {
      return NextResponse.json(
        { error: 'Kelas tidak ditemukan' },
        { status: 404 }
      )
    }

    const updatedClass = await prisma.$transaction(async (tx) => {
      const updated = await tx.class.update({
        where: { id },
        data: { kasNominal },
        include: {
          members: {
            select: { id: true, name: true, username: true, role: true },
          },
          _count: {
            select: { students: true },
          },
        },
      })

      await createAuditLog(tx, {
        eventType: 'MANAJEMEN',
        eventAction: 'class_cash_nominal_updated',
        status: 'SUCCESS',
        severity: 'MEDIUM',
        actorId: user.id,
        actorRole: user.role,
        entityType: 'Class',
        entityId: id,
        classId: id,
        ...getRequestAuditFields(request),
        metadata: {
          className: existingClass.name,
          tingkat: existingClass.tingkat,
          tahunAjaran: existingClass.tahunAjaran,
        },
        oldValue: {
          kasNominal: existingClass.kasNominal,
        },
        newValue: {
          kasNominal,
        },
      })

      return updated
    })

    return NextResponse.json({ class: updatedClass })
  } catch (error) {
    console.error('Update class error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
