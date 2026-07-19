import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { createAuditLog, getRequestAuditFields, verifyAuditLogChain, type AuditIntegrityResult, type AuditLogHashRow } from '@/lib/audit'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const auditLogHashSelect = {
  id: true,
  eventType: true,
  eventAction: true,
  status: true,
  severity: true,
  actorId: true,
  actorRole: true,
  entityType: true,
  entityId: true,
  classId: true,
  ipAddress: true,
  userAgent: true,
  requestId: true,
  metadata: true,
  oldValue: true,
  newValue: true,
  previousHash: true,
  logHash: true,
  createdAt: true,
} satisfies Prisma.AuditLogSelect

const auditLogListInclude = {
  actor: {
    select: { id: true, name: true, username: true, role: true },
  },
  class: {
    select: { id: true, name: true, tingkat: true, tahunAjaran: true },
  },
} satisfies Prisma.AuditLogInclude

type ListedAuditLog = Prisma.AuditLogGetPayload<{ include: typeof auditLogListInclude }>

let cachedIntegritySnapshot: { key: string; result: AuditIntegrityResult } | null = null

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200)
    const eventType = searchParams.get('eventType')
    const status = searchParams.get('status')
    const severity = searchParams.get('severity')
    const includeInternal = searchParams.get('includeInternal') === 'true'
    const actorQuery = (searchParams.get('actor') || '').trim()
    const textQuery = (searchParams.get('q') || '').trim()
    const from = parseDateParam(searchParams.get('from'))
    const to = parseDateParam(searchParams.get('to'))

    void createAuditLog(prisma, {
      eventType: 'SISTEM',
      eventAction: 'audit_log_viewed',
      status: 'SUCCESS',
      severity: 'LOW',
      actorId: user.id,
      actorRole: user.role,
      entityType: 'AuditLog',
      ...getRequestAuditFields(request),
      metadata: {
        filter: {
          eventType: eventType || 'ALL',
          status: status || 'ALL',
          severity: severity || 'ALL',
          from: from?.toISOString() || null,
          to: to?.toISOString() || null,
          actor: actorQuery || null,
          q: textQuery || null,
          limit,
        },
      },
    }).catch((error) => console.error('Audit log view write failed:', error))

    const integrity = await getAuditIntegritySnapshot()

    const where: Prisma.AuditLogWhereInput = {
      ...(eventType ? { eventType: eventType as any } : {}),
      ...(status ? { status: status as any } : {}),
      ...(severity ? { severity: severity as any } : {}),
      ...(!includeInternal ? { NOT: { eventAction: 'audit_log_viewed' } } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    }

    const scanLimit = actorQuery || textQuery ? Math.max(limit * 5, 1000) : limit
    const logs = await prisma.auditLog.findMany({
      where,
      include: auditLogListInclude,
      orderBy: { createdAt: 'desc' },
      take: Math.min(scanLimit, 1000),
    })

    const filteredLogs = logs
      .filter((log) => matchesActor(log, actorQuery))
      .filter((log) => matchesText(log, textQuery))
      .slice(0, limit)

    return NextResponse.json({
      integrity,
      logs: filteredLogs.map((log) => ({
        id: log.id,
        timestamp: log.createdAt.toISOString(),
        eventType: log.eventType,
        eventAction: log.eventAction,
        status: log.status,
        severity: log.severity,
        actorRole: log.actorRole,
        actor: log.actor,
        entityType: log.entityType,
        entityId: log.entityId,
        classId: log.classId,
        class: log.class,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        requestId: log.requestId,
        metadata: log.metadata,
        oldValue: log.oldValue,
        newValue: log.newValue,
        previousHash: log.previousHash,
        logHash: log.logHash,
      })),
    })
  } catch (error) {
    console.error('List audit logs error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

function parseDateParam(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

async function getAuditIntegritySnapshot() {
  const head = await prisma.auditLog.findFirst({
    select: {
      id: true,
      logHash: true,
      previousHash: true,
      createdAt: true,
    },
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
  })

  const cacheKey = `${head?.id ?? ''}:${head?.logHash ?? ''}:${head?.previousHash ?? ''}:${head?.createdAt.toISOString() ?? ''}`
  if (cachedIntegritySnapshot?.key === cacheKey) {
    return cachedIntegritySnapshot.result
  }

  const integrityRows = await prisma.auditLog.findMany({
    select: auditLogHashSelect,
  })
  const result = verifyAuditLogChain(integrityRows as AuditLogHashRow[])
  cachedIntegritySnapshot = { key: cacheKey, result }
  return result
}

function matchesActor(log: ListedAuditLog, query: string) {
  if (!query) return true
  const normalized = query.toLowerCase()
  const actorText = [
    log.actor?.name,
    log.actor?.username,
    log.actor?.role,
    log.actorRole,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return actorText.includes(normalized)
}

function matchesText(log: ListedAuditLog, query: string) {
  if (!query) return true
  const normalized = query.toLowerCase()
  const searchable = [
    log.eventAction,
    log.entityType,
    log.entityId,
    log.class?.name,
    log.class?.tingkat,
    log.class?.tahunAjaran,
    JSON.stringify(log.metadata),
    JSON.stringify(log.oldValue),
    JSON.stringify(log.newValue),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return searchable.includes(normalized)
}
