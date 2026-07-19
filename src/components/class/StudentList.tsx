'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusPill } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { STUDENT_STATUS } from '@/lib/roles'
import { formatEmptyValue } from '@/lib/format'

type Student = {
  id: string
  name: string
  nisn: string | null
  status: 'AKTIF' | 'BEBAS_KAS' | 'PINDAH'
  statusReason: string | null
}

type Props = { classId: string; canManage: boolean }

export function StudentList({ classId, canManage }: Props) {
  const { addToast } = useToast()
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'AKTIF' | 'BEBAS_KAS' | 'PINDAH'>('all')

  useEffect(() => { fetchStudents() }, [classId])

  async function fetchStudents() {
    try {
      const res = await fetch(`/api/classes/${classId}/students`)
      const data = await res.json()
      if (data.students) setStudents(data.students)
    } catch { addToast('error', 'Gagal memuat')
    } finally { setIsLoading(false) }
  }

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />

  const filtered = filter === 'all' ? students : students.filter(s => s.status === filter)

  return (
    <div className="space-y-4">
      <FilterTabs filter={filter} setFilter={setFilter} counts={{
        all: students.length,
        AKTIF: students.filter(s => s.status === 'AKTIF').length,
        BEBAS_KAS: students.filter(s => s.status === 'BEBAS_KAS').length,
        PINDAH: students.filter(s => s.status === 'PINDAH').length,
      }} />

      <StudentTable students={filtered} canManage={canManage} onRefresh={fetchStudents} classId={classId} />
    </div>
  )
}

function FilterTabs({ filter, setFilter, counts }: {
  filter: string
  setFilter: (f: any) => void
  counts: Record<string, number>
}) {
  const tabs = [
    { id: 'all', label: `Semua (${counts.all})` },
    { id: 'AKTIF', label: `Aktif (${counts.AKTIF})` },
    { id: 'BEBAS_KAS', label: `Bebas Kas (${counts.BEBAS_KAS})` },
    { id: 'PINDAH', label: `Pindah (${counts.PINDAH})` },
  ]

  return (
    <div className="flex gap-2 flex-wrap">
      {tabs.map(t => (
        <button key={t.id} onClick={() => setFilter(t.id)}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            filter === t.id ? 'bg-brand-green text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function StudentTable({ students, canManage, onRefresh, classId }: {
  students: Student[]
  canManage: boolean
  onRefresh: () => void
  classId: string
}) {
  const { addToast } = useToast()
  const [modal, setModal] = useState<{ type: 'add' | 'edit' | 'delete' | null; student?: Student }>({ type: null })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({ name: '', nisn: '', status: 'AKTIF', statusReason: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const url = modal.type === 'add' ? `/api/classes/${classId}/students` : `/api/students/${modal.student?.id}`
      const method = modal.type === 'add' ? 'POST' : modal.type === 'delete' ? 'DELETE' : 'PATCH'
      const body = modal.type === 'delete' ? undefined : JSON.stringify(
        modal.type === 'add' ? { name: form.name, nisn: form.nisn || null }
          : modal.type === 'edit' ? { status: form.status, statusReason: form.status === 'BEBAS_KAS' ? form.statusReason : null }
          : {}
      )
      const res = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body })
      if (!res.ok) { const d = await res.json(); addToast('error', d.error || 'Gagal'); return }
      addToast('success', modal.type === 'add' ? 'Siswa ditambahkan' : modal.type === 'delete' ? 'Siswa dihapus' : 'Status diupdate')
      setModal({ type: null })
      setForm({ name: '', nisn: '', status: 'AKTIF', statusReason: '' })
      onRefresh()
    } catch { addToast('error', 'Koneksi gagal')
    } finally { setIsSubmitting(false) }
  }

  if (students.length === 0) {
    return (
      <>
        <EmptyState
          title="Tidak ada data"
          description="Belum ada siswa"
          action={canManage ? { label: '+ Tambah Siswa', onClick: () => setModal({ type: 'add' }) } : undefined}
        />
        <StudentModal modal={modal} setModal={setModal} form={form} setForm={setForm} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </>
    )
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-brand-cream border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">No</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Nama</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">NISN</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Status</th>
              {canManage && <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {students.map((s, i) => (
              <tr key={s.id} className="hover:bg-brand-cream/50">
                <td className="px-4 py-3 text-sm text-neutral-500">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-brand-ink">{s.name}</td>
                <td className="px-4 py-3 text-neutral-500">{formatEmptyValue(s.nisn, 'table')}</td>
                <td className="px-4 py-3">
                  <StatusPill status={s.status} size="sm" />
                  {s.statusReason && <p className="text-xs text-neutral-400 mt-1">{s.statusReason}</p>}
                </td>
                {canManage && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => { setForm({ name: s.name, nisn: s.nisn || '', status: s.status, statusReason: s.statusReason || '' }); setModal({ type: 'edit', student: s }) }}>
                        Ubah
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setModal({ type: 'delete', student: s })} className="text-danger hover:bg-danger-bg">
                        Hapus
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <StudentModal modal={modal} setModal={setModal} form={form} setForm={setForm} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </>
  )
}

function StudentModal({ modal, setModal, form, setForm, onSubmit, isSubmitting }: {
  modal: { type: string | null; student?: Student }
  setModal: (m: any) => void
  form: { name: string; nisn: string; status: string; statusReason: string }
  setForm: (f: any) => void
  onSubmit: (e: React.FormEvent) => void
  isSubmitting: boolean
}) {
  const isOpen = modal.type !== null
  const title = modal.type === 'add' ? 'Tambah Siswa' : modal.type === 'edit' ? `Ubah Status - ${modal.student?.name}` : `Hapus ${modal.student?.name}?`
  const showForm = modal.type !== 'delete'

  return (
    <Modal isOpen={isOpen} onClose={() => setModal({ type: null })} title={title} size={modal.type === 'delete' ? 'sm' : 'md'}>
      {modal.type === 'delete' ? (
        <div className="space-y-4">
          <p className="text-neutral-600">Yakin menghapus "{modal.student?.name}"?</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModal({ type: null })}>Batal</Button>
            <Button variant="danger" onClick={onSubmit} isLoading={isSubmitting}>Hapus</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {modal.type === 'add' ? (
            <>
              <Input label="Nama Lengkap" value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f: typeof form) => ({ ...f, name: e.target.value }))} placeholder="Nama siswa" />
              <Input label="NISN" value={form.nisn} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f: typeof form) => ({ ...f, nisn: e.target.value }))} placeholder="NISN" required />
            </>
          ) : (
            <>
              <Select label="Status" value={form.status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm((f: typeof form) => ({ ...f, status: e.target.value }))}
                options={[{ value: 'AKTIF', label: 'Aktif' }, { value: 'BEBAS_KAS', label: 'Bebas Kas' }, { value: 'PINDAH', label: 'Pindah' }]} />
              {form.status === 'BEBAS_KAS' && (
                <Input label="Alasan" value={form.statusReason} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f: typeof form) => ({ ...f, statusReason: e.target.value }))} placeholder="Alasan bebas kas" />
              )}
            </>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setModal({ type: null })}>Batal</Button>
            <Button type="submit" isLoading={isSubmitting}>Simpan</Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
