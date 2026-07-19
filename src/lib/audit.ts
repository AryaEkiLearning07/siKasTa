import { createHash, randomUUID } from 'crypto'
import type { Prisma } from '@prisma/client'
import { AuditSeverity, AuditStatus } from '@prisma/client'
import type { NextRequest } from 'next/server'

type AuditClient = Pick<Prisma.TransactionClient, 'auditLog'>

export type CreateAuditLogInput = Omit<
  Prisma.AuditLogUncheckedCreateInput,
  'id' | 'createdAt' | 'previousHash' | 'logHash'
>

type Jsonish = unknown

export type AuditLogHashRow = {
  id: string
  eventType: string
  eventAction: string
  status: string
  severity: string
  actorId: string | null
  actorRole: string | null
  entityType: string
  entityId: string | null
  classId: string | null
  ipAddress: string | null
  userAgent: string | null
  requestId: string | null
  metadata: Prisma.JsonValue | null
  oldValue: Prisma.JsonValue | null
  newValue: Prisma.JsonValue | null
  previousHash: string | null
  logHash: string | null
  createdAt: Date
}

type AuditHashPayload = Omit<AuditLogHashRow, 'logHash' | 'createdAt' | 'metadata' | 'oldValue' | 'newValue'> & {
  metadata: unknown
  oldValue: unknown
  newValue: unknown
  createdAt: string
}

export type AuditIntegrityResult = {
  verified: boolean
  checkedCount: number
  lastHash: string | null
  failureReason?: string
}

export function getClientIp(request: NextRequest) {
  const headerCandidates = [
    request.headers.get('x-forwarded-for'),
    request.headers.get('cf-connecting-ip'),
    request.headers.get('x-real-ip'),
    request.headers.get('x-client-ip'),
  ]

  const ips = headerCandidates
    .flatMap((header) => (header || '').split(','))
    .map(cleanIp)
    .filter((ip): ip is string => Boolean(ip))

  return ips.find((ip) => !isLoopbackIp(ip)) || null
}

export function getRequestAuditFields(request: NextRequest) {
  return {
    ipAddress: getClientIp(request),
    userAgent: request.headers.get('user-agent') || null,
    requestId: request.headers.get('x-request-id') || randomUUID(),
  }
}

export async function createAuditLog(client: AuditClient, input: CreateAuditLogInput) {
  const id = randomUUID()
  const createdAt = new Date()
  const latest = await client.auditLog.findFirst({
    select: { logHash: true },
    where: { logHash: { not: null } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  })
  const previousHash = latest?.logHash || null
  const normalizedInput = normalizeAuditInput(input)
  const logHash = computeAuditLogHash({
    id,
    ...normalizedInput,
    previousHash,
    createdAt: createdAt.toISOString(),
  })

  return client.auditLog.create({
    data: {
      ...jsonNullsToUndefined(normalizedInput),
      id,
      previousHash,
      logHash,
      createdAt,
    } as Prisma.AuditLogUncheckedCreateInput,
  })
}

export function computeAuditLogHash(row: AuditHashPayload) {
  return createHash('sha256')
    .update(stableStringify(row))
    .digest('hex')
}

export function verifyAuditLogChain(rows: AuditLogHashRow[]): AuditIntegrityResult {
  if (rows.length === 0) {
    return { verified: true, checkedCount: 0, lastHash: null }
  }

  const rowsByPreviousHash = new Map<string, AuditLogHashRow[]>()
  for (const row of rows) {
    const key = row.previousHash || '__GENESIS__'
    rowsByPreviousHash.set(key, [...(rowsByPreviousHash.get(key) || []), row])
  }

  const genesisRows = rowsByPreviousHash.get('__GENESIS__') || []
  if (genesisRows.length !== 1) {
    return {
      verified: false,
      checkedCount: 0,
      lastHash: null,
      failureReason: genesisRows.length === 0 ? 'Tidak ada blok awal log.' : 'Ada lebih dari satu blok awal log.',
    }
  }

  let previousHash: string | null = null
  let current = genesisRows[0]
  let checkedCount = 0
  const visited = new Set<string>()

  while (current) {
    if (visited.has(current.id)) {
      return {
        verified: false,
        checkedCount,
        lastHash: previousHash,
        failureReason: 'Rantai log membentuk siklus.',
      }
    }

    if (!current.logHash) {
      return {
        verified: false,
        checkedCount,
        lastHash: previousHash,
        failureReason: `Log ${current.id} belum memiliki hash.`,
      }
    }

    if ((current.previousHash || null) !== previousHash) {
      return {
        verified: false,
        checkedCount,
        lastHash: previousHash,
        failureReason: `Previous hash log ${current.id} tidak cocok.`,
      }
    }

    const expectedHash = computeAuditLogHash(hashPayloadFromRow(current))
    if (current.logHash !== expectedHash) {
      return {
        verified: false,
        checkedCount,
        lastHash: previousHash,
        failureReason: `Hash log ${current.id} tidak cocok dengan isi baris.`,
      }
    }

    visited.add(current.id)
    checkedCount += 1
    previousHash = current.logHash

    const nextRows = rowsByPreviousHash.get(previousHash) || []
    if (nextRows.length === 0) break
    if (nextRows.length > 1) {
      return {
        verified: false,
        checkedCount,
        lastHash: previousHash,
        failureReason: `Rantai bercabang setelah hash ${previousHash}.`,
      }
    }

    current = nextRows[0]
  }

  if (checkedCount !== rows.length) {
    return {
      verified: false,
      checkedCount,
      lastHash: previousHash,
      failureReason: 'Ada log yang tidak tersambung ke rantai utama.',
    }
  }

  return { verified: true, checkedCount, lastHash: previousHash }
}

function normalizeAuditInput(input: CreateAuditLogInput) {
  return {
    eventType: input.eventType,
    eventAction: input.eventAction,
    status: input.status || AuditStatus.SUCCESS,
    severity: input.severity || AuditSeverity.LOW,
    actorId: input.actorId || null,
    actorRole: input.actorRole || null,
    entityType: input.entityType,
    entityId: input.entityId || null,
    classId: input.classId || null,
    ipAddress: input.ipAddress || null,
    userAgent: input.userAgent || null,
    requestId: input.requestId || null,
    metadata: normalizeOptionalJson(input.metadata),
    oldValue: normalizeOptionalJson(input.oldValue),
    newValue: normalizeOptionalJson(input.newValue),
  }
}

function hashPayloadFromRow(row: AuditLogHashRow): AuditHashPayload {
  return {
    id: row.id,
    eventType: row.eventType,
    eventAction: row.eventAction,
    status: row.status,
    severity: row.severity,
    actorId: row.actorId,
    actorRole: row.actorRole,
    entityType: row.entityType,
    entityId: row.entityId,
    classId: row.classId,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    requestId: row.requestId,
    metadata: normalizeOptionalJson(row.metadata),
    oldValue: normalizeOptionalJson(row.oldValue),
    newValue: normalizeOptionalJson(row.newValue),
    previousHash: row.previousHash,
    createdAt: row.createdAt.toISOString(),
  }
}

function normalizeOptionalJson(value: Jsonish) {
  if (value === undefined || value === null) return null
  return normalizeForJson(value) as Prisma.InputJsonValue
}

function jsonNullsToUndefined<T extends ReturnType<typeof normalizeAuditInput>>(input: T) {
  return {
    ...input,
    metadata: input.metadata === null ? undefined : input.metadata,
    oldValue: input.oldValue === null ? undefined : input.oldValue,
    newValue: input.newValue === null ? undefined : input.newValue,
  }
}

function normalizeForJson(value: unknown): unknown {
  if (value === undefined) return null
  if (value === null) return null
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(normalizeForJson)
  if (typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalizeForJson((value as Record<string, unknown>)[key])
        return acc
      }, {})
  }
  return value
}

function stableStringify(value: unknown) {
  return JSON.stringify(normalizeForJson(value))
}

function cleanIp(value: string) {
  const trimmed = value.trim().replace(/^"|"$/g, '')
  if (!trimmed) return null

  const withoutPort = trimmed.startsWith('[')
    ? trimmed.slice(1, trimmed.indexOf(']'))
    : trimmed.replace(/^::ffff:/i, '').replace(/:\d+$/, '')

  if (!withoutPort || withoutPort.toLowerCase() === 'unknown') return null
  return withoutPort
}

function isLoopbackIp(value: string) {
  const ip = value.toLowerCase()
  return ip === 'localhost' || ip === '127.0.0.1' || ip.startsWith('127.') || ip === '::1' || ip === '0:0:0:0:0:0:0:1'
}
