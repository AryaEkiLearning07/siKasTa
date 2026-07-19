'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/ui/Icon'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { TabPanel, Tabs } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { getCurrentDateString } from '@/lib/academic'

type Student = {
  id: string
  name: string
  nisn: string | null
  status: string
}

type AssignmentDetail = {
  assignment: {
    id: string
    classId: string
    subjectId: string
    class: {
      id: string
      name: string
      tingkat: string
      tahunAjaran: string
    }
    subject: {
      id: string
      name: string
    }
  }
  students: Student[]
  attendanceSessions: {
    id: string
    date: string
    meetingNumber: number
    isLocked: boolean
    _count: { records: number }
  }[]
  assessments: {
    id: string
    title: string
    type: string
    semester: string
    assessmentDate: string
    _count: { records: number }
  }[]
}

type AttendanceStatus = 'H' | 'I' | 'S' | 'A'

type AttendanceRecord = {
  studentId: string
  studentName: string
  nisn: string | null
  status: AttendanceStatus
  note: string
}

type GradeRecord = {
  studentId: string
  studentName: string
  nisn: string | null
  score: string
  note: string
}

const attendanceStatusOptions: { value: AttendanceStatus; label: string }[] = [
  { value: 'H', label: 'H' },
  { value: 'I', label: 'I' },
  { value: 'S', label: 'S' },
  { value: 'A', label: 'A' },
]

const assessmentTypeOptions = [
  { value: 'TUGAS', label: 'Tugas' },
  { value: 'UH', label: 'UH' },
  { value: 'UTS', label: 'UTS' },
  { value: 'UAS', label: 'UAS' },
  { value: 'PRAKTIK', label: 'Praktik' },
  { value: 'SIKAP', label: 'Sikap' },
  { value: 'LAINNYA', label: 'Lainnya' },
]

const semesterOptions = [
  { value: 'Ganjil', label: 'Ganjil' },
  { value: 'Genap', label: 'Genap' },
]

export default function GuruMapelDetailPage() {
  const params = useParams()
  const assignmentId = params.assignmentId as string
  const { addToast } = useToast()
  const today = useMemo(() => getCurrentDateString(), [])
  const [detail, setDetail] = useState<AssignmentDetail | null>(null)
  const [activeTab, setActiveTab] = useState('absensi')
  const [isLoading, setIsLoading] = useState(true)
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false)
  const [isSavingAttendance, setIsSavingAttendance] = useState(false)
  const [attendanceDate, setAttendanceDate] = useState(today)
  const [meetingNumber, setMeetingNumber] = useState(1)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [canEditAttendance, setCanEditAttendance] = useState(false)
  const [isSavingGrades, setIsSavingGrades] = useState(false)
  const [gradeForm, setGradeForm] = useState({
    title: '',
    type: 'TUGAS',
    semester: 'Ganjil',
    assessmentDate: today,
  })
  const [gradeRecords, setGradeRecords] = useState<GradeRecord[]>([])
  const [exportRange, setExportRange] = useState({ from: '', to: '', semester: 'Ganjil' })

  useEffect(() => {
    const controller = new AbortController()
    fetchDetail(controller.signal)
    return () => controller.abort()
  }, [assignmentId])

  useEffect(() => {
    if (!detail) return
    const controller = new AbortController()
    fetchAttendance(controller.signal)
    return () => controller.abort()
  }, [detail, attendanceDate, meetingNumber])

  useEffect(() => {
    if (!detail) return
    setGradeRecords(detail.students.map((student) => ({
      studentId: student.id,
      studentName: student.name,
      nisn: student.nisn,
      score: '',
      note: '',
    })))
  }, [detail])

  async function fetchDetail(signal?: AbortSignal) {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/guru-mapel/assignments/${assignmentId}`, {
        signal,
        cache: 'no-store',
      })
      const data = await res.json()
      if (signal?.aborted) return

      if (!res.ok) {
        addToast('error', data.error || 'Gagal memuat kelas')
        return
      }

      setDetail(data)
    } catch {
      if (!signal?.aborted) addToast('error', 'Gagal memuat kelas')
    } finally {
      if (!signal?.aborted) setIsLoading(false)
    }
  }

  async function fetchAttendance(signal?: AbortSignal) {
    setIsAttendanceLoading(true)
    try {
      const params = new URLSearchParams({
        date: attendanceDate,
        meetingNumber: String(meetingNumber),
      })
      const res = await fetch(`/api/guru-mapel/assignments/${assignmentId}/attendance?${params.toString()}`, {
        signal,
        cache: 'no-store',
      })
      const data = await res.json()
      if (signal?.aborted) return

      if (!res.ok) {
        addToast('error', data.error || 'Gagal memuat absensi')
        return
      }

      setAttendanceRecords(data.records || [])
      setCanEditAttendance(Boolean(data.canEdit))
    } catch {
      if (!signal?.aborted) addToast('error', 'Gagal memuat absensi')
    } finally {
      if (!signal?.aborted) setIsAttendanceLoading(false)
    }
  }

  async function saveAttendance() {
    setIsSavingAttendance(true)
    try {
      const res = await fetch(`/api/guru-mapel/assignments/${assignmentId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          date: attendanceDate,
          meetingNumber,
          records: attendanceRecords.map((record) => ({
            studentId: record.studentId,
            status: record.status,
            note: record.note,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        addToast('error', data.error || 'Gagal menyimpan absensi')
        return
      }

      addToast('success', 'Absensi berhasil disimpan')
      fetchDetail()
      fetchAttendance()
    } catch {
      addToast('error', 'Gagal menyimpan absensi')
    } finally {
      setIsSavingAttendance(false)
    }
  }

  async function saveGrades() {
    if (!gradeForm.title.trim()) {
      addToast('error', 'Nama penilaian wajib diisi')
      return
    }

    setIsSavingGrades(true)
    try {
      const res = await fetch(`/api/guru-mapel/assignments/${assignmentId}/grades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          ...gradeForm,
          records: gradeRecords.map((record) => ({
            studentId: record.studentId,
            score: record.score === '' ? null : Number(record.score),
            note: record.note,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        addToast('error', data.error || 'Gagal menyimpan nilai')
        return
      }

      addToast('success', 'Nilai berhasil disimpan')
      setGradeForm((current) => ({ ...current, title: '' }))
      setGradeRecords((current) => current.map((record) => ({ ...record, score: '', note: '' })))
      fetchDetail()
    } catch {
      addToast('error', 'Gagal menyimpan nilai')
    } finally {
      setIsSavingGrades(false)
    }
  }

  function updateAttendanceRecord(studentId: string, patch: Partial<AttendanceRecord>) {
    setAttendanceRecords((current) => current.map((record) => (
      record.studentId === studentId ? { ...record, ...patch } : record
    )))
  }

  function updateGradeRecord(studentId: string, patch: Partial<GradeRecord>) {
    setGradeRecords((current) => current.map((record) => (
      record.studentId === studentId ? { ...record, ...patch } : record
    )))
  }

  function downloadAttendance() {
    const params = new URLSearchParams()
    if (exportRange.from) params.set('from', exportRange.from)
    if (exportRange.to) params.set('to', exportRange.to)
    window.location.href = `/api/guru-mapel/assignments/${assignmentId}/attendance/export${params.toString() ? `?${params.toString()}` : ''}`
  }

  function downloadGrades() {
    const params = new URLSearchParams()
    if (exportRange.semester) params.set('semester', exportRange.semester)
    window.location.href = `/api/guru-mapel/assignments/${assignmentId}/grades/export${params.toString() ? `?${params.toString()}` : ''}`
  }

  if (isLoading || !detail) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }

  const tabs = [
    { id: 'absensi', label: 'Absensi' },
    { id: 'penilaian', label: 'Penilaian' },
    { id: 'rekap', label: 'Rekap' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-brand-ink">
            {detail.assignment.subject.name} - Kelas {detail.assignment.class.name}
          </h1>
          <p className="mt-1 text-neutral-500">{detail.assignment.class.tahunAjaran}</p>
        </div>
      </div>

      <Card>
        <CardContent>
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} idPrefix="guru-mapel-tabs" />

          <TabPanel isActive={activeTab === 'absensi'} tabId="absensi" idPrefix="guru-mapel-tabs">
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[220px_160px_auto] md:items-end">
                <Input
                  type="date"
                  label="Tanggal"
                  value={attendanceDate}
                  onChange={(event) => setAttendanceDate(event.target.value)}
                />
                <Input
                  type="number"
                  label="Pertemuan"
                  min={1}
                  max={12}
                  value={meetingNumber}
                  onChange={(event) => setMeetingNumber(Number(event.target.value) || 1)}
                />
                <div className="text-sm font-medium text-neutral-500">
                  {canEditAttendance ? 'Bisa diedit' : 'Read-only'}
                </div>
              </div>

              {isAttendanceLoading ? (
                <Skeleton className="h-64 w-full rounded-xl" />
              ) : attendanceRecords.length === 0 ? (
                <EmptyState title="Belum Ada Siswa" description="Belum ada siswa aktif di kelas ini." />
              ) : (
                <div className="overflow-x-auto rounded-lg border border-neutral-200">
                  <table className="w-full min-w-[760px] table-fixed bg-white">
                    <colgroup>
                      <col className="w-[44px]" />
                      <col className="w-[44%]" />
                      <col className="w-[30%]" />
                      <col className="w-[26%]" />
                    </colgroup>
                    <thead className="bg-brand-cream">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium uppercase text-neutral-500">No</th>
                        <th className="px-3 py-3 text-left text-xs font-medium uppercase text-neutral-500">Nama</th>
                        <th className="px-3 py-3 text-left text-xs font-medium uppercase text-neutral-500">Status</th>
                        <th className="px-3 py-3 text-left text-xs font-medium uppercase text-neutral-500">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {attendanceRecords.map((record, index) => (
                        <tr key={record.studentId}>
                          <td className="px-3 py-3 text-sm text-neutral-500">{index + 1}</td>
                          <td className="px-3 py-3">
                            <p className="text-sm font-semibold text-brand-ink">{record.studentName}</p>
                            <p className="mt-0.5 text-xs text-neutral-500">
                              NISN: {record.nisn || '-'}
                            </p>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex gap-1">
                              {attendanceStatusOptions.map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  disabled={!canEditAttendance}
                                  onClick={() => updateAttendanceRecord(record.studentId, { status: option.value })}
                                  className={`h-8 w-8 rounded-md border text-sm font-bold transition-colors disabled:cursor-not-allowed ${
                                    record.status === option.value
                                      ? 'border-brand-green bg-brand-green text-white'
                                      : 'border-neutral-200 bg-white text-neutral-600 hover:border-brand-green'
                                  }`}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <Input
                              value={record.note}
                              onChange={(event) => updateAttendanceRecord(record.studentId, { note: event.target.value })}
                              disabled={!canEditAttendance}
                              placeholder="-"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={saveAttendance}
                  isLoading={isSavingAttendance}
                  disabled={!canEditAttendance || attendanceRecords.length === 0}
                  leftIcon={<Icon name="calendar-check" size={16} />}
                >
                  Simpan Absensi
                </Button>
              </div>
            </div>
          </TabPanel>

          <TabPanel isActive={activeTab === 'penilaian'} tabId="penilaian" idPrefix="guru-mapel-tabs">
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-4">
                <Input
                  label="Nama Penilaian"
                  value={gradeForm.title}
                  onChange={(event) => setGradeForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="UH 1"
                />
                <Select
                  label="Jenis"
                  value={gradeForm.type}
                  onChange={(event) => setGradeForm((current) => ({ ...current, type: event.target.value }))}
                  options={assessmentTypeOptions}
                />
                <Select
                  label="Semester"
                  value={gradeForm.semester}
                  onChange={(event) => setGradeForm((current) => ({ ...current, semester: event.target.value }))}
                  options={semesterOptions}
                />
                <Input
                  type="date"
                  label="Tanggal"
                  value={gradeForm.assessmentDate}
                  onChange={(event) => setGradeForm((current) => ({ ...current, assessmentDate: event.target.value }))}
                />
              </div>

              <div className="overflow-x-auto rounded-lg border border-neutral-200">
                <table className="w-full min-w-[720px] table-fixed bg-white">
                  <colgroup>
                    <col className="w-[44px]" />
                    <col className="w-[40%]" />
                    <col className="w-[18%]" />
                    <col className="w-[18%]" />
                    <col className="w-[24%]" />
                  </colgroup>
                  <thead className="bg-brand-cream">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium uppercase text-neutral-500">No</th>
                      <th className="px-3 py-3 text-left text-xs font-medium uppercase text-neutral-500">Nama</th>
                      <th className="px-3 py-3 text-left text-xs font-medium uppercase text-neutral-500">NISN</th>
                      <th className="px-3 py-3 text-left text-xs font-medium uppercase text-neutral-500">Nilai</th>
                      <th className="px-3 py-3 text-left text-xs font-medium uppercase text-neutral-500">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {gradeRecords.map((record, index) => (
                      <tr key={record.studentId}>
                        <td className="px-3 py-3 text-sm text-neutral-500">{index + 1}</td>
                        <td className="px-3 py-3 text-sm font-semibold text-brand-ink">{record.studentName}</td>
                        <td className="px-3 py-3 text-sm text-neutral-600">{record.nisn || '-'}</td>
                        <td className="px-3 py-3">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={record.score}
                            onChange={(event) => updateGradeRecord(record.studentId, { score: event.target.value })}
                            placeholder="0-100"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <Input
                            value={record.note}
                            onChange={(event) => updateGradeRecord(record.studentId, { note: event.target.value })}
                            placeholder="-"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={saveGrades}
                  isLoading={isSavingGrades}
                  disabled={gradeRecords.length === 0}
                  leftIcon={<Icon name="book" size={16} />}
                >
                  Simpan Nilai
                </Button>
              </div>

              <section className="space-y-3">
                <h2 className="font-serif text-lg font-semibold text-brand-ink">Penilaian Tersimpan</h2>
                {detail.assessments.length === 0 ? (
                  <EmptyState title="Belum Ada Nilai" description="Penilaian yang disimpan akan tampil di sini." />
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {detail.assessments.map((assessment) => (
                      <div key={assessment.id} className="rounded-lg border border-neutral-200 bg-white px-4 py-3">
                        <p className="font-semibold text-brand-ink">{assessment.title}</p>
                        <p className="text-sm text-neutral-500">
                          {assessment.type} - {assessment.semester} - {assessment._count.records} nilai
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </TabPanel>

          <TabPanel isActive={activeTab === 'rekap'} tabId="rekap" idPrefix="guru-mapel-tabs">
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="space-y-4 rounded-lg border border-neutral-200 p-4">
                <div>
                  <h2 className="font-serif text-lg font-semibold text-brand-ink">Laporan Kehadiran</h2>
                  <p className="text-sm text-neutral-500">Format H, I, S, A sesuai template absensi.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    type="date"
                    label="Dari Tanggal"
                    value={exportRange.from}
                    onChange={(event) => setExportRange((current) => ({ ...current, from: event.target.value }))}
                  />
                  <Input
                    type="date"
                    label="Sampai Tanggal"
                    value={exportRange.to}
                    onChange={(event) => setExportRange((current) => ({ ...current, to: event.target.value }))}
                  />
                </div>
                <Button onClick={downloadAttendance} leftIcon={<Icon name="download" size={16} />}>
                  Download Absensi
                </Button>
              </section>

              <section className="space-y-4 rounded-lg border border-neutral-200 p-4">
                <div>
                  <h2 className="font-serif text-lg font-semibold text-brand-ink">Rekap Nilai</h2>
                  <p className="text-sm text-neutral-500">Rekap nilai per semester dalam format Excel.</p>
                </div>
                <Select
                  label="Semester"
                  value={exportRange.semester}
                  onChange={(event) => setExportRange((current) => ({ ...current, semester: event.target.value }))}
                  options={semesterOptions}
                />
                <Button onClick={downloadGrades} leftIcon={<Icon name="download" size={16} />}>
                  Download Rekap Nilai
                </Button>
              </section>
            </div>
          </TabPanel>
        </CardContent>
      </Card>
    </div>
  )
}
