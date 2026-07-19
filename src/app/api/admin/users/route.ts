import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createAuditLog, getRequestAuditFields } from '@/lib/audit'
import { hashPassword } from '@/lib/password'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const teachingAssignmentSchema = z.object({
  classId: z.string().min(1, 'Kelas wajib dipilih'),
  subjectId: z.string().min(1, 'Mapel wajib dipilih'),
})

const createUserSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  username: z.string().min(3, 'Username minimal 3 karakter').regex(/^[a-zA-Z0-9._-]+$/, 'Username hanya boleh berisi huruf, angka, titik, garis bawah, atau strip'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  role: z.enum(['GURU', 'WALI_KELAS']),
  classId: z.string().optional().nullable(),
  homeroomClassId: z.string().optional().nullable(),
  teachingAssignments: z.array(teachingAssignmentSchema).optional().default([]),
}).superRefine((data, ctx) => {
  const homeroomClassId = data.homeroomClassId || (data.role === 'WALI_KELAS' ? data.classId : null)

  if (data.role === 'WALI_KELAS' && !homeroomClassId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Kelas wali wajib dipilih',
      path: ['homeroomClassId'],
    })
  }

  if (data.role === 'GURU' && data.teachingAssignments.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Minimal satu mapel dan kelas ajar wajib diisi',
      path: ['teachingAssignments'],
    })
  }
})

const updateUserSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  username: z.string().min(3, 'Username minimal 3 karakter').regex(/^[a-zA-Z0-9._-]+$/, 'Username hanya boleh berisi huruf, angka, titik, garis bawah, atau strip'),
  password: z.string().optional().default(''),
  role: z.enum(['GURU', 'WALI_KELAS', 'BENDAHARA']),
  classId: z.string().optional().nullable(),
  homeroomClassId: z.string().optional().nullable(),
  teachingAssignments: z.array(teachingAssignmentSchema).optional().default([]),
}).superRefine((data, ctx) => {
  const homeroomClassId = data.homeroomClassId || (data.role === 'WALI_KELAS' ? data.classId : null)

  if (data.password && data.password.length < 6) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Password minimal 6 karakter',
      path: ['password'],
    })
  }

  if (data.role === 'WALI_KELAS' && !homeroomClassId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Kelas wali wajib dipilih',
      path: ['homeroomClassId'],
    })
  }

  if (data.role === 'GURU' && data.teachingAssignments.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Minimal satu mapel dan kelas ajar wajib diisi',
      path: ['teachingAssignments'],
    })
  }

  if (data.role === 'BENDAHARA' && !data.classId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Kelas wajib dipilih',
      path: ['classId'],
    })
  }
})

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')

    const users = await prisma.user.findMany({
      where: role ? { role: role as any } : undefined,
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        classId: true,
        class: {
          select: { id: true, name: true },
        },
        teachingAssignments: {
          where: { isActive: true },
          select: {
            id: true,
            classId: true,
            subjectId: true,
            class: { select: { id: true, name: true, tingkat: true, tahunAjaran: true } },
            subject: { select: { id: true, name: true } },
          },
          orderBy: [{ class: { tingkat: 'asc' } }, { class: { name: 'asc' } }, { subject: { name: 'asc' } }],
        },
        homeroomAssignments: {
          where: { isActive: true },
          select: {
            id: true,
            classId: true,
            class: { select: { id: true, name: true, tingkat: true, tahunAjaran: true } },
          },
          orderBy: [{ class: { tingkat: 'asc' } }, { class: { name: 'asc' } }],
        },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(
      { users },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('List users error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
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

    const { password, role } = parsed.data
    const name = parsed.data.name.trim()
    const username = parsed.data.username.trim().toLowerCase()
    const homeroomClassId = parsed.data.homeroomClassId || (role === 'WALI_KELAS' ? parsed.data.classId : null)
    const finalRole = homeroomClassId ? 'WALI_KELAS' : role
    const finalClassId = homeroomClassId || null
    const teachingAssignments = dedupeTeachingAssignments(parsed.data.teachingAssignments)

    const existingUser = await prisma.user.findUnique({
      where: { username },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username sudah digunakan' },
        { status: 409 }
      )
    }

    const classIds = Array.from(new Set([
      ...teachingAssignments.map((assignment) => assignment.classId),
      ...(finalClassId ? [finalClassId] : []),
    ]))

    const selectedClasses = await prisma.class.findMany({
      where: { id: { in: classIds }, status: 'ACTIVE' },
      select: { id: true, name: true, tingkat: true, tahunAjaran: true },
    })
    const classById = new Map(selectedClasses.map((classItem) => [classItem.id, classItem]))

    if (selectedClasses.length !== classIds.length) {
      return NextResponse.json(
        { error: 'Salah satu kelas tidak ditemukan atau tidak aktif' },
        { status: 404 }
      )
    }

    const subjectIds = Array.from(new Set(teachingAssignments.map((assignment) => assignment.subjectId)))
    const selectedSubjects = subjectIds.length > 0
      ? await prisma.subject.findMany({
          where: { id: { in: subjectIds } },
          select: { id: true, name: true },
        })
      : []
    const subjectById = new Map(selectedSubjects.map((subject) => [subject.id, subject]))

    if (selectedSubjects.length !== subjectIds.length) {
      return NextResponse.json(
        { error: 'Salah satu mata pelajaran tidak ditemukan' },
        { status: 404 }
      )
    }

    if (finalClassId) {
      const homeroomClass = classById.get(finalClassId)
      const existingWali = await prisma.user.findFirst({
        where: { classId: finalClassId, role: 'WALI_KELAS' },
      })
      const existingActiveHomeroomAssignment = homeroomClass
        ? await prisma.homeroomAssignment.findFirst({
            where: {
              classId: finalClassId,
              tahunAjaran: homeroomClass.tahunAjaran,
              isActive: true,
            },
          })
        : null

      if (existingWali) {
        return NextResponse.json(
          { error: 'Kelas ini sudah memiliki Wali Kelas' },
          { status: 409 }
        )
      }

      if (existingActiveHomeroomAssignment) {
        return NextResponse.json(
          { error: 'Kelas ini sudah memiliki assignment wali kelas aktif' },
          { status: 409 }
        )
      }
    }

    const passwordHash = await hashPassword(password)

    const newUser = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name,
          username,
          passwordHash,
          role: finalRole,
          classId: finalClassId,
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

      if (finalClassId) {
        const homeroomClass = classById.get(finalClassId)
        if (homeroomClass) {
          await tx.homeroomAssignment.upsert({
            where: {
              classId_tahunAjaran: {
                classId: finalClassId,
                tahunAjaran: homeroomClass.tahunAjaran,
              },
            },
            create: {
              teacherId: createdUser.id,
              classId: finalClassId,
              tahunAjaran: homeroomClass.tahunAjaran,
            },
            update: {
              teacherId: createdUser.id,
              isActive: true,
            },
          })
        }
      }

      if (teachingAssignments.length > 0) {
        await tx.teachingAssignment.createMany({
          data: teachingAssignments.map((assignment) => {
            const selectedClass = classById.get(assignment.classId)
            return {
              teacherId: createdUser.id,
              classId: assignment.classId,
              subjectId: assignment.subjectId,
              tahunAjaran: selectedClass?.tahunAjaran || '',
            }
          }),
          skipDuplicates: true,
        })
      }

      await createAuditLog(tx, {
        eventType: 'MANAJEMEN',
        eventAction: 'user_created',
        status: 'SUCCESS',
        severity: 'LOW',
        actorId: user.id,
        actorRole: user.role,
        entityType: 'User',
        entityId: createdUser.id,
        classId: finalClassId,
        ...getRequestAuditFields(request),
        metadata: {
          targetName: createdUser.name,
          targetUsername: createdUser.username,
          targetRole: createdUser.role,
          homeroomClass: finalClassId ? classById.get(finalClassId) : null,
          teachingAssignments: teachingAssignments.map((assignment) => ({
            class: classById.get(assignment.classId),
            subject: subjectById.get(assignment.subjectId),
          })),
        },
        newValue: {
          name: createdUser.name,
          username: createdUser.username,
          role: createdUser.role,
          classId: finalClassId,
          homeroomClassId: finalClassId,
          teachingAssignments,
        },
      })

      const result = await tx.user.findUnique({
        where: { id: createdUser.id },
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          classId: true,
          class: { select: { id: true, name: true } },
          teachingAssignments: {
            where: { isActive: true },
            select: {
              id: true,
              classId: true,
              subjectId: true,
              class: { select: { id: true, name: true, tingkat: true, tahunAjaran: true } },
              subject: { select: { id: true, name: true } },
            },
          },
          homeroomAssignments: {
            where: { isActive: true },
            select: {
              id: true,
              classId: true,
              class: { select: { id: true, name: true, tingkat: true, tahunAjaran: true } },
            },
          },
        },
      })

      return result || createdUser
    })

    return NextResponse.json(
      { user: newUser },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    if (!userId) {
      return NextResponse.json(
        { error: 'ID user wajib diisi' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const parsed = updateUserSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data tidak valid', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        class: {
          select: { id: true, name: true, tingkat: true, tahunAjaran: true },
        },
        teachingAssignments: {
          where: { isActive: true },
          include: {
            class: { select: { id: true, name: true, tingkat: true, tahunAjaran: true } },
            subject: { select: { id: true, name: true } },
          },
        },
        homeroomAssignments: {
          where: { isActive: true },
          include: {
            class: { select: { id: true, name: true, tingkat: true, tahunAjaran: true } },
          },
        },
      },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }

    if (!['GURU', 'WALI_KELAS', 'BENDAHARA'].includes(targetUser.role)) {
      return NextResponse.json({ error: 'Role ini tidak dapat diedit dari halaman akun' }, { status: 403 })
    }

    const { role } = parsed.data
    const name = parsed.data.name.trim()
    const username = parsed.data.username.trim().toLowerCase()
    const password = parsed.data.password?.trim() || ''
    const homeroomClassId = parsed.data.homeroomClassId || (role === 'WALI_KELAS' ? parsed.data.classId : null)
    const finalClassId = role === 'WALI_KELAS' ? homeroomClassId || null : role === 'BENDAHARA' ? parsed.data.classId || null : null
    const teachingAssignments = role === 'BENDAHARA'
      ? []
      : dedupeTeachingAssignments(parsed.data.teachingAssignments)

    const existingUser = await prisma.user.findFirst({
      where: {
        username,
        id: { not: userId },
      },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username sudah digunakan' },
        { status: 409 }
      )
    }

    const classIds = Array.from(new Set([
      ...teachingAssignments.map((assignment) => assignment.classId),
      ...(finalClassId ? [finalClassId] : []),
    ]))

    const selectedClasses = await prisma.class.findMany({
      where: { id: { in: classIds }, status: 'ACTIVE' },
      select: { id: true, name: true, tingkat: true, tahunAjaran: true },
    })
    const classById = new Map(selectedClasses.map((classItem) => [classItem.id, classItem]))

    if (selectedClasses.length !== classIds.length) {
      return NextResponse.json(
        { error: 'Salah satu kelas tidak ditemukan atau tidak aktif' },
        { status: 404 }
      )
    }

    const subjectIds = Array.from(new Set(teachingAssignments.map((assignment) => assignment.subjectId)))
    const selectedSubjects = subjectIds.length > 0
      ? await prisma.subject.findMany({
          where: { id: { in: subjectIds } },
          select: { id: true, name: true },
        })
      : []
    const subjectById = new Map(selectedSubjects.map((subject) => [subject.id, subject]))

    if (selectedSubjects.length !== subjectIds.length) {
      return NextResponse.json(
        { error: 'Salah satu mata pelajaran tidak ditemukan' },
        { status: 404 }
      )
    }

    if (role === 'WALI_KELAS' && finalClassId) {
      const homeroomClass = classById.get(finalClassId)
      const existingWali = await prisma.user.findFirst({
        where: {
          classId: finalClassId,
          role: 'WALI_KELAS',
          id: { not: userId },
        },
      })
      const existingActiveHomeroomAssignment = homeroomClass
        ? await prisma.homeroomAssignment.findFirst({
            where: {
              classId: finalClassId,
              tahunAjaran: homeroomClass.tahunAjaran,
              isActive: true,
              teacherId: { not: userId },
            },
          })
        : null

      if (existingWali) {
        return NextResponse.json(
          { error: 'Kelas ini sudah memiliki Wali Kelas' },
          { status: 409 }
        )
      }

      if (existingActiveHomeroomAssignment) {
        return NextResponse.json(
          { error: 'Kelas ini sudah memiliki assignment wali kelas aktif' },
          { status: 409 }
        )
      }
    }

    if (role === 'BENDAHARA' && finalClassId) {
      const existingBendahara = await prisma.user.findFirst({
        where: {
          classId: finalClassId,
          role: 'BENDAHARA',
          id: { not: userId },
        },
      })

      if (existingBendahara) {
        return NextResponse.json(
          { error: 'Kelas ini sudah memiliki Bendahara' },
          { status: 409 }
        )
      }
    }

    const passwordHash = password ? await hashPassword(password) : null
    const newTeachingSnapshots = teachingAssignments.map((assignment) => {
      const selectedClass = classById.get(assignment.classId)
      return {
        classId: assignment.classId,
        subjectId: assignment.subjectId,
        tahunAjaran: selectedClass?.tahunAjaran || '',
        class: selectedClass,
        subject: subjectById.get(assignment.subjectId),
      }
    })
    const oldTeachingSnapshots = targetUser.teachingAssignments.map((assignment) => ({
      classId: assignment.classId,
      subjectId: assignment.subjectId,
      tahunAjaran: assignment.tahunAjaran,
      class: assignment.class,
      subject: assignment.subject,
    }))
    const oldTeachingKeys = oldTeachingSnapshots.map(toTeachingAssignmentKey).sort()
    const newTeachingKeys = newTeachingSnapshots.map(toTeachingAssignmentKey).sort()
    const finalHomeroomClassId = role === 'WALI_KELAS' ? finalClassId : null
    const oldHomeroomClassId = targetUser.homeroomAssignments[0]?.classId || null
    const shouldRevokeSessions = Boolean(passwordHash)
      || username !== targetUser.username
      || role !== targetUser.role
      || finalClassId !== targetUser.classId
      || finalHomeroomClassId !== oldHomeroomClassId
      || JSON.stringify(oldTeachingKeys) !== JSON.stringify(newTeachingKeys)

    const updatedUser = await prisma.$transaction(async (tx) => {
      const savedUser = await tx.user.update({
        where: { id: userId },
        data: {
          name,
          username,
          role,
          classId: finalClassId,
          ...(passwordHash ? { passwordHash } : {}),
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

      if (shouldRevokeSessions) {
        await tx.session.deleteMany({ where: { userId } })
      }

      await tx.homeroomAssignment.updateMany({
        where: { teacherId: userId, isActive: true },
        data: { isActive: false },
      })

      if (finalHomeroomClassId) {
        const selectedClass = classById.get(finalHomeroomClassId)
        if (selectedClass) {
          await tx.homeroomAssignment.upsert({
            where: {
              classId_tahunAjaran: {
                classId: finalHomeroomClassId,
                tahunAjaran: selectedClass.tahunAjaran,
              },
            },
            create: {
              teacherId: userId,
              classId: finalHomeroomClassId,
              tahunAjaran: selectedClass.tahunAjaran,
            },
            update: {
              teacherId: userId,
              isActive: true,
            },
          })
        }
      }

      await tx.teachingAssignment.updateMany({
        where: { teacherId: userId, isActive: true },
        data: { isActive: false },
      })

      for (const assignment of newTeachingSnapshots) {
        await tx.teachingAssignment.upsert({
          where: {
            teacherId_classId_subjectId_tahunAjaran: {
              teacherId: userId,
              classId: assignment.classId,
              subjectId: assignment.subjectId,
              tahunAjaran: assignment.tahunAjaran,
            },
          },
          create: {
            teacherId: userId,
            classId: assignment.classId,
            subjectId: assignment.subjectId,
            tahunAjaran: assignment.tahunAjaran,
          },
          update: {
            isActive: true,
          },
        })
      }

      await createAuditLog(tx, {
        eventType: 'MANAJEMEN',
        eventAction: 'user_updated',
        status: 'SUCCESS',
        severity: passwordHash ? 'HIGH' : 'MEDIUM',
        actorId: user.id,
        actorRole: user.role,
        entityType: 'User',
        entityId: savedUser.id,
        classId: finalClassId || targetUser.classId,
        ...getRequestAuditFields(request),
        metadata: {
          targetName: savedUser.name,
          targetUsername: savedUser.username,
          targetRole: savedUser.role,
          previousUsername: targetUser.username,
          previousRole: targetUser.role,
          passwordChanged: Boolean(passwordHash),
          sessionsRevoked: shouldRevokeSessions,
          homeroomClass: finalHomeroomClassId ? classById.get(finalHomeroomClassId) : null,
          teachingAssignments: newTeachingSnapshots.map((assignment) => ({
            class: assignment.class,
            subject: assignment.subject,
          })),
        },
        oldValue: {
          name: targetUser.name,
          username: targetUser.username,
          role: targetUser.role,
          classId: targetUser.classId,
          homeroomClassId: oldHomeroomClassId,
          teachingAssignments: oldTeachingSnapshots.map(stripAssignmentSnapshot),
          passwordAccess: 'unchanged',
        },
        newValue: {
          name: savedUser.name,
          username: savedUser.username,
          role: savedUser.role,
          classId: finalClassId,
          homeroomClassId: finalHomeroomClassId,
          teachingAssignments: newTeachingSnapshots.map(stripAssignmentSnapshot),
          passwordAccess: passwordHash ? 'reset' : 'unchanged',
        },
      })

      const result = await tx.user.findUnique({
        where: { id: savedUser.id },
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          classId: true,
          class: { select: { id: true, name: true } },
          teachingAssignments: {
            where: { isActive: true },
            select: {
              id: true,
              classId: true,
              subjectId: true,
              class: { select: { id: true, name: true, tingkat: true, tahunAjaran: true } },
              subject: { select: { id: true, name: true } },
            },
            orderBy: [{ class: { tingkat: 'asc' } }, { class: { name: 'asc' } }, { subject: { name: 'asc' } }],
          },
          homeroomAssignments: {
            where: { isActive: true },
            select: {
              id: true,
              classId: true,
              class: { select: { id: true, name: true, tingkat: true, tahunAjaran: true } },
            },
            orderBy: [{ class: { tingkat: 'asc' } }, { class: { name: 'asc' } }],
          },
        },
      })

      return result || savedUser
    })

    return NextResponse.json(
      { user: updatedUser },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    if (!userId) {
      return NextResponse.json(
        { error: 'ID user wajib diisi' },
        { status: 400 }
      )
    }

    // Cannot delete self
    if (userId === user.id) {
      return NextResponse.json(
        { error: 'Tidak dapat menghapus akun sendiri' },
        { status: 400 }
      )
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        class: {
          select: { id: true, name: true, tingkat: true, tahunAjaran: true },
        },
      },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }

    if (!['GURU', 'WALI_KELAS', 'BENDAHARA'].includes(targetUser.role)) {
      return NextResponse.json({ error: 'Role ini tidak dapat dihapus dari halaman akun' }, { status: 403 })
    }

    const disabledPasswordHash = await hashPassword(`${targetUser.id}:${Date.now()}:disabled`)

    await prisma.$transaction(async (tx) => {
      await tx.session.deleteMany({ where: { userId } })
      await tx.teachingAssignment.updateMany({
        where: { teacherId: userId },
        data: { isActive: false },
      })
      await tx.homeroomAssignment.updateMany({
        where: { teacherId: userId },
        data: { isActive: false },
      })

      const updatedUsername = `deleted_${targetUser.id}_${targetUser.username}`

      await tx.user.update({
        where: { id: userId },
        data: {
          classId: null,
          username: updatedUsername,
          passwordHash: disabledPasswordHash,
        },
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
          className: targetUser.class?.name || null,
          tingkat: targetUser.class?.tingkat || null,
          tahunAjaran: targetUser.class?.tahunAjaran || null,
        },
        oldValue: {
          name: targetUser.name,
          username: targetUser.username,
          role: targetUser.role,
          classId: targetUser.classId,
        },
        newValue: {
          name: targetUser.name,
          username: updatedUsername,
          role: targetUser.role,
          classId: null,
          passwordAccess: 'disabled',
        },
      })
    })

    return NextResponse.json(
      { ok: true },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

function dedupeTeachingAssignments(assignments: { classId: string; subjectId: string }[]) {
  const seen = new Set<string>()
  const result: { classId: string; subjectId: string }[] = []

  assignments.forEach((assignment) => {
    const key = `${assignment.classId}:${assignment.subjectId}`
    if (seen.has(key)) return
    seen.add(key)
    result.push(assignment)
  })

  return result
}

function toTeachingAssignmentKey(assignment: { classId: string; subjectId: string; tahunAjaran: string }) {
  return `${assignment.classId}:${assignment.subjectId}:${assignment.tahunAjaran}`
}

function stripAssignmentSnapshot(assignment: {
  classId: string
  subjectId: string
  tahunAjaran: string
  class?: { name?: string | null; tingkat?: string | null; tahunAjaran?: string | null } | null
  subject?: { name?: string | null } | null
}) {
  return {
    classId: assignment.classId,
    subjectId: assignment.subjectId,
    tahunAjaran: assignment.tahunAjaran,
    className: assignment.class?.name || null,
    classLevel: assignment.class?.tingkat || null,
    subjectName: assignment.subject?.name || null,
  }
}
