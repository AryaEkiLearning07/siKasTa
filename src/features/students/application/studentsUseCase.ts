import type { Role, Student } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { createStudentSchema, importStudentsSchema } from '@/lib/validations'
import { appErrors } from '@/core/errors'
import type { RequestAuditContext } from '@/core/audit/context'

const studentStatuses = ['AKTIF', 'BEBAS_KAS', 'PINDAH'] as const
type StudentStatus = (typeof studentStatuses)[number]

type Actor = {
  id: string
  role: Role
  classId: string | null
}

export type StudentListQuery = {
  year?: string | null
  month?: string | null
  status?: string | null
}

export type CreateStudentResult =
  | { type: 'import'; count: number }
  | { type: 'single'; student: Student }

export function parseStudentStatus(status: string | null): StudentStatus | undefined {
  if (!status) return undefined
  return studentStatuses.includes(status as StudentStatus) ? (status as StudentStatus) : undefined
}

export async function listClassStudents(classId: string, query: StudentListQuery) {
  const status = parseStudentStatus(query.status || null)
  const year = query.year || null
  const month = query.month || null

  return prisma.student.findMany({
    where: {
      classId,
      ...(status ? { status } : {}),
    },
    select: {
      id: true,
      name: true,
      nisn: true,
      gender: true,
      status: true,
      statusReason: true,
      payments: year && month
        ? {
            where: {
              year: parseInt(year),
              month: parseInt(month),
              OR: [
                { classId },
                { classId: null },
              ],
            },
            select: {
              id: true,
              isPaid: true,
              amount: true,
              paidAt: true,
            },
          }
        : undefined,
    },
    orderBy: { name: 'asc' },
  })
}

export async function createClassStudent(input: unknown, classId: string, actor: Actor, auditContext: RequestAuditContext): Promise<CreateStudentResult> {
  assertCanManageClassStudents(actor, classId)

  if (isImportPayload(input)) {
    const parsed = importStudentsSchema.safeParse(input)
    if (!parsed.success) {
      throw appErrors.validation('Data import tidak valid', parsed.error.flatten())
    }

    const created = await prisma.$transaction(async (tx) => {
      const result = await tx.student.createMany({
        data: parsed.data.students.map((student) => ({
          classId,
          name: student.name.trim(),
          nisn: student.nisn?.trim() || null,
          gender: student.gender || null,
          status: student.status || 'AKTIF',
          statusReason: student.statusReason?.trim() || null,
          statusSetById: student.status && student.status !== 'AKTIF' ? actor.id : null,
          statusSetAt: student.status && student.status !== 'AKTIF' ? new Date() : null,
        })),
      })

      const classStudents = await tx.student.findMany({
        where: { classId },
        select: { id: true, classId: true },
      })

      await tx.savingsAccount.createMany({
        data: classStudents.map((student) => ({
          studentId: student.id,
          classId: student.classId,
        })),
        skipDuplicates: true,
      })

      await createAuditLog(tx, {
        eventType: 'MANAJEMEN',
        eventAction: 'students_imported',
        status: 'SUCCESS',
        severity: 'LOW',
        actorId: actor.id,
        actorRole: actor.role,
        entityType: 'Student',
        classId,
        ...auditContext,
        metadata: { count: result.count },
        newValue: { count: result.count },
      })

      return result
    })

    return { type: 'import', count: created.count }
  }

  const parsed = createStudentSchema.safeParse(input)
  if (!parsed.success) {
    throw appErrors.validation('Data tidak valid', parsed.error.flatten())
  }

  const { name, nisn, gender, status, statusReason } = parsed.data
  const student = await prisma.$transaction(async (tx) => {
    const created = await tx.student.create({
      data: {
        classId,
        name: name.trim(),
        nisn: nisn?.trim() || null,
        gender: gender || null,
        status: status || 'AKTIF',
        statusReason: statusReason?.trim() || null,
        statusSetById: status && status !== 'AKTIF' ? actor.id : null,
        statusSetAt: status && status !== 'AKTIF' ? new Date() : null,
      },
    })

    await tx.savingsAccount.create({
      data: {
        studentId: created.id,
        classId,
      },
    })

    await createAuditLog(tx, {
      eventType: 'MANAJEMEN',
      eventAction: 'student_created',
      status: 'SUCCESS',
      severity: 'LOW',
      actorId: actor.id,
      actorRole: actor.role,
      entityType: 'Student',
      entityId: created.id,
      classId,
      ...auditContext,
      metadata: {
        targetName: created.name,
        nisn: created.nisn,
        gender: created.gender,
        status: created.status,
      },
      newValue: {
        name: created.name,
        nisn: created.nisn,
        gender: created.gender,
        status: created.status,
        statusReason: created.statusReason,
      },
    })

    return created
  })

  return { type: 'single', student }
}

function assertCanManageClassStudents(actor: Actor, classId: string) {
  if (actor.role !== 'WALI_KELAS') {
    throw appErrors.forbidden('Hanya wali kelas yang dapat menambah siswa')
  }

  if (actor.classId !== classId) {
    throw appErrors.forbidden('Anda tidak memiliki akses ke kelas ini')
  }
}

function isImportPayload(input: unknown): input is { students: unknown[] } {
  return Boolean(input && typeof input === 'object' && Array.isArray((input as { students?: unknown }).students))
}
