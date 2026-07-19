'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/ui/Icon'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { cn, formatRupiah } from '@/lib/utils'

type AuditLog = {
  id: string
  timestamp: string
  eventType: string
  eventAction: string
  status: 'SUCCESS' | 'FAILED' | 'WARNING'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  actorRole: string | null
  actor: { name: string; username: string; role: string } | null
  entityType: string
  entityId: string | null
  class: { name: string; tingkat: string; tahunAjaran: string } | null
  ipAddress: string | null
  userAgent: string | null
  requestId: string | null
  metadata: Record<string, unknown> | null
  oldValue: Record<string, unknown> | null
  newValue: Record<string, unknown> | null
  previousHash: string | null
  logHash: string | null
}

type AuditIntegrity = {
  verified: boolean
  checkedCount: number
  lastHash: string | null
  failureReason?: string
}

type AuditLogFilters = {
  eventType: string
  status: string
  severity: string
  from: string
  to: string
  actorQuery: string
  textQuery: string
}

const defaultAuditLogFilters: AuditLogFilters = {
  eventType: '',
  status: '',
  severity: '',
  from: '',
  to: '',
  actorQuery: '',
  textQuery: '',
}

const eventTypeOptions = [
  { value: '', label: 'Semua kategori' },
  { value: 'AUTH', label: 'Autentikasi' },
  { value: 'KEUANGAN', label: 'Keuangan' },
  { value: 'MANAJEMEN', label: 'Manajemen' },
  { value: 'SISTEM', label: 'Sistem' },
]

const statusOptions = [
  { value: '', label: 'Semua hasil' },
  { value: 'SUCCESS', label: 'Berhasil' },
  { value: 'FAILED', label: 'Gagal' },
  { value: 'WARNING', label: 'Peringatan' },
]

const severityOptions = [
  { value: '', label: 'Semua risiko' },
  { value: 'LOW', label: 'Rendah' },
  { value: 'MEDIUM', label: 'Sedang' },
  { value: 'HIGH', label: 'Tinggi' },
  { value: 'CRITICAL', label: 'Kritis' },
]

const jakartaDateFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const jakartaTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const jakartaDateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

export default function AdminLogPage() {
  const { addToast } = useToast()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [integrity, setIntegrity] = useState<AuditIntegrity | null>(null)
  const [draftFilters, setDraftFilters] = useState<AuditLogFilters>(defaultAuditLogFilters)
  const [appliedFilters, setAppliedFilters] = useState<AuditLogFilters>(defaultAuditLogFilters)
  const [includeInternal, setIncludeInternal] = useState(false)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState<'csv' | 'pdf' | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [expandedLogIds, setExpandedLogIds] = useState<string[]>([])
  const fetchAbortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      fetchAbortControllerRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchLogs()
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [appliedFilters, includeInternal])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = window.setInterval(() => {
      fetchLogs({ silent: true })
    }, 30000)

    return () => window.clearInterval(interval)
  }, [autoRefresh, appliedFilters, includeInternal])

  function openFilterModal() {
    setDraftFilters(appliedFilters)
    setIsFilterModalOpen(true)
  }

  function applyFilters() {
    setAppliedFilters(draftFilters)
    setIsFilterModalOpen(false)
  }

  async function fetchLogs(options: { silent?: boolean } = {}) {
    fetchAbortControllerRef.current?.abort()
    const controller = new AbortController()
    fetchAbortControllerRef.current = controller

    if (!options.silent) setIsLoading(true)
    try {
      const params = buildFilterParams(appliedFilters, includeInternal)
      const query = params.toString()
      const res = await fetch(`/api/admin/logs${query ? `?${query}` : ''}`, {
        signal: controller.signal,
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) {
        addToast('error', data.error || 'Gagal memuat log')
        return
      }
      if (controller.signal.aborted) return
      setLogs(data.logs || [])
      setIntegrity(data.integrity || null)
      setLastUpdatedAt(new Date().toISOString())
    } catch (error) {
      if ((error as Error)?.name === 'AbortError' || controller.signal.aborted) {
        return
      }
      addToast('error', 'Koneksi gagal')
    } finally {
      if (fetchAbortControllerRef.current === controller) {
        fetchAbortControllerRef.current = null
      }
      if (!options.silent && !controller.signal.aborted) setIsLoading(false)
    }
  }

  async function exportAudit(format: 'csv' | 'pdf') {
    setIsExporting(format)
    try {
      const params = buildFilterParams(appliedFilters, includeInternal)
      params.set('format', format)
      params.set('limit', '1000')

      const res = await fetch(`/api/admin/logs/export?${params.toString()}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        addToast('error', data.error || 'Export audit gagal')
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
      link.href = url
      link.download = `audit-log-${stamp}.${format}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      addToast('success', `Export ${format.toUpperCase()} berhasil dibuat`)
    } catch {
      addToast('error', 'Export audit gagal')
    } finally {
      setIsExporting(null)
    }
  }

  function buildFilterParams(filters: AuditLogFilters, includeInternalLogs: boolean) {
    const params = new URLSearchParams()
    if (filters.eventType) params.set('eventType', filters.eventType)
    if (filters.status) params.set('status', filters.status)
    if (filters.severity) params.set('severity', filters.severity)
    if (filters.from) params.set('from', new Date(filters.from).toISOString())
    if (filters.to) params.set('to', new Date(filters.to).toISOString())
    if (filters.actorQuery.trim()) params.set('actor', filters.actorQuery.trim())
    if (filters.textQuery.trim()) params.set('q', filters.textQuery.trim())
    if (includeInternalLogs) params.set('includeInternal', 'true')
    return params
  }

  function resetFilters() {
    setDraftFilters(defaultAuditLogFilters)
    setAppliedFilters(defaultAuditLogFilters)
  }

  function toggleLogDetail(logId: string) {
    setExpandedLogIds((current) => (
      current.includes(logId)
        ? current.filter((id) => id !== logId)
        : [...current, logId]
    ))
  }

  const activeFilterLabels = useMemo(() => {
    const labels = [
      appliedFilters.eventType ? `Kategori: ${findOptionLabel(eventTypeOptions, appliedFilters.eventType)}` : '',
      appliedFilters.status ? `Hasil: ${findOptionLabel(statusOptions, appliedFilters.status)}` : '',
      appliedFilters.severity ? `Risiko: ${findOptionLabel(severityOptions, appliedFilters.severity)}` : '',
      appliedFilters.from ? `Dari: ${formatFilterTime(appliedFilters.from)}` : '',
      appliedFilters.to ? `Sampai: ${formatFilterTime(appliedFilters.to)}` : '',
      appliedFilters.actorQuery.trim() ? `Pelaku: ${appliedFilters.actorQuery.trim()}` : '',
      appliedFilters.textQuery.trim() ? `Cari: ${appliedFilters.textQuery.trim()}` : '',
      includeInternal ? 'Termasuk log internal' : '',
    ]

    return labels.filter(Boolean)
  }, [appliedFilters, includeInternal])

  const activeFilterCount = activeFilterLabels.length

  const expandedLogIdSet = useMemo(() => new Set(expandedLogIds), [expandedLogIds])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-blue-bg text-brand-blue-info">
            <Icon name="book" size={18} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl font-bold text-brand-ink">Log Audit</h1>
              {integrity && (
                <span
                  title={integrity.failureReason || `Hash terakhir: ${integrity.lastHash || '-'}`}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
                    integrity.verified ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'
                  )}
                >
                  <Icon name={integrity.verified ? 'shield-check' : 'x'} size={13} />
                  {integrity.verified ? 'Terverifikasi' : 'Perlu cek'}
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-500">
              Aktivitas terbaru, risiko, pelaku, target, dan sumber akses.
              {lastUpdatedAt ? ` Diperbarui ${formatJakartaClock(lastUpdatedAt)}.` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<Icon name="refresh" size={16} />}
            isLoading={isLoading}
            loadingText="Memuat"
            onClick={() => fetchLogs()}
          >
            Muat ulang
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<Icon name="search" size={16} />}
            onClick={openFilterModal}
          >
            Filter Log{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Button>
          <label className="flex min-h-8 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(event) => setAutoRefresh(event.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 accent-brand-green"
            />
            Auto refresh
          </label>
          <label className="flex min-h-8 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700">
            <input
              type="checkbox"
              checked={includeInternal}
              onChange={(event) => setIncludeInternal(event.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 accent-brand-green"
            />
            Log internal
          </label>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<Icon name="download" size={16} />}
            isLoading={isExporting === 'csv'}
            loadingText="CSV"
            onClick={() => exportAudit('csv')}
          >
            Export untuk audit CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Icon name="download" size={16} />}
            isLoading={isExporting === 'pdf'}
            loadingText="PDF"
            onClick={() => exportAudit('pdf')}
          >
            Export PDF
          </Button>
        </div>
      </div>

      <Modal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} title="Filter Log" size="lg">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Select
              label="Kategori"
              value={draftFilters.eventType}
              onChange={(event) => setDraftFilters((current) => ({ ...current, eventType: event.target.value }))}
              options={eventTypeOptions}
            />
            <Select
              label="Hasil"
              value={draftFilters.status}
              onChange={(event) => setDraftFilters((current) => ({ ...current, status: event.target.value }))}
              options={statusOptions}
            />
            <Select
              label="Risiko"
              value={draftFilters.severity}
              onChange={(event) => setDraftFilters((current) => ({ ...current, severity: event.target.value }))}
              options={severityOptions}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Dari waktu"
              type="datetime-local"
              value={draftFilters.from}
              onChange={(event) => setDraftFilters((current) => ({ ...current, from: event.target.value }))}
            />
            <Input
              label="Sampai waktu"
              type="datetime-local"
              value={draftFilters.to}
              onChange={(event) => setDraftFilters((current) => ({ ...current, to: event.target.value }))}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Cari pelaku"
              value={draftFilters.actorQuery}
              onChange={(event) => setDraftFilters((current) => ({ ...current, actorQuery: event.target.value }))}
              placeholder="Nama, username, jabatan"
              startAdornment={<Icon name="search" size={16} />}
            />
            <Input
              label="Cari kejadian / target"
              value={draftFilters.textQuery}
              onChange={(event) => setDraftFilters((current) => ({ ...current, textQuery: event.target.value }))}
              placeholder="Kelas, siswa, nominal, aktivitas"
              startAdornment={<Icon name="search" size={16} />}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={resetFilters}>Reset</Button>
            <Button type="button" onClick={applyFilters}>Terapkan</Button>
          </div>
        </div>
      </Modal>

      {activeFilterLabels.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilterLabels.map((label) => (
            <span key={label} className="inline-flex min-h-8 items-center rounded-full bg-white px-3 text-xs font-semibold text-neutral-600 ring-1 ring-neutral-200">
              {label}
            </span>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      ) : logs.length === 0 ? (
        <EmptyState title="Belum Ada Log" description="Tidak ada log yang cocok dengan filter aktif." />
      ) : (
        <Card padding="none">
          <CardContent>
            <div className="border-b border-neutral-100 bg-brand-cream px-4 py-3 sm:px-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-serif text-lg font-semibold text-brand-ink">Aktivitas Terbaru</h2>
                  <p className="text-xs text-neutral-500">Urutan terbaru muncul paling atas.</p>
                </div>
                {integrity && (
                  <span className="text-xs font-medium text-neutral-500">
                    {integrity.checkedCount} log dicek integritasnya
                  </span>
                )}
              </div>
            </div>

            <AuditLogTable
              logs={logs}
              expandedLogIds={expandedLogIdSet}
              onToggleDetail={toggleLogDetail}
            />

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 px-4 py-3 text-xs text-neutral-500">
              <span>Menampilkan {logs.length} entri sesuai filter aktif</span>
              {integrity?.lastHash && <span>Hash terakhir: {shortHash(integrity.lastHash)}</span>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function AuditLogTable({
  logs,
  expandedLogIds,
  onToggleDetail,
}: {
  logs: AuditLog[]
  expandedLogIds: Set<string>
  onToggleDetail: (logId: string) => void
}) {
  return (
    <div className="overflow-x-auto bg-white">
      <table className="min-w-[1280px] w-full table-fixed">
        <colgroup>
          <col className="w-[120px]" />
          <col className="w-[115px]" />
          <col className="w-[210px]" />
          <col className="w-[95px]" />
          <col className="w-[95px]" />
          <col className="w-[185px]" />
          <col className="w-[190px]" />
          <col />
          <col className="w-[100px]" />
        </colgroup>
        <thead className="bg-brand-cream border-b border-neutral-200">
          <tr>
            <TableHeader>Waktu</TableHeader>
            <TableHeader>Area</TableHeader>
            <TableHeader>Tindakan</TableHeader>
            <TableHeader>Hasil</TableHeader>
            <TableHeader>Risiko</TableHeader>
            <TableHeader>Pelaku</TableHeader>
            <TableHeader>Target</TableHeader>
            <TableHeader>Keterangan</TableHeader>
            <TableHeader>Rincian</TableHeader>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {logs.map((log) => {
            const isExpanded = expandedLogIds.has(log.id)
            const description = formatAuditDescription(log)
            const source = formatSource(log)

            return (
              <Fragment key={log.id}>
                <tr
                  className={cn(
                    'align-top transition-colors hover:bg-brand-cream/50',
                    log.status === 'FAILED' && 'bg-danger-bg/35',
                    log.status !== 'FAILED' && (log.severity === 'HIGH' || log.severity === 'CRITICAL') && 'bg-warning-bg/25'
                  )}
                >
                  <TableCell>
                    <p className="font-semibold text-brand-ink">{formatJakartaDate(log.timestamp)}</p>
                    <p className="mt-1 text-xs text-neutral-500">{formatJakartaClock(log.timestamp)}</p>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">
                      {formatEventType(log.eventType)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold leading-snug text-brand-ink">{describeEvent(log)}</p>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusClass(log.status)}>{formatStatus(log.status)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={severityClass(log.severity)}>{formatSeverity(log.severity)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0">{formatActor(log)}</div>
                  </TableCell>
                  <TableCell>
                    <p className="break-words font-medium text-brand-ink">{formatTarget(log)}</p>
                  </TableCell>
                  <TableCell>
                    <p className="leading-relaxed text-neutral-700">{description}</p>
                    <p className="mt-2 text-xs text-neutral-500">{source}</p>
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => onToggleDetail(log.id)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-brand-green hover:bg-brand-green-bg"
                      aria-expanded={isExpanded}
                    >
                      Rincian
                      <Icon name="chevron-down" size={14} className={cn('transition-transform', isExpanded && 'rotate-180')} />
                    </button>
                  </TableCell>
                </tr>
                {isExpanded && (
                  <tr className="bg-neutral-50">
                    <td colSpan={9} className="px-4 py-4">
                      <ReadableLogDetail log={log} />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
      {children}
    </th>
  )
}

function TableCell({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-4 text-sm text-neutral-700">
      {children}
    </td>
  )
}

function ReadableLogDetail({ log }: { log: AuditLog }) {
  const changes = formatReadableChanges(log.oldValue, log.newValue)
  const notes = formatReadableNotes(log)

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="border-b border-neutral-100 pb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Ringkasan</p>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-brand-ink">{formatAuditDescription(log)}</p>
      </div>

      <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
        <DetailValue label="Pelaku" value={formatActor(log)} />
        <DetailValue label="Target" value={formatTarget(log)} />
        <DetailValue label="Waktu" value={formatJakartaTime(log.timestamp)} />
        <DetailValue label="Sumber akses" value={formatSourceText(log)} />
      </div>

      {changes.length > 0 && (
        <div className="mt-4 rounded-lg bg-neutral-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Data yang berubah</p>
          <ul className="mt-2 space-y-1 text-sm leading-relaxed text-neutral-700">
            {changes.map((change) => (
              <li key={change}>- {change}</li>
            ))}
          </ul>
        </div>
      )}

      {notes.length > 0 && (
        <div className="mt-3 rounded-lg bg-brand-cream p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Catatan tambahan</p>
          <ul className="mt-2 space-y-1 text-sm leading-relaxed text-neutral-700">
            {notes.map((note) => (
              <li key={note}>- {note}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function DetailValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase text-neutral-500">{label}</p>
      <p className="mt-1 break-words font-medium text-brand-ink">{value}</p>
    </div>
  )
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{children}</span>
}

function findOptionLabel(options: { value: string; label: string }[], value: string) {
  return options.find((option) => option.value === value)?.label || value
}

function formatFilterTime(value: string) {
  if (!value) return '-'
  return formatJakartaTime(new Date(value).toISOString())
}

function formatActor(log: AuditLog) {
  if (log.actor) {
    return (
      <>
        <span className="block truncate">{log.actor.name}</span>
        <span className="block truncate text-xs font-normal text-neutral-500">
          @{log.actor.username} - {formatRole(log.actor.role)}
        </span>
      </>
    )
  }

  return log.actorRole ? formatRole(log.actorRole) : '-'
}

function formatSource(log: AuditLog) {
  const parts = [
    formatUserAgent(log.userAgent),
    log.ipAddress ? `IP ${log.ipAddress}` : '',
  ].filter((part) => part && part !== '-')

  return parts.length > 0 ? `Sumber: ${parts.join(', ')}` : 'Sumber: -'
}

function formatSourceText(log: AuditLog) {
  const parts = [
    formatUserAgent(log.userAgent),
    log.ipAddress ? `IP ${log.ipAddress}` : '',
  ].filter((part) => part && part !== '-')

  return parts.length > 0 ? parts.join(', ') : '-'
}

function formatEventType(value: string) {
  const labels: Record<string, string> = {
    AUTH: 'Autentikasi',
    KEUANGAN: 'Keuangan',
    MANAJEMEN: 'Manajemen',
    SISTEM: 'Sistem',
  }
  return labels[value] || value
}

function formatEventAction(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function describeEvent(log: AuditLog) {
  const metadata = log.metadata || {}
  const targetName = readString(metadata.targetName) || readString(metadata.name)
  const className = getClassName(log)
  const amount = readNumber(metadata.amount)

  const labels: Record<string, string> = {
    login_success: 'Pengguna berhasil masuk ke sistem.',
    login_failed: 'Ada percobaan login yang gagal.',
    logout: 'Pengguna keluar dari sistem.',
    user_created: targetName ? `Akun ${targetName} dibuat.` : 'Akun baru dibuat.',
    user_updated: targetName ? `Akun ${targetName} diperbarui.` : 'Akun diperbarui.',
    user_access_removed: targetName ? `Akses akun ${targetName} dinonaktifkan.` : 'Akses akun dinonaktifkan.',
    class_created: className ? `${className} dibuat.` : 'Kelas baru dibuat.',
    class_deleted: className ? `${className} dihapus.` : 'Kelas dihapus.',
    class_cash_nominal_updated: className ? `Nominal kas ${className} diubah.` : 'Nominal kas kelas diubah.',
    students_imported: `Data siswa diimpor${readNumber(metadata.count) ? ` sebanyak ${readNumber(metadata.count)} siswa` : ''}.`,
    student_created: targetName ? `Siswa ${targetName} ditambahkan.` : 'Siswa baru ditambahkan.',
    student_deleted: targetName ? `Siswa ${targetName} dihapus.` : 'Siswa dihapus.',
    student_status_updated: targetName ? `Status siswa ${targetName} diubah.` : 'Status siswa diubah.',
    payment_created: amount ? `Pembayaran kas dicatat sebesar ${formatRupiah(amount)}.` : 'Pembayaran kas dicatat.',
    payment_updated: amount ? `Status pembayaran kas diperbarui sebesar ${formatRupiah(amount)}.` : 'Status pembayaran kas diperbarui.',
    expense_created: amount ? `Pengeluaran dicatat sebesar ${formatRupiah(amount)}.` : 'Pengeluaran dicatat.',
    expense_deleted: 'Catatan pengeluaran dihapus.',
    savings_deposit_created: amount ? `Setoran tabungan dicatat sebesar ${formatRupiah(amount)}.` : 'Setoran tabungan dicatat.',
    withdrawal_requested: amount ? `Pengajuan penarikan tabungan sebesar ${formatRupiah(amount)} dibuat.` : 'Pengajuan penarikan tabungan dibuat.',
    class_account_password_updated: targetName ? `Password akun ${targetName} diperbarui.` : 'Password akun kelas diperbarui.',
    class_account_updated: targetName ? `Akun bendahara ${targetName} diperbarui.` : 'Akun bendahara diperbarui.',
    wali_kelas_unassigned: targetName ? `${targetName} dilepas dari tugas wali kelas.` : 'Wali kelas dilepas dari kelas.',
    academic_year_migrated: 'Migrasi tahun ajaran dijalankan.',
    audit_log_viewed: 'Admin membuka daftar log.',
    audit_log_exported: 'Admin mengunduh laporan log.',
    attendance_saved: className ? `Absensi ${className} disimpan.` : 'Absensi siswa disimpan.',
    grade_assessment_created: 'Penilaian siswa dibuat.',
    grade_assessment_updated: 'Penilaian siswa diperbarui.',
  }

  return labels[log.eventAction] || formatEventAction(log.eventAction)
}

function formatStatus(value: AuditLog['status']) {
  if (value === 'FAILED') return 'Gagal'
  if (value === 'WARNING') return 'Peringatan'
  return 'Berhasil'
}

function formatSeverity(value: AuditLog['severity']) {
  if (value === 'CRITICAL') return 'Kritis'
  if (value === 'HIGH') return 'Tinggi'
  if (value === 'MEDIUM') return 'Sedang'
  return 'Rendah'
}

function statusClass(value: AuditLog['status']) {
  if (value === 'FAILED') return 'bg-danger text-white'
  if (value === 'WARNING') return 'bg-warning-bg text-warning'
  return 'bg-success-bg text-success'
}

function severityClass(value: AuditLog['severity']) {
  if (value === 'CRITICAL') return 'bg-danger-bg text-danger'
  if (value === 'HIGH') return 'bg-warning-bg text-warning'
  if (value === 'MEDIUM') return 'bg-info-bg text-info'
  return 'bg-neutral-100 text-neutral-700'
}

function formatRole(value: string) {
  const labels: Record<string, string> = {
    ADMIN: 'Admin',
    KEPALA_SEKOLAH: 'Kepala Sekolah',
    GURU: 'Guru Mapel',
    WALI_KELAS: 'Wali Kelas',
    BENDAHARA: 'Bendahara',
  }
  return labels[value] || value
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

function formatAuditDescription(log: AuditLog) {
  const metadata = log.metadata || {}
  const newValue = log.newValue || {}
  const targetName = readString(metadata.targetName) || readString(metadata.name) || readString(newValue.name)
  const username = readString(metadata.targetUsername) || readString(newValue.username)
  const classContext = formatClassContext(log)
  const className = getClassName(log)
  const level = readString(metadata.tingkat) || readString(newValue.tingkat) || log.class?.tingkat || null
  const academicYear = readString(metadata.tahunAjaran) || readString(newValue.tahunAjaran) || log.class?.tahunAjaran || null
  const amount = readNumber(metadata.amount)
  const count = readNumber(metadata.count) || readNumber(newValue.count)
  const subjectName = readString(metadata.subjectName)

  switch (log.eventAction) {
    case 'class_created':
      return joinDescriptionParts([
        `${className || 'Kelas baru'} dibuat`,
        level ? `tingkat ${level}` : '',
        academicYear ? `tahun ajaran ${academicYear}` : '',
      ])
    case 'class_deleted':
      return joinDescriptionParts([
        `${className || 'Kelas'} dihapus`,
        academicYear ? `tahun ajaran ${academicYear}` : '',
      ])
    case 'class_cash_nominal_updated':
      return `${className || 'Kelas'} mengubah nominal kas menjadi ${formatAuditValue('kasNominal', newValue.kasNominal)}.`
    case 'students_imported':
      return `${count || 'Data'} siswa diimpor ke ${classContext}.`
    case 'student_created':
      return `${targetName || 'Siswa'} ditambahkan ke ${classContext}.`
    case 'student_deleted':
      return `${targetName || 'Siswa'} dihapus dari ${classContext}.`
    case 'student_status_updated':
      return `${targetName || 'Siswa'} diubah statusnya di ${classContext}. ${summarizeDetail(log)}`
    case 'user_created':
      return formatUserCreatedDescription(log)
    case 'user_updated':
      return formatUserUpdatedDescription(log)
    case 'user_access_removed':
      return `Akses akun ${targetName || username || 'pengguna'} dinonaktifkan. Riwayat audit tetap disimpan.`
    case 'wali_kelas_unassigned':
      return `${targetName || 'Wali kelas'} dilepas dari ${classContext}.`
    case 'payment_created':
    case 'payment_updated':
      return `${describeEvent(log)} ${amount ? `Nominal ${formatRupiah(amount)}.` : ''} Target: ${formatTarget(log)}.`
    case 'expense_created':
    case 'expense_deleted':
      return `${describeEvent(log)} ${amount ? `Nominal ${formatRupiah(amount)}.` : ''} Kelas: ${classContext}.`
    case 'savings_deposit_created':
    case 'withdrawal_requested':
      return `${describeEvent(log)} ${amount ? `Nominal ${formatRupiah(amount)}.` : ''} Target: ${formatTarget(log)}.`
    case 'attendance_saved':
      return `${subjectName ? `Absensi ${subjectName}` : 'Absensi'} disimpan untuk ${classContext}${count ? `, ${count} siswa` : ''}.`
    case 'grade_assessment_created':
    case 'grade_assessment_updated':
      return `${subjectName ? `Penilaian ${subjectName}` : 'Penilaian'} diperbarui untuk ${classContext}${count ? `, ${count} siswa` : ''}.`
    case 'login_success':
      return `${formatActorName(log)} berhasil masuk${log.class ? ` sebagai ${formatRole(log.actor?.role || log.actorRole || '')} untuk ${classContext}` : ' ke sistem'}.`
    case 'logout':
      return `${formatActorName(log)} keluar dari sistem${log.class ? ` setelah mengakses ${classContext}` : ''}.`
    case 'login_failed':
      return `Login gagal untuk username ${readString(metadata.username) || '-'} karena ${formatLoginReason(readString(metadata.reason))}.`
    case 'audit_log_viewed':
      return 'Admin membuka daftar log audit.'
    case 'audit_log_exported':
      return 'Admin mengunduh laporan log audit sesuai filter aktif.'
    case 'academic_year_migrated':
      return summarizeDetail(log) || 'Migrasi tahun ajaran dijalankan.'
    default: {
      const detail = summarizeDetail(log)
      return detail && detail !== '-' ? `${describeEvent(log)} ${detail}` : describeEvent(log)
    }
  }
}

function formatUserCreatedDescription(log: AuditLog) {
  const metadata = log.metadata || {}
  const newValue = log.newValue || {}
  const targetName = readString(metadata.targetName) || readString(newValue.name) || 'Akun'
  const username = readString(metadata.targetUsername) || readString(newValue.username)
  const role = readString(metadata.targetRole) || readString(newValue.role)
  const parts = [
    `Akun ${targetName} dibuat`,
    username ? `username @${username}` : '',
    role ? `jabatan ${formatRole(role)}` : '',
  ]

  const homeroomClass = readNestedClassName(metadata.homeroomClass)
  if (homeroomClass) parts.push(`wali kelas ${homeroomClass}`)

  const teachingAssignments = formatTeachingAssignments(metadata.teachingAssignments)
  if (teachingAssignments) parts.push(`mengajar ${teachingAssignments}`)

  return joinDescriptionParts(parts)
}

function formatUserUpdatedDescription(log: AuditLog) {
  const metadata = log.metadata || {}
  const newValue = log.newValue || {}
  const targetName = readString(metadata.targetName) || readString(newValue.name) || 'Akun'
  const username = readString(metadata.targetUsername) || readString(newValue.username)
  const role = readString(metadata.targetRole) || readString(newValue.role)
  const parts = [
    `Akun ${targetName} diperbarui`,
    username ? `username @${username}` : '',
    role ? `jabatan ${formatRole(role)}` : '',
  ]

  if (metadata.passwordChanged || newValue.passwordAccess === 'reset') {
    parts.push('password direset')
  }

  const homeroomClass = readNestedClassName(metadata.homeroomClass)
  if (homeroomClass) parts.push(`wali kelas ${homeroomClass}`)

  const teachingAssignments = formatTeachingAssignments(metadata.teachingAssignments)
  if (teachingAssignments) parts.push(`mengajar ${teachingAssignments}`)

  return joinDescriptionParts(parts)
}

function formatTeachingAssignments(value: unknown) {
  if (!Array.isArray(value)) return ''

  const labels = value
    .map((item) => {
      if (!item || typeof item !== 'object') return ''
      const record = item as Record<string, unknown>
      const className = readNestedClassName(record.class)
      const subjectName = readNestedName(record.subject)
      if (className && subjectName) return `${subjectName} di ${className}`
      return subjectName || className
    })
    .filter(Boolean)

  return labels.join(', ')
}

function readNestedClassName(value: unknown) {
  if (!value || typeof value !== 'object') return ''
  const record = value as Record<string, unknown>
  const name = readString(record.name)
  const year = readString(record.tahunAjaran)
  return [name, year ? `tahun ajaran ${year}` : ''].filter(Boolean).join(' ')
}

function readNestedName(value: unknown) {
  if (!value || typeof value !== 'object') return ''
  return readString((value as Record<string, unknown>).name) || ''
}

function formatClassContext(log: AuditLog) {
  const className = getClassName(log)
  const metadata = log.metadata || {}
  const newValue = log.newValue || {}
  const academicYear = readString(metadata.tahunAjaran) || readString(newValue.tahunAjaran) || log.class?.tahunAjaran

  if (!className && !academicYear) return 'kelas terkait'
  return [className, academicYear ? `tahun ajaran ${academicYear}` : ''].filter(Boolean).join(' ')
}

function getClassName(log: AuditLog) {
  const metadata = log.metadata || {}
  const newValue = log.newValue || {}
  return readString(metadata.className)
    || readString(metadata.name)
    || readString(newValue.className)
    || readString(newValue.name)
    || log.class?.name
    || null
}

function joinDescriptionParts(parts: string[]) {
  return `${parts.filter(Boolean).join(', ')}.`
}

function formatActorName(log: AuditLog) {
  return log.actor?.name || (log.actorRole ? formatRole(log.actorRole) : 'Pengguna')
}

function formatLoginReason(value: string | null) {
  if (value === 'invalid_credentials') return 'username atau password tidak sesuai'
  if (value === 'user_not_found') return 'akun tidak ditemukan'
  return value || 'data login tidak valid'
}

function summarizeDetail(log: AuditLog) {
  const changes = formatReadableChanges(log.oldValue, log.newValue)
  if (changes.length > 0) return changes.join(' | ')

  const metadata = log.metadata || {}
  const parts: string[] = []

  if (typeof metadata.reason === 'string') parts.push(`Alasan: ${metadata.reason}`)
  if (typeof metadata.targetUsername === 'string') parts.push(`Username akun: ${metadata.targetUsername}`)
  if (typeof metadata.targetRole === 'string') parts.push(`Jabatan: ${formatRole(metadata.targetRole)}`)
  if (typeof metadata.className === 'string') parts.push(`Kelas: ${metadata.className}`)
  if (typeof metadata.tahunAjaran === 'string') parts.push(`Tahun ajaran: ${metadata.tahunAjaran}`)
  if (typeof metadata.amount === 'number') parts.push(`Nominal: ${formatRupiah(metadata.amount)}`)
  if (typeof metadata.count === 'number') parts.push(`Jumlah data: ${metadata.count}`)
  if (typeof metadata.subjectName === 'string') parts.push(`Mapel: ${metadata.subjectName}`)
  if (typeof metadata.recordCount === 'number') parts.push(`Jumlah siswa: ${metadata.recordCount}`)
  if (metadata.filter && typeof metadata.filter === 'object') parts.push('Admin melihat daftar log sesuai filter')

  return parts.length > 0 ? parts.join(' | ') : '-'
}

function formatReadableChanges(oldValue: Record<string, unknown> | null, newValue: Record<string, unknown> | null) {
  if (!oldValue && !newValue) return []

  const before = oldValue || {}
  const after = newValue || {}
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))

  return keys
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .filter((key) => !isTechnicalAuditField(key))
    .slice(0, 8)
    .map((key) => {
      const field = capitalizeFirst(formatFieldName(key))
      const oldText = formatAuditValue(key, before[key])
      const newText = formatAuditValue(key, after[key])

      if (oldText === '-' && newText !== '-') return `${field} diisi ${newText}.`
      if (oldText !== '-' && newText === '-') return `${field} dikosongkan. Sebelumnya ${oldText}.`
      return `${field} diubah dari ${oldText} menjadi ${newText}.`
    })
}

function formatReadableNotes(log: AuditLog) {
  const metadata = log.metadata || {}
  const notes: string[] = []

  const reason = readString(metadata.reason)
  if (reason) notes.push(`Alasan: ${formatLoginReason(reason)}.`)

  const username = readString(metadata.targetUsername) || readString(metadata.username)
  if (username) notes.push(`Username terkait: @${username}.`)

  const role = readString(metadata.targetRole)
  if (role) notes.push(`Jabatan terkait: ${formatRole(role)}.`)

  const className = readString(metadata.className)
  const academicYear = readString(metadata.tahunAjaran)
  if (className || academicYear) {
    notes.push(`Kelas terkait: ${[className, academicYear ? `tahun ajaran ${academicYear}` : ''].filter(Boolean).join(', ')}.`)
  }

  const subjectName = readString(metadata.subjectName)
  if (subjectName) notes.push(`Mata pelajaran: ${subjectName}.`)

  const amount = readNumber(metadata.amount)
  if (amount) notes.push(`Nominal: ${formatRupiah(amount)}.`)

  const count = readNumber(metadata.recordCount) || readNumber(metadata.count)
  if (count) notes.push(`Jumlah data: ${count}.`)

  const filterNote = formatFilterNote(metadata.filter)
  if (filterNote) notes.push(filterNote)

  return Array.from(new Set(notes))
}

function formatFilterNote(value: unknown) {
  if (!value || typeof value !== 'object') return ''
  const record = value as Record<string, unknown>
  const parts = [
    readString(record.eventType) && readString(record.eventType) !== 'ALL' ? `kategori ${formatEventType(String(record.eventType))}` : '',
    readString(record.status) && readString(record.status) !== 'ALL' ? `hasil ${formatStatus(String(record.status) as AuditLog['status'])}` : '',
    readString(record.severity) && readString(record.severity) !== 'ALL' ? `risiko ${formatSeverity(String(record.severity) as AuditLog['severity'])}` : '',
    readString(record.actor) ? `pelaku "${readString(record.actor)}"` : '',
    readString(record.q) ? `kata kunci "${readString(record.q)}"` : '',
  ].filter(Boolean)

  return parts.length > 0 ? `Filter yang digunakan: ${parts.join(', ')}.` : 'Daftar log dibuka tanpa filter khusus.'
}

function formatFieldName(key: string) {
  const labels: Record<string, string> = {
    amount: 'nominal',
    kasNominal: 'nominal',
    isPaid: 'status bayar',
    paidAt: 'waktu bayar',
    paidById: 'pencatat pembayaran',
    classId: 'kelas',
    studentId: 'siswa',
    userId: 'akun pengguna',
    actorId: 'pelaku',
    recorderId: 'pencatat',
    statusReason: 'alasan status',
    credentialState: 'kredensial',
    role: 'jabatan',
    name: 'nama',
    username: 'username',
    passwordAccess: 'akses password',
    attendanceDate: 'tanggal absensi',
    assessmentDate: 'tanggal penilaian',
    transactionDate: 'tanggal transaksi',
    note: 'catatan',
    reason: 'alasan',
    title: 'nama penilaian',
    type: 'jenis',
    semester: 'semester',
    score: 'nilai',
    status: 'status',
    count: 'jumlah data',
    recordCount: 'jumlah siswa',
    targetName: 'nama target',
    targetUsername: 'username target',
    targetRole: 'jabatan target',
    className: 'kelas',
    subjectName: 'mata pelajaran',
    teachingAssignments: 'tugas mengajar',
    homeroomClass: 'tugas wali kelas',
    meetingNumber: 'pertemuan',
    paymentMonth: 'bulan pembayaran',
    withdrawalStatus: 'status penarikan',
  }
  return labels[key] || key
}

function formatAuditValue(key: string, value: unknown) {
  if (value === undefined || value === null) return '-'
  if (key === 'isPaid' && typeof value === 'boolean') return value ? 'Sudah dibayar' : 'Belum dibayar'
  if (typeof value === 'number' && /amount|nominal|saldo|kas/i.test(key)) return formatRupiah(value)
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak'
  if (typeof value === 'string') {
    if (key === 'role' || key.endsWith('Role')) return formatRole(value)
    if (isDateField(key) && isValidDateString(value)) return formatJakartaTime(value)
    return formatEnumText(value)
  }
  if (Array.isArray(value)) {
    if (key === 'teachingAssignments') {
      const assignments = formatTeachingAssignments(value)
      return assignments || '-'
    }
    return value.length > 0 ? `${value.length} data` : '-'
  }
  if (typeof value === 'object') {
    const className = readNestedClassName(value)
    if (className) return className

    const name = readNestedName(value)
    if (name) return name

    return 'data terkait'
  }
  return String(value)
}

function isTechnicalAuditField(key: string) {
  return ['passwordHash', 'sessionToken', 'token', 'id', 'createdAt', 'updatedAt'].includes(key)
}

function isDateField(key: string) {
  return /(date|tanggal|waktu|At)$/i.test(key)
}

function isValidDateString(value: string) {
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(value)
}

function formatEnumText(value: string) {
  const labels: Record<string, string> = {
    ACTIVE: 'Aktif',
    INACTIVE: 'Nonaktif',
    GRADUATED: 'Lulus',
    TRANSFERRED: 'Pindah',
    DEPOSIT: 'Setoran',
    WITHDRAWAL: 'Penarikan',
    DISETUJUI: 'Disetujui',
    DITOLAK: 'Ditolak',
    MENUNGGU: 'Menunggu',
    PASSWORD_SET: 'Password sudah dibuat',
    PASSWORD_UNCHANGED: 'Password tidak diubah',
    ACCESS_REMOVED: 'Akses dinonaktifkan',
    SUCCESS: 'Berhasil',
    FAILED: 'Gagal',
    WARNING: 'Peringatan',
  }

  if (labels[value]) return labels[value]
  if (/^[A-Z0-9_]+$/.test(value)) {
    return value
      .split('_')
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join(' ')
  }
  return value
}

function capitalizeFirst(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value
}

function formatJakartaTime(value: string) {
  return jakartaDateTimeFormatter.format(new Date(value))
}

function formatJakartaDate(value: string) {
  return jakartaDateFormatter.format(new Date(value))
}

function formatJakartaClock(value: string) {
  return `${jakartaTimeFormatter.format(new Date(value))} WIB`
}

function shortHash(value: string) {
  return value.length > 14 ? `${value.slice(0, 7)}...${value.slice(-5)}` : value
}

function formatTarget(log: AuditLog) {
  const metadata = log.metadata || {}
  const targetName = readString(metadata.targetName) || readString(metadata.name)
  const className = getClassName(log)

  if (targetName && className && targetName !== className) return `${targetName} (${className})`
  if (targetName) return targetName
  if (className) return formatClassContext(log)

  const entityLabels: Record<string, string> = {
    User: 'Akun pengguna',
    Student: 'Data siswa',
    Class: 'Data kelas',
    Payment: 'Pembayaran kas',
    Expense: 'Pengeluaran',
    SavingsTransaction: 'Transaksi tabungan',
    WithdrawalRequest: 'Penarikan tabungan',
    AttendanceSession: 'Absensi',
    Assessment: 'Penilaian',
    AuditLog: 'Log audit',
  }

  return entityLabels[log.entityType] || log.entityType || '-'
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
