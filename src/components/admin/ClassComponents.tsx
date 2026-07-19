'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { AssignmentSlot } from '@/components/ui/AssignmentSlot'
import { MoneyValue } from '@/components/ui/MoneyValue'
import { Icon } from '@/components/ui/Icon'

type AccountRole = 'WALI_KELAS' | 'BENDAHARA'

export type AccountTarget = {
  classId: string
  className: string
  role: AccountRole
}

type ClassCardProps = {
  cls: {
    id: string
    name: string
    tingkat: string
    tahunAjaran: string
    kasNominal: number
    members: { id: string; name: string; username: string; role: string }[]
    _count: { students: number }
  }
  showActions?: boolean
  onDelete?: (id: string, name: string) => void
  onCreateAccount?: (target: AccountTarget) => void
}

export function ClassCard({ cls, showActions = false, onDelete, onCreateAccount }: ClassCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const waliKelas = cls.members.find((m) => m.role === 'WALI_KELAS')
  const bendahara = cls.members.find((m) => m.role === 'BENDAHARA')

  return (
    <Card className="hover:shadow-card-hover transition-shadow">
      <CardContent>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-green text-white">
              <Icon name="school" size={20} />
            </span>
            <div className="min-w-0">
              <h3 className="font-bold text-brand-ink">{cls.name}</h3>
              <p className="text-sm text-neutral-500">{cls.tingkat} - {cls.tahunAjaran}</p>
              <p className="mt-1 text-sm text-neutral-500">{cls._count.students} siswa</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            aria-expanded={isOpen}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-brand-ink"
            aria-label={isOpen ? 'Tutup detail kelas' : 'Buka detail kelas'}
          >
            <Icon name="chevron-down" size={18} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {isOpen && (
          <div className="mt-4 space-y-3 border-t border-neutral-100 pt-4 text-sm">
            <div className="flex items-center justify-between gap-3 rounded-lg bg-brand-cream px-3 py-2">
              <span className="text-neutral-500">Kas/bulan:</span>
              <MoneyValue amount={cls.kasNominal} variant="neutral" className="text-sm" />
            </div>
            <AssignmentSlot
              label="Wali Kelas"
              value={waliKelas}
              onCreate={!waliKelas && onCreateAccount ? () => onCreateAccount({ classId: cls.id, className: cls.name, role: 'WALI_KELAS' }) : undefined}
            />
            <AssignmentSlot label="Bendahara" value={bendahara} />
            {showActions && onDelete && (
              <div className="flex justify-end border-t border-neutral-100 pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(cls.id, cls.name)}
                  className="text-danger hover:bg-danger-bg"
                >
                  Hapus Kelas
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ClassesGrid({
  classes,
  showActions,
  onDelete,
  onCreateAccount,
  onCreateClass,
}: {
  classes: ClassCardProps['cls'][]
  showActions?: boolean
  onDelete?: (id: string, name: string) => void
  onCreateAccount?: (target: AccountTarget) => void
  onCreateClass?: () => void
}) {
  if (classes.length === 0) {
    return (
      <EmptyState
        title="Belum Ada Kelas"
        description="Belum ada kelas pada filter ini"
        action={onCreateClass ? { label: '+ Tambah Kelas', onClick: onCreateClass } : undefined}
      />
    )
  }

  const groupedClasses = groupClassesByLevel(classes)

  return (
    <div className="space-y-6">
      {groupedClasses.map((group) => (
        <section key={group.tingkat} className="space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
            <h2 className="font-serif text-lg font-semibold text-brand-ink">{group.label}</h2>
            <span className="text-sm text-neutral-500">{group.classes.length} kelas</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {group.classes.map((cls) => (
              <ClassCard
                key={cls.id}
                cls={cls}
                showActions={showActions}
                onDelete={onDelete}
                onCreateAccount={onCreateAccount}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function groupClassesByLevel(classes: ClassCardProps['cls'][]) {
  const sortedClasses = [...classes].sort((a, b) => {
    const levelCompare = levelOrder(a.tingkat) - levelOrder(b.tingkat)
    if (levelCompare !== 0) return levelCompare
    return a.name.localeCompare(b.name, 'id-ID', { numeric: true, sensitivity: 'base' })
  })

  const groups = new Map<string, ClassCardProps['cls'][]>()
  sortedClasses.forEach((cls) => {
    const key = ['7', '8', '9'].includes(cls.tingkat) ? cls.tingkat : 'lainnya'
    groups.set(key, [...(groups.get(key) || []), cls])
  })

  return Array.from(groups.entries()).map(([tingkat, groupClasses]) => ({
    tingkat,
    label: tingkat === 'lainnya' ? 'Kelas Lainnya' : `Kelas ${tingkat}`,
    classes: groupClasses,
  }))
}

function levelOrder(tingkat: string) {
  if (tingkat === '7') return 1
  if (tingkat === '8') return 2
  if (tingkat === '9') return 3
  return 4
}

export function ClassFormModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  formData,
  setFormData,
  errors,
  mode = 'create'
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  isSubmitting: boolean
  formData: { name: string; tingkat: string; tahunAjaran: string }
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>
  errors: Record<string, string>
  mode?: 'create' | 'waliKelas'
}) {
  const tingkatOptions = [
    { value: '7', label: 'Kelas 7' },
    { value: '8', label: 'Kelas 8' },
    { value: '9', label: 'Kelas 9' },
  ]
  const tahunAjaranOptions = getAcademicYearFormOptions()

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === 'create' ? 'Tambah Kelas' : 'Undang Wali Kelas'}>
      <form onSubmit={onSubmit} className="space-y-4">
        {mode === 'create' && (
          <>
            <Input label="Nama Kelas" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} error={errors.name} placeholder="Contoh: 7A" />
            <Select label="Tingkat" value={formData.tingkat} onChange={(e) => setFormData(p => ({ ...p, tingkat: e.target.value }))} options={tingkatOptions} placeholder="Pilih tingkat" error={errors.tingkat} />
            <Select label="Tahun Ajaran" value={formData.tahunAjaran} onChange={(e) => setFormData(p => ({ ...p, tahunAjaran: e.target.value }))} options={tahunAjaranOptions} placeholder="Pilih tahun ajaran" error={errors.tahunAjaran} />
          </>
        )}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" type="button" onClick={onClose}>Batal</Button>
          <Button type="submit" isLoading={isSubmitting}>Simpan</Button>
        </div>
      </form>
    </Modal>
  )
}

function getAcademicYearFormOptions() {
  const now = new Date()
  const startYear = now.getMonth() + 1 >= 7 ? now.getFullYear() : now.getFullYear() - 1

  return Array.from({ length: 5 }, (_, index) => {
    const year = startYear - 1 + index
    const value = `${year}/${year + 1}`

    return { value, label: value }
  })
}
