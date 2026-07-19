'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Tabs, TabPanel } from '@/components/ui/Tabs'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusPill } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'
import { formatEmptyValue } from '@/lib/format'

type Student = {
  id: string
  name: string
  nisn: string | null
  gender: 'L' | 'P' | null
  status: 'AKTIF' | 'BEBAS_KAS' | 'PINDAH'
  statusReason: string | null
}

type StudentStatus = Student['status']

type ImportStudentRow = {
  rowNumber: number
  name: string
  nisn: string
  gender: '' | 'L' | 'P'
  status: StudentStatus
  statusReason: string
  error?: string
}

type RawSheetRow = string[]

type ImportColumnMapping = {
  nameColumn: string
  nisnColumn: string
  genderColumn: string
}

type ParsedImportFile = {
  rows: RawSheetRow[]
  headerRowIndex: number
  headers: string[]
  mapping: ImportColumnMapping
  importRows: ImportStudentRow[]
}

type Props = { classId: string; canManage: boolean }

const importColumnHint = 'Sistem membaca nama, NISN, dan L/P dari judul kolom. Kolom lain akan diabaikan.'
const importHeaderScanLimit = 100
const nameHeaderAliases = [
  'Nama Siswa',
  'Nama Lengkap',
  'Nama',
  'Name',
  'Nama Peserta Didik',
  'Peserta Didik',
  'Nama Murid',
]
const nisnHeaderAliases = [
  'NISN',
  'Nomor Induk Nasional',
  'Nomor Induk Siswa Nasional',
  'No Induk Nasional',
]
const genderHeaderAliases = [
  'L/P',
  'LP',
  'JK',
  'Jenis Kelamin',
  'Kelamin',
  'Gender',
]

const genderOptions = [
  { value: '', label: 'Tidak diisi' },
  { value: 'L', label: 'Laki-laki (L)' },
  { value: 'P', label: 'Perempuan (P)' },
]

const defaultStudentForm = {
  name: '',
  nisn: '',
  gender: '',
  status: 'AKTIF',
  statusReason: '',
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function toCellText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function getCell(row: RawSheetRow, column: string) {
  if (!column) return ''
  const columnIndex = Number(column)
  if (!Number.isInteger(columnIndex) || columnIndex < 0) return ''
  return toCellText(row[columnIndex])
}

function getExcelColumnName(index: number) {
  let dividend = index + 1
  let columnName = ''

  while (dividend > 0) {
    const modulo = (dividend - 1) % 26
    columnName = String.fromCharCode(65 + modulo) + columnName
    dividend = Math.floor((dividend - modulo) / 26)
  }

  return columnName
}

function detectColumn(headers: string[], aliases: string[], kind: 'name' | 'nisn' | 'gender') {
  const normalizedAliases = aliases.map(normalizeHeader)
  const normalizedHeaders = headers.map(normalizeHeader)

  const exactIndex = normalizedHeaders.findIndex((header) => normalizedAliases.includes(header))
  if (exactIndex >= 0) return exactIndex

  return normalizedHeaders.findIndex((header) => {
    if (normalizedAliases.some((alias) => header.includes(alias))) return true
    if (kind === 'name') {
      return header.includes('nama') && !/(ayah|ibu|ortu|orangtua|wali)/.test(header)
    }
    if (kind === 'nisn') {
      return header.includes('nisn') || header.includes('nasional')
    }
    return header === 'lp' || header === 'jk' || header.includes('jeniskelamin') || header.includes('gender')
  })
}

function getHeadersForRow(rows: RawSheetRow[], headerRowIndex: number) {
  const headerRow = rows[headerRowIndex] || []
  const nearbyRows = rows.slice(headerRowIndex, headerRowIndex + 8)
  const maxColumns = Math.max(
    headerRow.length,
    ...nearbyRows.map((row) => row.length),
    1
  )

  return Array.from({ length: maxColumns }, (_, index) => {
    return toCellText(headerRow[index]) || `Kolom ${getExcelColumnName(index)}`
  })
}

function detectHeaderRowIndex(rows: RawSheetRow[]) {
  let fallbackIndex = 0
  let bestIndex = 0
  let bestScore = -1

  rows.slice(0, importHeaderScanLimit).forEach((row, index) => {
    const nonEmptyCells = row.map(toCellText).filter(Boolean)
    if (nonEmptyCells.length >= 2 && fallbackIndex === 0) fallbackIndex = index

    const headers = getHeadersForRow(rows, index)
    const hasNameColumn = detectColumn(headers, nameHeaderAliases, 'name') >= 0
    const hasNisnColumn = detectColumn(headers, nisnHeaderAliases, 'nisn') >= 0
    const hasGenderColumn = detectColumn(headers, genderHeaderAliases, 'gender') >= 0
    const score = (hasNameColumn ? 10 : 0) + (hasNisnColumn ? 4 : 0)
      + (hasGenderColumn ? 2 : 0) + Math.min(nonEmptyCells.length, 6)

    if (score > bestScore) {
      bestIndex = index
      bestScore = score
    }
  })

  return bestScore > 6 ? bestIndex : fallbackIndex
}

function buildDetectedMapping(headers: string[]): ImportColumnMapping {
  const nameColumn = detectColumn(headers, nameHeaderAliases, 'name')
  const nisnColumn = detectColumn(headers, nisnHeaderAliases, 'nisn')
  const genderColumn = detectColumn(headers, genderHeaderAliases, 'gender')

  return {
    nameColumn: nameColumn >= 0 ? String(nameColumn) : '',
    nisnColumn: nisnColumn >= 0 ? String(nisnColumn) : '',
    genderColumn: genderColumn >= 0 ? String(genderColumn) : '',
  }
}

function normalizeGender(value: string) {
  const normalized = normalizeHeader(value)
  if (!normalized) return ''
  if (['l', 'lk', 'lakilaki', 'laki', 'pria', 'putra'].includes(normalized)) return 'L'
  if (['p', 'pr', 'perempuan', 'wanita', 'putri'].includes(normalized)) return 'P'
  return ''
}

function normalizeImportRow(row: RawSheetRow, rowNumber: number, mapping: ImportColumnMapping): ImportStudentRow | null {
  const name = getCell(row, mapping.nameColumn)
  const nisn = getCell(row, mapping.nisnColumn)
  const rawGender = getCell(row, mapping.genderColumn)
  const gender = normalizeGender(rawGender)

  if (!name && !nisn && !rawGender) return null

  const rowErrors: string[] = []
  if (name.length < 2) rowErrors.push('Nama minimal 2 karakter')
  if (!nisn) rowErrors.push('NISN wajib diisi')
  if (rawGender && !gender) rowErrors.push('Jenis kelamin harus L atau P')

  return {
    rowNumber,
    name,
    nisn,
    gender,
    status: 'AKTIF',
    statusReason: '',
    error: rowErrors.join(', ') || undefined,
  }
}

function normalizeImportRows(rows: RawSheetRow[], headerRowIndex: number, mapping: ImportColumnMapping) {
  return rows
    .slice(headerRowIndex + 1)
    .map((row, index) => normalizeImportRow(row, headerRowIndex + index + 2, mapping))
    .filter((row): row is ImportStudentRow => Boolean(row))
}

async function parseStudentImportFile(file: File): Promise<ParsedImportFile> {
  const XLSX = await import('xlsx')
  const isCsv = /\.csv$/i.test(file.name)
  const source = isCsv ? await file.text() : await file.arrayBuffer()
  const workbook = XLSX.read(source, { type: isCsv ? 'string' : 'array' })
  const firstSheetName = workbook.SheetNames[0]

  if (!firstSheetName) {
    throw new Error('Sheet pertama tidak ditemukan')
  }

  const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheetName], {
    header: 1,
    defval: '',
    raw: false,
    blankrows: false,
  })
  const rows = sheetRows.map((row) => Array.isArray(row) ? row.map(toCellText) : [])
  const headerRowIndex = detectHeaderRowIndex(rows)
  const headers = getHeadersForRow(rows, headerRowIndex)
  const mapping = buildDetectedMapping(headers)

  return {
    rows,
    headerRowIndex,
    headers,
    mapping,
    importRows: normalizeImportRows(rows, headerRowIndex, mapping),
  }
}

export function StudentManagement({ classId, canManage }: Props) {
  const { addToast } = useToast()
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('aktif')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editTarget, setEditTarget] = useState<Student | null>(null)
  const [statusTarget, setStatusTarget] = useState<Student | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [form, setForm] = useState(defaultStudentForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importRows, setImportRows] = useState<ImportStudentRow[]>([])
  const [importFileName, setImportFileName] = useState('')
  const [importError, setImportError] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importSheetRows, setImportSheetRows] = useState<RawSheetRow[]>([])
  const [importHeaderRowIndex, setImportHeaderRowIndex] = useState(0)
  const [importHeaders, setImportHeaders] = useState<string[]>([])
  const [importMapping, setImportMapping] = useState<ImportColumnMapping>({
    nameColumn: '',
    nisnColumn: '',
    genderColumn: '',
  })

  useEffect(() => {
    const controller = new AbortController()
    fetchStudents(controller.signal)

    return () => controller.abort()
  }, [classId])

  async function fetchStudents(signal?: AbortSignal) {
    try {
      const res = await fetch(`/api/classes/${classId}/students`, { signal })
      const data = await res.json()
      if (!signal?.aborted && data.students) setStudents(data.students)
    } catch {
      if (!signal?.aborted) addToast('error', 'Gagal memuat')
    } finally {
      if (!signal?.aborted) setIsLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    if (!form.name || form.name.length < 2) { setErrors({ name: 'Nama minimal 2 karakter' }); return }
    if (!form.nisn.trim()) { setErrors({ nisn: 'NISN wajib diisi' }); return }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/classes/${classId}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          nisn: form.nisn || null,
          gender: form.gender || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { addToast('error', data.error || 'Gagal'); return }
      addToast('success', 'Siswa ditambahkan')
      setIsModalOpen(false)
      setForm(defaultStudentForm)
      fetchStudents()
    } catch { addToast('error', 'Koneksi gagal')
    } finally { setIsSubmitting(false) }
  }

  function closeImportModal() {
    setIsImportModalOpen(false)
    setImportRows([])
    setImportFileName('')
    setImportError('')
    setImportSheetRows([])
    setImportHeaderRowIndex(0)
    setImportHeaders([])
    setImportMapping({ nameColumn: '', nisnColumn: '', genderColumn: '' })
  }

  function applyImportSettings(rows: RawSheetRow[], headerRowIndex: number, mapping?: ImportColumnMapping) {
    const headers = getHeadersForRow(rows, headerRowIndex)
    const nextMapping = mapping || buildDetectedMapping(headers)

    setImportSheetRows(rows)
    setImportHeaderRowIndex(headerRowIndex)
    setImportHeaders(headers)
    setImportMapping(nextMapping)
    setImportRows(normalizeImportRows(rows, headerRowIndex, nextMapping))
  }

  function handleHeaderRowChange(value: string) {
    const headerRowIndex = Number(value)
    if (!Number.isInteger(headerRowIndex)) return
    applyImportSettings(importSheetRows, headerRowIndex)
  }

  function handleMappingChange(key: keyof ImportColumnMapping, value: string) {
    const nextMapping = { ...importMapping, [key]: value }
    applyImportSettings(importSheetRows, importHeaderRowIndex, nextMapping)
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setImportFileName(file.name)
    setImportRows([])
    setImportError('')
    setImportSheetRows([])
    setImportHeaderRowIndex(0)
    setImportHeaders([])
    setImportMapping({ nameColumn: '', nisnColumn: '', genderColumn: '' })

    try {
      const parsed = await parseStudentImportFile(file)
      if (parsed.rows.length === 0) {
        setImportError('Tidak ada baris yang bisa dibaca dari file.')
        return
      }

      setImportSheetRows(parsed.rows)
      setImportHeaderRowIndex(parsed.headerRowIndex)
      setImportHeaders(parsed.headers)
      setImportMapping(parsed.mapping)
      setImportRows(parsed.importRows)
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'File tidak bisa dibaca')
    }
  }

  async function handleDownloadTemplate() {
    try {
      const XLSX = await import('xlsx')
      const worksheet = XLSX.utils.aoa_to_sheet([
        ['Nama Siswa', 'NISN', 'L/P'],
        ['Contoh Nama Siswa', '1234567890', 'L'],
      ])
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Siswa')
      XLSX.writeFile(workbook, 'template-import-siswa.xlsx')
    } catch {
      addToast('error', 'Template gagal dibuat')
    }
  }

  async function handleImportSubmit() {
    if (!importMapping.nameColumn) {
      addToast('error', 'Pilih kolom nama siswa terlebih dahulu')
      return
    }

    if (!importMapping.nisnColumn) {
      addToast('error', 'Pilih kolom NISN terlebih dahulu')
      return
    }

    const invalidRows = importRows.filter((row) => row.error)
    if (invalidRows.length > 0) {
      addToast('error', 'Perbaiki baris yang error sebelum import')
      return
    }

    if (importRows.length === 0) {
      addToast('error', 'Pilih file terlebih dahulu')
      return
    }

    if (importRows.length > 500) {
      addToast('error', 'Maksimal 500 siswa per import')
      return
    }

    setIsImporting(true)
    try {
      const res = await fetch(`/api/classes/${classId}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          students: importRows.map((row) => ({
            name: row.name,
            nisn: row.nisn || null,
            gender: row.gender || null,
            status: row.status,
            statusReason: row.statusReason || null,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) { addToast('error', data.error || 'Gagal import'); return }
      addToast('success', `${data.count || importRows.length} siswa berhasil diimport`)
      closeImportModal()
      fetchStudents()
    } catch { addToast('error', 'Koneksi gagal')
    } finally { setIsImporting(false) }
  }

  function openAddModal() {
    setErrors({})
    setForm(defaultStudentForm)
    setIsModalOpen(true)
  }

  function openEditModal(student: Student) {
    setErrors({})
    setForm({
      name: student.name,
      nisn: student.nisn || '',
      gender: student.gender || '',
      status: student.status,
      statusReason: student.statusReason || '',
    })
    setEditTarget(student)
  }

  async function handleSaveStudentDetails() {
    setErrors({})
    if (!form.name || form.name.length < 2) { setErrors({ name: 'Nama minimal 2 karakter' }); return }
    if (!form.nisn.trim()) { setErrors({ nisn: 'NISN wajib diisi' }); return }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/students/${editTarget?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          nisn: form.nisn || null,
          gender: form.gender || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { addToast('error', data.error || 'Gagal menyimpan data siswa'); return }
      addToast('success', 'Data siswa diupdate')
      setEditTarget(null)
      setForm(defaultStudentForm)
      fetchStudents()
    } catch { addToast('error', 'Koneksi gagal')
    } finally { setIsSubmitting(false) }
  }

  async function handleUpdateStatus(student: Student) {
    setForm({
      name: student.name,
      nisn: student.nisn || '',
      gender: student.gender || '',
      status: student.status,
      statusReason: student.statusReason || '',
    })
    setStatusTarget(student)
  }

  async function handleSaveStatus() {
    setErrors({})
    if (form.status === 'BEBAS_KAS' && !form.statusReason) { setErrors({ statusReason: 'Alasan wajib diisi' }); return }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/students/${statusTarget?.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: form.status, statusReason: form.status === 'BEBAS_KAS' ? form.statusReason : null }),
      })
      const data = await res.json()
      if (!res.ok) { addToast('error', data.error || 'Gagal'); return }
      addToast('success', 'Status diupdate')
      setStatusTarget(null)
      fetchStudents()
    } catch { addToast('error', 'Koneksi gagal')
    } finally { setIsSubmitting(false) }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/students/${deleteTarget?.id}`, { method: 'DELETE' })
      if (!res.ok) { addToast('error', 'Gagal'); return }
      addToast('success', 'Siswa dihapus')
      setDeleteTarget(null)
      fetchStudents()
    } catch { addToast('error', 'Koneksi gagal')
    } finally { setIsDeleting(false) }
  }

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />

  const aktif = students.filter(s => s.status === 'AKTIF')
  const bebasKas = students.filter(s => s.status === 'BEBAS_KAS')
  const pindah = students.filter(s => s.status === 'PINDAH')

  const tabs = [
    { id: 'aktif', label: `Aktif (${aktif.length})` },
    { id: 'bebas_kas', label: `Bebas Kas (${bebasKas.length})` },
    { id: 'pindah', label: `Pindah (${pindah.length})` },
  ]

  const displayed = activeTab === 'aktif' ? aktif : activeTab === 'bebas_kas' ? bebasKas : pindah
  const invalidImportCount = importRows.filter((row) => row.error).length
  const validImportCount = importRows.length - invalidImportCount
  const canSubmitImport = Boolean(importMapping.nameColumn) && Boolean(importMapping.nisnColumn)
    && importRows.length > 0 && invalidImportCount === 0 && importRows.length <= 500
  const headerRowOptions = importSheetRows
    .slice(0, importHeaderScanLimit)
    .map((row, index) => ({
      value: String(index),
      label: `Baris ${index + 1}`,
    }))
  const columnOptions = importHeaders.map((header, index) => ({
    value: String(index),
    label: `Kolom ${getExcelColumnName(index)} - ${header}`,
  }))
  const detectedHeaderSummary = importHeaders
    .filter((header) => !/^Kolom [A-Z]+$/.test(header))
    .slice(0, 8)
    .join(', ')

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-blue-bg text-brand-blue-info">
            <Icon name="users" size={18} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-brand-ink font-serif">Data Siswa</h2>
            <p className="text-sm text-neutral-500">Total: {students.length} siswa</p>
          </div>
        </div>
        {canManage && (
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsImportModalOpen(true)} leftIcon={<Icon name="book" size={16} />}>Import Excel</Button>
            <Button onClick={openAddModal} leftIcon={<Icon name="users" size={16} />}>Tambah Siswa</Button>
          </div>
        )}
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <TabPanel isActive={true}>
        {displayed.length === 0 ? (
          <EmptyState
            title="Tidak ada data"
            description={`Belum ada siswa ${activeTab === 'aktif' ? 'aktif' : activeTab === 'bebas_kas' ? 'bebas kas' : 'pindah'}`}
            action={canManage ? { label: '+ Tambah Siswa', onClick: openAddModal } : undefined}
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full">
              <thead className="bg-brand-cream border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Nama</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">NISN</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">L/P</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Status</th>
                  {canManage && <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {displayed.map((s, i) => (
                  <tr key={s.id} className="hover:bg-brand-cream/50">
                    <td className="px-4 py-3 text-sm text-neutral-500">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-brand-ink">{s.name}</td>
                    <td className="px-4 py-3 text-neutral-500">{formatEmptyValue(s.nisn, 'table')}</td>
                    <td className="px-4 py-3 text-neutral-500">{formatEmptyValue(s.gender, 'table')}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={s.status} size="sm" />
                      {s.statusReason && <p className="text-xs text-neutral-400 mt-1">{s.statusReason}</p>}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(s)}>Edit</Button>
                          <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(s)}>Status</Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(s)} className="text-danger hover:bg-danger-bg">Hapus</Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </TabPanel>

      {/* Add Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tambah Siswa">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nama Lengkap" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} error={errors.name} placeholder="Nama siswa" />
          <Input label="NISN" value={form.nisn} onChange={(e) => setForm(f => ({ ...f, nisn: e.target.value }))} error={errors.nisn} placeholder="NISN" required />
          <Select
            label="Jenis Kelamin"
            value={form.gender}
            onChange={(e) => setForm(f => ({ ...f, gender: e.target.value }))}
            options={genderOptions}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" isLoading={isSubmitting}>Simpan</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editTarget && canManage} onClose={() => setEditTarget(null)} title={`Edit Siswa - ${editTarget?.name || ''}`}>
        <form onSubmit={(e) => { e.preventDefault(); handleSaveStudentDetails() }} className="space-y-4">
          <Input label="Nama Lengkap" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} error={errors.name} placeholder="Nama siswa" />
          <Input label="NISN" value={form.nisn} onChange={(e) => setForm(f => ({ ...f, nisn: e.target.value }))} error={errors.nisn} placeholder="NISN" required />
          <Select
            label="Jenis Kelamin"
            value={form.gender}
            onChange={(e) => setForm(f => ({ ...f, gender: e.target.value }))}
            options={genderOptions}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setEditTarget(null)}>Batal</Button>
            <Button type="submit" isLoading={isSubmitting}>Simpan</Button>
          </div>
        </form>
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={isImportModalOpen} onClose={closeImportModal} title="Import Data Siswa" size="xl">
        <div className="space-y-4">
          <Input
            label="File Excel"
            type="file"
            accept=".xlsx,.xls,.csv"
            hint={`${importColumnHint} File CSV juga didukung.`}
            onChange={handleImportFile}
          />

          <Button variant="outline" type="button" onClick={handleDownloadTemplate} leftIcon={<Icon name="book" size={16} />}>
            Download Template Excel
          </Button>

          {importFileName && (
            <p className="text-sm text-neutral-500">
              File: <span className="font-medium text-brand-ink">{importFileName}</span>
            </p>
          )}

          {importError && (
            <div className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm font-medium text-danger">
              {importError}
            </div>
          )}

          {importSheetRows.length > 0 && (
            <div className="space-y-3 rounded-lg border border-neutral-200 bg-brand-cream/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-brand-ink">Pembacaan Excel</p>
                <span className="rounded-full bg-success-bg px-2.5 py-1 text-xs font-semibold text-success">
                  Otomatis
                </span>
              </div>
              {detectedHeaderSummary && (
                <p className="text-sm text-neutral-500">
                  Baris judul terbaca: {detectedHeaderSummary}
                </p>
              )}
              <div className="grid gap-3 md:grid-cols-4">
                <Select
                  label="Baris Judul Tabel"
                  value={String(importHeaderRowIndex)}
                  onChange={(event) => handleHeaderRowChange(event.target.value)}
                  options={headerRowOptions}
                />
                <Select
                  label="Nama Siswa"
                  value={importMapping.nameColumn}
                  onChange={(event) => handleMappingChange('nameColumn', event.target.value)}
                  options={columnOptions}
                  placeholder="Pilih kolom nama"
                  error={!importMapping.nameColumn ? 'Wajib dipilih' : undefined}
                />
                <Select
                  label="NISN"
                  value={importMapping.nisnColumn}
                  onChange={(event) => handleMappingChange('nisnColumn', event.target.value)}
                  options={[{ value: '', label: 'Tidak ada / abaikan' }, ...columnOptions]}
                  error={!importMapping.nisnColumn ? 'Wajib dipilih' : undefined}
                />
                <Select
                  label="L/P"
                  value={importMapping.genderColumn}
                  onChange={(event) => handleMappingChange('genderColumn', event.target.value)}
                  options={[{ value: '', label: 'Tidak ada / abaikan' }, ...columnOptions]}
                />
              </div>
            </div>
          )}

          {importRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-neutral-500">
                  Preview {validImportCount} siswa siap diimport
                  {invalidImportCount > 0 && `, ${invalidImportCount} baris perlu diperbaiki`}
                </p>
                {importRows.length > 500 && (
                  <p className="text-sm font-medium text-danger">Maksimal 500 siswa per import</p>
                )}
              </div>

              <div className="max-h-80 overflow-auto rounded-lg border border-neutral-200">
                <table className="w-full min-w-[620px]">
                  <thead className="sticky top-0 bg-brand-cream">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-neutral-500">Baris</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-neutral-500">Nama</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-neutral-500">NISN</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-neutral-500">L/P</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-neutral-500">Validasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {importRows.map((row) => (
                      <tr key={row.rowNumber} className={row.error ? 'bg-red-50' : 'bg-white'}>
                        <td className="px-3 py-2 text-sm text-neutral-500">{row.rowNumber}</td>
                        <td className="px-3 py-2 text-sm font-medium text-brand-ink">{formatEmptyValue(row.name, 'table')}</td>
                        <td className="px-3 py-2 text-sm text-neutral-500">{formatEmptyValue(row.nisn, 'table')}</td>
                        <td className="px-3 py-2 text-sm text-neutral-500">{formatEmptyValue(row.gender, 'table')}</td>
                        <td className="px-3 py-2 text-sm">
                          {row.error ? (
                            <span className="font-medium text-danger">{row.error}</span>
                          ) : (
                            <span className="font-medium text-success">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={closeImportModal}>Batal</Button>
            <Button type="button" onClick={handleImportSubmit} isLoading={isImporting} disabled={!canSubmitImport}>
              {validImportCount ? `Import ${validImportCount} Siswa` : 'Import Siswa'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Status Modal */}
      <Modal isOpen={!!statusTarget && canManage} onClose={() => setStatusTarget(null)} title={`Ubah Status - ${statusTarget?.name}`} size="sm">
        <form onSubmit={(e) => { e.preventDefault(); handleSaveStatus() }} className="space-y-4">
          <Select label="Status" value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value as any }))}
            options={[{ value: 'AKTIF', label: 'Aktif' }, { value: 'BEBAS_KAS', label: 'Bebas Kas' }, { value: 'PINDAH', label: 'Pindah' }]} />
          {form.status === 'BEBAS_KAS' && (
            <Input label="Alasan" value={form.statusReason} onChange={(e) => setForm(f => ({ ...f, statusReason: e.target.value }))} error={errors.statusReason} placeholder="Alasan bebas kas" />
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setStatusTarget(null)}>Batal</Button>
            <Button type="submit" isLoading={isSubmitting}>Simpan</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog isOpen={!!deleteTarget && canManage} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Hapus Siswa" message={`Yakin menghapus "${deleteTarget?.name}"?`} variant="danger" isLoading={isDeleting} />
    </div>
  )
}
