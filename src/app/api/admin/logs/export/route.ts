import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { createAuditLog, getRequestAuditFields } from '@/lib/audit'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatRupiah } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const auditLogExportInclude = {
  actor: {
    select: { id: true, name: true, username: true, role: true },
  },
  class: {
    select: { id: true, name: true, tingkat: true, tahunAjaran: true },
  },
} satisfies Prisma.AuditLogInclude

const jakartaTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

type ExportAuditLog = Prisma.AuditLogGetPayload<{ include: typeof auditLogExportInclude }>

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') === 'pdf' ? 'pdf' : 'csv'
    const limit = Math.min(parseInt(searchParams.get('limit') || '500', 10), 1000)
    const eventType = searchParams.get('eventType')
    const status = searchParams.get('status')
    const severity = searchParams.get('severity')
    const includeInternal = searchParams.get('includeInternal') === 'true'
    const actorQuery = (searchParams.get('actor') || '').trim()
    const textQuery = (searchParams.get('q') || '').trim()
    const from = parseDateParam(searchParams.get('from'))
    const to = parseDateParam(searchParams.get('to'))

    const where: Prisma.AuditLogWhereInput = {
      ...(eventType ? { eventType: eventType as any } : {}),
      ...(status ? { status: status as any } : {}),
      ...(severity ? { severity: severity as any } : {}),
      ...(!includeInternal ? { NOT: { eventAction: { in: ['audit_log_viewed', 'audit_log_exported'] } } } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: auditLogExportInclude,
      orderBy: { createdAt: 'desc' },
      take: 1000,
    })
    const filteredLogs = logs
      .filter((log) => matchesActor(log, actorQuery))
      .filter((log) => matchesText(log, textQuery))
      .slice(0, limit)

    const exportedAt = new Date()
    const watermark = {
      exportedAtUtc: exportedAt.toISOString(),
      exportedAtJakarta: formatJakartaTime(exportedAt),
      exportedBy: `${user.name} (${user.role})`,
      exportedByUsername: user.username,
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
      rowCount: filteredLogs.length,
    }

    await createAuditLog(prisma, {
      eventType: 'SISTEM',
      eventAction: 'audit_log_exported',
      status: 'SUCCESS',
      severity: 'HIGH',
      actorId: user.id,
      actorRole: user.role,
      entityType: 'AuditLog',
      ...getRequestAuditFields(request),
      metadata: watermark,
      newValue: {
        format,
        rowCount: filteredLogs.length,
        exportedAtUtc: watermark.exportedAtUtc,
      },
    })

    const filenameDate = exportedAt.toISOString().slice(0, 19).replace(/[:T]/g, '-')

    if (format === 'pdf') {
      const pdf = buildAuditPdf(filteredLogs, watermark)
      return new Response(pdf, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="audit-log-${filenameDate}.pdf"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    const csv = buildAuditCsv(filteredLogs, watermark)
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="audit-log-${filenameDate}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Export audit logs error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

function buildAuditCsv(logs: ExportAuditLog[], watermark: ExportWatermark) {
  const preface = [
    ['Exported At UTC', watermark.exportedAtUtc],
    ['Exported At Asia/Jakarta', watermark.exportedAtJakarta],
    ['Exported By', watermark.exportedBy],
    ['Exported By Username', watermark.exportedByUsername],
    ['Row Count', watermark.rowCount.toString()],
    ['Filter', JSON.stringify(watermark.filter)],
    [],
  ]

  const headers = [
    'Waktu ISO 8601 UTC',
    'Waktu Asia/Jakarta',
    'Kategori',
    'Kontrol/Aksi',
    'Hasil',
    'Risiko',
    'Aktor',
    'Role',
    'Sumber',
    'Alamat IP',
    'Target',
    'Detail',
    'Request ID',
    'Log Hash',
  ]

  const rows = logs.map((log) => [
    log.createdAt.toISOString(),
    formatJakartaTime(log.createdAt),
    log.eventType,
    log.eventAction,
    log.status,
    log.severity,
    log.actor?.name || '-',
    log.actor?.role || log.actorRole || '-',
    formatUserAgent(log.userAgent),
    log.ipAddress || '-',
    formatTarget(log),
    formatAuditDetail(log),
    log.requestId || '-',
    log.logHash || '-',
  ])

  return [...preface, headers, ...rows]
    .map((row) => row.map(csvEscape).join(','))
    .join('\n')
}

function buildAuditPdf(logs: ExportAuditLog[], watermark: ExportWatermark) {
  const lines = [
    'siKaTa Audit Log Export',
    `Watermark UTC: ${watermark.exportedAtUtc}`,
    `Watermark Asia/Jakarta: ${watermark.exportedAtJakarta}`,
    `Exported by: ${watermark.exportedBy} / ${watermark.exportedByUsername}`,
    `Filter: ${JSON.stringify(watermark.filter)}`,
    `Rows: ${watermark.rowCount}`,
    '',
    ...logs.flatMap((log, index) => [
      `${index + 1}. ${log.createdAt.toISOString()} | ${log.eventType}/${log.eventAction} | ${log.status}/${log.severity}`,
      `   Actor: ${log.actor?.name || '-'} (${log.actor?.role || log.actorRole || '-'}) | IP: ${log.ipAddress || '-'}`,
      `   Source: ${formatUserAgent(log.userAgent)} | Target: ${formatTarget(log)}`,
      `   Detail: ${formatAuditDetail(log).replace(/â†’/g, '->')}`,
      `   Request: ${log.requestId || '-'} | Hash: ${log.logHash || '-'}`,
      '',
    ]),
  ]

  return createTextPdf(lines.flatMap((line) => wrapLine(line, 118)))
}

function createTextPdf(lines: string[]) {
  const lineHeight = 12
  const linesPerPage = 58
  const pages = chunk(lines, linesPerPage)
  const objects: string[] = []

  objects.push('<< /Type /Catalog /Pages 2 0 R >>')
  objects.push('')
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

  const pageObjectNumbers = pages.map((_, index) => 4 + index * 2)
  const contentObjectNumbers = pages.map((_, index) => 5 + index * 2)
  objects[1] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(' ')}] /Count ${pages.length} >>`

  pages.forEach((pageLines, index) => {
    const content = [
      'BT',
      '/F1 9 Tf',
      `${lineHeight} TL`,
      '40 790 Td',
      ...pageLines.map((line) => `(${escapePdfText(line)}) Tj T*`),
      'ET',
    ].join('\n')

    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectNumbers[index]} 0 R >>`)
    objects.push(`<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream`)
  })

  const header = '%PDF-1.4\n'
  let body = header
  const offsets = [0]

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body, 'utf8'))
    body += `${index + 1} 0 obj\n${object}\nendobj\n`
  })

  const xrefOffset = Buffer.byteLength(body, 'utf8')
  body += `xref\n0 ${objects.length + 1}\n`
  body += '0000000000 65535 f \n'
  for (let index = 1; index < offsets.length; index += 1) {
    body += `${offsets[index].toString().padStart(10, '0')} 00000 n \n`
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return body
}

type ExportWatermark = {
  exportedAtUtc: string
  exportedAtJakarta: string
  exportedBy: string
  exportedByUsername: string
  filter: Record<string, unknown>
  rowCount: number
}

function parseDateParam(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function matchesActor(log: ExportAuditLog, query: string) {
  if (!query) return true
  const normalized = query.toLowerCase()
  return [log.actor?.name, log.actor?.username, log.actor?.role, log.actorRole]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(normalized)
}

function matchesText(log: ExportAuditLog, query: string) {
  if (!query) return true
  const normalized = query.toLowerCase()
  return [
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
    .includes(normalized)
}

function formatAuditDetail(log: ExportAuditLog) {
  const diff = formatDiff(log.oldValue, log.newValue)
  if (diff) return diff

  const metadata = log.metadata || {}
  const parts: string[] = []
  if (isRecord(metadata)) {
    if (typeof metadata.reason === 'string') parts.push(`Alasan: ${metadata.reason}`)
    if (typeof metadata.targetName === 'string') parts.push(`Target: ${metadata.targetName}`)
    if (typeof metadata.targetUsername === 'string') parts.push(`Username: ${metadata.targetUsername}`)
    if (typeof metadata.targetRole === 'string') parts.push(`Role: ${metadata.targetRole}`)
    if (typeof metadata.className === 'string') parts.push(`Kelas: ${metadata.className}`)
    if (typeof metadata.name === 'string') parts.push(`Nama: ${metadata.name}`)
    if (typeof metadata.count === 'number') parts.push(`Jumlah: ${metadata.count}`)
  }

  return parts.length > 0 ? parts.join(' | ') : '-'
}

function formatDiff(oldValue: Prisma.JsonValue | null, newValue: Prisma.JsonValue | null) {
  if (!isRecord(oldValue) && !isRecord(newValue)) return ''

  const oldRecord = isRecord(oldValue) ? oldValue : {}
  const newRecord = isRecord(newValue) ? newValue : {}
  const keys = Array.from(new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)]))
  const parts = keys
    .filter((key) => JSON.stringify(oldRecord[key]) !== JSON.stringify(newRecord[key]))
    .slice(0, 6)
    .map((key) => `${formatFieldName(key)}: ${formatAuditValue(key, oldRecord[key])} â†’ ${formatAuditValue(key, newRecord[key])}`)

  return parts.join(' | ')
}

function formatAuditValue(key: string, value: unknown) {
  if (value === undefined || value === null) return '-'
  if (typeof value === 'number' && /amount|nominal|saldo|kas/i.test(key)) return formatRupiah(value)
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak'
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

function formatFieldName(key: string) {
  const labels: Record<string, string> = {
    amount: 'nominal',
    kasNominal: 'nominal',
    isPaid: 'status bayar',
    paidAt: 'waktu bayar',
    classId: 'kelas',
    statusReason: 'alasan status',
  }
  return labels[key] || key
}

function formatTarget(log: ExportAuditLog) {
  const id = log.entityId ? `:${log.entityId}` : ''
  const classLabel = log.class ? ` (${log.class.name} ${log.class.tahunAjaran})` : ''
  return `${log.entityType}${id}${classLabel}`
}

function formatUserAgent(value: string | null) {
  if (!value) return '-'
  if (value.includes('Edg/')) return 'Microsoft Edge'
  if (value.includes('Chrome/')) return 'Chrome'
  if (value.includes('Firefox/')) return 'Firefox'
  if (value.includes('Safari/')) return 'Safari'
  if (value.includes('WindowsPowerShell')) return 'PowerShell'
  return value
}

function formatJakartaTime(value: Date) {
  return jakartaTimeFormatter.format(value)
}

function csvEscape(value: unknown) {
  const text = value === undefined || value === null ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function wrapLine(line: string, width: number) {
  if (line.length <= width) return [line]
  const chunks: string[] = []
  for (let index = 0; index < line.length; index += width) {
    chunks.push(line.slice(index, index + width))
  }
  return chunks
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks.length > 0 ? chunks : [[]]
}

function escapePdfText(value: string) {
  return value.replace(/[\\()]/g, (match) => `\\${match}`).replace(/[^\x20-\x7E]/g, '?')
}
