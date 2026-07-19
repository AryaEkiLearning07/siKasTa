'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { Icon } from '@/components/ui/Icon'

type MigrationPreview = {
  fromTahunAjaran: string
  toTahunAjaran: string
  canExecuteNow: boolean
  executeWindow: string
  promotions: Array<{
    sourceName: string
    sourceTingkat: string
    targetName: string
    targetTingkat: string
    studentCount: number
    memberCount: number
  }>
  archives: Array<{
    name: string
    tingkat: string
    studentCount: number
  }>
  newGradeSevenClasses: Array<{
    name: string
    tingkat: '7'
  }>
}

export function MigrationConsole() {
  const { addToast } = useToast()
  const academicYearOptions = useMemo(() => getAcademicYearOptions(), [])
  const [fromTahunAjaran, setFromTahunAjaran] = useState(getCurrentAcademicYear())
  const [toTahunAjaran, setToTahunAjaran] = useState(getNextAcademicYear(getCurrentAcademicYear()))
  const [confirmation, setConfirmation] = useState('')
  const [preview, setPreview] = useState<MigrationPreview | null>(null)
  const [result, setResult] = useState<{ jobId: string } | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)

  const expectedConfirmation = `MIGRASI ${toTahunAjaran}`
  const canExecute = preview && confirmation === expectedConfirmation && preview.canExecuteNow

  async function handlePreview(event: React.FormEvent) {
    event.preventDefault()
    setResult(null)
    setPreview(null)
    setConfirmation('')
    setIsPreviewing(true)

    try {
      const res = await fetch('/api/admin/migrations/academic-year/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ fromTahunAjaran, toTahunAjaran }),
      })
      const data = await res.json()

      if (!res.ok) {
        addToast('error', data.error || 'Gagal membuat preview migrasi')
        return
      }

      setPreview(data.preview)
    } catch {
      addToast('error', 'Koneksi gagal')
    } finally {
      setIsPreviewing(false)
    }
  }

  async function handleExecute() {
    if (!preview) return
    setIsExecuting(true)

    try {
      const res = await fetch('/api/admin/migrations/academic-year/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ fromTahunAjaran, toTahunAjaran, confirmation }),
      })
      const data = await res.json()

      if (!res.ok) {
        addToast('error', data.error || 'Migrasi gagal')
        return
      }

      setResult({ jobId: data.jobId })
      addToast('success', 'Migrasi selesai. Semua sesi user telah dikeluarkan.')
    } catch {
      addToast('error', 'Koneksi gagal')
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-brand-ink">Migrasi Kenaikan Kelas</h1>
        <p className="mt-1 text-neutral-500">Buat kelas tahun ajaran baru, naikkan kelas 7/8, dan arsipkan kelas lama.</p>
      </div>

      <Card>
        <form onSubmit={handlePreview} className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <Select
            label="Tahun Ajaran Asal"
            value={fromTahunAjaran}
            onChange={(event) => {
              setFromTahunAjaran(event.target.value)
              setToTahunAjaran(getNextAcademicYear(event.target.value))
              setPreview(null)
              setResult(null)
            }}
            options={academicYearOptions}
          />
          <Select
            label="Tahun Ajaran Baru"
            value={toTahunAjaran}
            onChange={(event) => {
              setToTahunAjaran(event.target.value)
              setPreview(null)
              setResult(null)
            }}
            options={academicYearOptions}
          />
          <Button type="submit" isLoading={isPreviewing} loadingText="Membuat Preview">
            Buat Preview
          </Button>
        </form>
      </Card>

      {preview && (
        <Card className="space-y-5">
          <div className="flex items-start gap-3 rounded-lg border border-warning bg-warning-bg p-4 text-sm text-brand-ink">
            <Icon name="calendar-check" size={20} className="mt-0.5 text-warning" />
            <div>
              <p className="font-semibold">Migrasi hanya boleh dijalankan malam hari ({preview.executeWindow}).</p>
              <p className="mt-1 text-neutral-600">Saat berjalan, sistem masuk maintenance singkat dan semua sesi user akan logout.</p>
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="font-serif text-lg font-semibold text-brand-ink">Naik Kelas</h2>
            <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
              {preview.promotions.length === 0 ? (
                <p className="p-4 text-sm text-neutral-500">Tidak ada kelas 7/8 aktif pada tahun asal.</p>
              ) : preview.promotions.map((item) => (
                <div key={`${item.sourceName}-${item.targetName}`} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-semibold text-brand-ink">{item.sourceName} ke {item.targetName}</p>
                  <p className="text-sm text-neutral-500">{item.studentCount} siswa, {item.memberCount} akun kelas</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h2 className="font-serif text-lg font-semibold text-brand-ink">Arsip Angkatan</h2>
              <div className="rounded-lg border border-neutral-200 p-4 text-sm text-neutral-600">
                {preview.archives.length === 0
                  ? 'Tidak ada kelas 9 aktif pada tahun asal.'
                  : preview.archives.map((item) => `${item.name} (${item.studentCount} siswa)`).join(', ')}
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="font-serif text-lg font-semibold text-brand-ink">Kelas 7 Baru Kosong</h2>
              <div className="rounded-lg border border-neutral-200 p-4 text-sm text-neutral-600">
                {preview.newGradeSevenClasses.length === 0
                  ? 'Tidak ada template kelas 7 dari tahun asal.'
                  : preview.newGradeSevenClasses.map((item) => item.name).join(', ')}
              </div>
            </div>
          </section>

          <div className="space-y-3 border-t border-neutral-200 pt-5">
            <Input
              label={`Ketik "${expectedConfirmation}" untuk konfirmasi`}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={expectedConfirmation}
            />
            {!preview.canExecuteNow && (
              <p className="rounded-lg bg-warning-bg px-3 py-2 text-sm font-medium text-warning">
                Tombol eksekusi aktif hanya pada jam {preview.executeWindow}.
              </p>
            )}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="danger"
                onClick={handleExecute}
                disabled={!canExecute || isExecuting}
                isLoading={isExecuting}
                loadingText="Migrasi berjalan"
              >
                Jalankan Migrasi
              </Button>
            </div>
          </div>
        </Card>
      )}

      {result && (
        <Card className="border-success bg-success-bg">
          <p className="font-semibold text-success">Migrasi selesai.</p>
          <p className="mt-1 text-sm text-neutral-600">Job ID: {result.jobId}. Semua user perlu login ulang.</p>
        </Card>
      )}
    </div>
  )
}

function getCurrentAcademicYear() {
  const now = new Date()
  const startYear = now.getMonth() + 1 >= 7 ? now.getFullYear() : now.getFullYear() - 1
  return `${startYear}/${startYear + 1}`
}

function getNextAcademicYear(academicYear: string) {
  const startYear = Number(academicYear.split('/')[0])
  if (!Number.isFinite(startYear)) return getCurrentAcademicYear()
  return `${startYear + 1}/${startYear + 2}`
}

function getAcademicYearOptions() {
  const current = getCurrentAcademicYear()
  const startYear = Number(current.split('/')[0])

  return Array.from({ length: 7 }, (_, index) => {
    const year = startYear - 2 + index
    const value = `${year}/${year + 1}`
    return { value, label: value }
  })
}
