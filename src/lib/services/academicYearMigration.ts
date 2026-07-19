import type { Prisma, Role } from '@prisma/client'
import { createAuditLog } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { setMaintenanceState } from '@/lib/maintenance'
import type { AcademicYearMigrationInput } from '@/lib/validations'

type SourceClass = Prisma.ClassGetPayload<{
  include: {
    _count: { select: { students: true } }
    members: { select: { id: true; name: true; role: true } }
  }
}>

export type AcademicYearMigrationPreview = {
  fromTahunAjaran: string
  toTahunAjaran: string
  canExecuteNow: boolean
  executeWindow: string
  promotions: Array<{
    sourceClassId: string
    sourceName: string
    sourceTingkat: string
    targetName: string
    targetTingkat: string
    studentCount: number
    memberCount: number
  }>
  archives: Array<{
    classId: string
    name: string
    tingkat: string
    studentCount: number
  }>
  newGradeSevenClasses: Array<{
    name: string
    tingkat: '7'
  }>
}

export class AcademicYearMigrationError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'AcademicYearMigrationError'
    this.status = status
  }
}

const NIGHT_WINDOW_LABEL = '22:00 - 05:00'

export async function buildAcademicYearMigrationPreview(input: AcademicYearMigrationInput): Promise<AcademicYearMigrationPreview> {
  const fromTahunAjaran = input.fromTahunAjaran.trim()
  const toTahunAjaran = input.toTahunAjaran.trim()
  const sourceClasses = await getSourceClasses(fromTahunAjaran)

  return buildPreviewFromClasses(sourceClasses, fromTahunAjaran, toTahunAjaran)
}

export async function executeAcademicYearMigration(input: AcademicYearMigrationInput, actor: { id: string; role: Role }) {
  if (!isNightExecutionWindow()) {
    throw new AcademicYearMigrationError(`Migrasi hanya boleh dijalankan malam hari (${NIGHT_WINDOW_LABEL})`, 409)
  }

  const fromTahunAjaran = input.fromTahunAjaran.trim()
  const toTahunAjaran = input.toTahunAjaran.trim()
  const sourceClasses = await getSourceClasses(fromTahunAjaran)
  const preview = buildPreviewFromClasses(sourceClasses, fromTahunAjaran, toTahunAjaran)

  if (sourceClasses.length === 0) {
    throw new AcademicYearMigrationError('Tidak ada kelas aktif pada tahun ajaran asal', 404)
  }

  const existingCompletedJob = await prisma.migrationJob.findFirst({
    where: {
      fromTahunAjaran,
      toTahunAjaran,
      status: 'COMPLETED',
    },
    select: { id: true },
  })

  if (existingCompletedJob) {
    throw new AcademicYearMigrationError('Migrasi untuk tahun ajaran ini sudah pernah selesai', 409)
  }

  const job = await prisma.migrationJob.create({
    data: {
      fromTahunAjaran,
      toTahunAjaran,
      status: 'RUNNING',
      requestedById: actor.id,
      startedAt: new Date(),
      summary: preview,
    },
  })

  await setMaintenanceState({
    enabled: true,
    reason: `Migrasi kenaikan kelas ${fromTahunAjaran} ke ${toTahunAjaran}`,
    jobId: job.id,
    startedAt: new Date().toISOString(),
  })

  try {
    const summary = await prisma.$transaction(async (tx) => {
      await backfillPaymentClassIds(tx, sourceClasses)

      const createdOrReusedTargets = new Map<string, string>()
      let movedStudents = 0
      let movedAccounts = 0
      let movedUsers = 0
      let archivedClasses = 0
      let createdEmptyClasses = 0

      for (const sourceClass of sourceClasses) {
        if (sourceClass.tingkat === '7' || sourceClass.tingkat === '8') {
          const targetTingkat = sourceClass.tingkat === '7' ? '8' : '9'
          const targetName = promoteClassName(sourceClass.name, sourceClass.tingkat, targetTingkat)
          const targetClass = await ensureTargetClass(tx, {
            name: targetName,
            tingkat: targetTingkat,
            tahunAjaran: toTahunAjaran,
            kasNominal: sourceClass.kasNominal,
            promotedFromClassId: sourceClass.id,
          })

          createdOrReusedTargets.set(sourceClass.id, targetClass.id)

          const studentUpdate = await tx.student.updateMany({
            where: { classId: sourceClass.id },
            data: { classId: targetClass.id },
          })
          movedStudents += studentUpdate.count

          const accountUpdate = await tx.savingsAccount.updateMany({
            where: { classId: sourceClass.id },
            data: { classId: targetClass.id },
          })
          movedAccounts += accountUpdate.count

          const userUpdate = await tx.user.updateMany({
            where: { classId: sourceClass.id },
            data: { classId: targetClass.id },
          })
          movedUsers += userUpdate.count
        } else if (sourceClass.tingkat === '9') {
          const userUpdate = await tx.user.updateMany({
            where: { classId: sourceClass.id },
            data: { classId: null },
          })
          movedUsers += userUpdate.count
        }

        await archiveClass(tx, sourceClass.id, fromTahunAjaran, job.id)
        archivedClasses += 1
      }

      const gradeSevenTemplates = sourceClasses.filter((cls) => cls.tingkat === '7')
      for (const template of gradeSevenTemplates) {
        const emptyClass = await ensureTargetClass(tx, {
          name: template.name,
          tingkat: '7',
          tahunAjaran: toTahunAjaran,
          kasNominal: template.kasNominal,
          promotedFromClassId: null,
        })

        if (!createdOrReusedTargets.has(emptyClass.id)) {
          createdEmptyClasses += 1
        }
      }

      const migrationSummary = {
        ...preview,
        movedStudents,
        movedAccounts,
        movedUsers,
        archivedClasses,
        createdEmptyClasses,
      }

      await tx.migrationJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          finishedAt: new Date(),
          summary: migrationSummary,
        },
      })

      await createAuditLog(tx, {
        eventType: 'SISTEM',
        eventAction: 'academic_year_migrated',
        status: 'SUCCESS',
        severity: 'HIGH',
        actorId: actor.id,
        actorRole: actor.role,
        entityType: 'MigrationJob',
        entityId: job.id,
        metadata: migrationSummary,
        oldValue: {
          fromTahunAjaran,
          activeClassCount: sourceClasses.length,
        },
        newValue: {
          toTahunAjaran,
          movedStudents,
          movedAccounts,
          movedUsers,
          archivedClasses,
          createdEmptyClasses,
        },
      })

      return migrationSummary
    })

    await prisma.session.deleteMany({})
    return { jobId: job.id, summary }
  } catch (error) {
    await prisma.migrationJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        finishedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Migrasi gagal',
      },
    }).catch(() => {})

    throw error
  } finally {
    await setMaintenanceState({ enabled: false })
  }
}

async function getSourceClasses(fromTahunAjaran: string) {
  return prisma.class.findMany({
    where: {
      tahunAjaran: fromTahunAjaran,
      status: 'ACTIVE',
    },
    include: {
      _count: { select: { students: true } },
      members: { select: { id: true, name: true, role: true } },
    },
    orderBy: [{ tingkat: 'asc' }, { name: 'asc' }],
  })
}

function buildPreviewFromClasses(sourceClasses: SourceClass[], fromTahunAjaran: string, toTahunAjaran: string): AcademicYearMigrationPreview {
  const promotions = sourceClasses
    .filter((cls) => cls.tingkat === '7' || cls.tingkat === '8')
    .map((cls) => {
      const targetTingkat = cls.tingkat === '7' ? '8' : '9'

      return {
        sourceClassId: cls.id,
        sourceName: cls.name,
        sourceTingkat: cls.tingkat,
        targetName: promoteClassName(cls.name, cls.tingkat, targetTingkat),
        targetTingkat,
        studentCount: cls._count.students,
        memberCount: cls.members.length,
      }
    })

  const archives = sourceClasses
    .filter((cls) => cls.tingkat === '9')
    .map((cls) => ({
      classId: cls.id,
      name: cls.name,
      tingkat: cls.tingkat,
      studentCount: cls._count.students,
    }))

  const newGradeSevenClasses = sourceClasses
    .filter((cls) => cls.tingkat === '7')
    .map((cls) => ({ name: cls.name, tingkat: '7' as const }))

  return {
    fromTahunAjaran,
    toTahunAjaran,
    canExecuteNow: isNightExecutionWindow(),
    executeWindow: NIGHT_WINDOW_LABEL,
    promotions,
    archives,
    newGradeSevenClasses,
  }
}

function promoteClassName(name: string, fromTingkat: string, toTingkat: string) {
  const trimmedName = name.trim()

  if (trimmedName.startsWith(fromTingkat)) {
    return `${toTingkat}${trimmedName.slice(fromTingkat.length)}`
  }

  return `${toTingkat}-${trimmedName}`
}

async function ensureTargetClass(
  tx: Prisma.TransactionClient,
  data: {
    name: string
    tingkat: string
    tahunAjaran: string
    kasNominal: number
    promotedFromClassId: string | null
  }
) {
  const existing = await tx.class.findUnique({
    where: {
      name_tahunAjaran: {
        name: data.name,
        tahunAjaran: data.tahunAjaran,
      },
    },
    include: { _count: { select: { students: true } } },
  })

  if (existing) {
    if (existing.status !== 'ACTIVE') {
      throw new AcademicYearMigrationError(`Kelas target ${data.name} sudah ada sebagai arsip`, 409)
    }

    if (existing._count.students > 0) {
      throw new AcademicYearMigrationError(`Kelas target ${data.name} sudah berisi siswa`, 409)
    }

    return tx.class.update({
      where: { id: existing.id },
      data: {
        tingkat: data.tingkat,
        kasNominal: data.kasNominal,
        promotedFromClassId: data.promotedFromClassId,
      },
    })
  }

  return tx.class.create({
    data: {
      name: data.name,
      tingkat: data.tingkat,
      tahunAjaran: data.tahunAjaran,
      kasNominal: data.kasNominal,
      promotedFromClassId: data.promotedFromClassId,
    },
  })
}

async function archiveClass(tx: Prisma.TransactionClient, classId: string, fromTahunAjaran: string, migrationJobId: string) {
  await tx.class.update({
    where: { id: classId },
    data: {
      status: 'ARCHIVED',
      archivedAt: new Date(),
      archiveLabel: `Angkatan ${fromTahunAjaran}`,
      migrationJobId,
    },
  })
}

async function backfillPaymentClassIds(tx: Prisma.TransactionClient, sourceClasses: SourceClass[]) {
  for (const sourceClass of sourceClasses) {
    await tx.payment.updateMany({
      where: {
        classId: null,
        student: { classId: sourceClass.id },
      },
      data: { classId: sourceClass.id },
    })
  }
}

function isNightExecutionWindow() {
  const hour = new Date().getHours()
  return hour >= 22 || hour < 5
}
