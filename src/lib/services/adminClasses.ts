import { Prisma } from '@prisma/client'
import type { NextRequest } from 'next/server'
import { createAuditLog, getRequestAuditFields } from '@/lib/audit'
import type { SessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { CreateClassInput } from '@/lib/validations'

const adminClassInclude = {
  members: {
    select: { id: true, name: true, username: true, role: true },
  },
  _count: {
    select: { students: true },
  },
} satisfies Prisma.ClassInclude

export type AdminClass = Prisma.ClassGetPayload<{ include: typeof adminClassInclude }>

export class AdminClassServiceError extends Error {
  status: number
  details?: unknown

  constructor(message: string, status = 400, details?: unknown) {
    super(message)
    this.name = 'AdminClassServiceError'
    this.status = status
    this.details = details
  }
}

type ListAdminClassesInput = {
  tahunAjaran?: string | null
}

export async function listAdminClasses({ tahunAjaran }: ListAdminClassesInput = {}): Promise<AdminClass[]> {
  const normalizedTahunAjaran = tahunAjaran?.trim()

  return prisma.class.findMany({
    where: {
      status: 'ACTIVE',
      ...(normalizedTahunAjaran ? { tahunAjaran: normalizedTahunAjaran } : {}),
    },
    include: adminClassInclude,
    orderBy: [{ tahunAjaran: 'desc' }, { tingkat: 'asc' }, { name: 'asc' }],
  })
}

export async function createAdminClass(
  input: CreateClassInput,
  actor: SessionUser,
  request: NextRequest
): Promise<AdminClass> {
  const data = normalizeClassInput(input)

  const existingClass = await prisma.class.findUnique({
    where: {
      name_tahunAjaran: {
        name: data.name,
        tahunAjaran: data.tahunAjaran,
      },
    },
    select: { id: true },
  })

  if (existingClass) {
    throw new AdminClassServiceError('Kelas dengan nama dan tahun ajaran ini sudah ada', 409)
  }

  return prisma.$transaction(async (tx) => {
    const createdClass = await tx.class.create({
      data,
      include: adminClassInclude,
    })

    await createAuditLog(tx, {
      eventType: 'MANAJEMEN',
      eventAction: 'class_created',
      status: 'SUCCESS',
      severity: 'LOW',
      actorId: actor.id,
      actorRole: actor.role,
      entityType: 'Class',
      entityId: createdClass.id,
      classId: createdClass.id,
      ...getRequestAuditFields(request),
      metadata: data,
      newValue: data,
    })

    return createdClass
  })
}

function normalizeClassInput(input: CreateClassInput): CreateClassInput {
  return {
    name: input.name.trim(),
    tingkat: input.tingkat.trim(),
    tahunAjaran: input.tahunAjaran.trim(),
  }
}
