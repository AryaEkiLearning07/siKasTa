'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { MoneyValue } from '@/components/ui/MoneyValue'
import { MonthNavigator } from '@/components/ui/MonthNavigator'
import { AssignmentSlot } from '@/components/ui/AssignmentSlot'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'
import { PaymentChecklistTable } from '@/components/domain/PaymentChecklistTable'
import { SaldoSummaryCard } from '@/components/domain/SaldoSummaryCard'
import { UserFormModal, type UserFormData } from '@/components/admin/UserComponents'

type Role = 'WALI_KELAS' | 'BENDAHARA'

type StudentOption = {
  id: string
  name: string
  absen: number
}

type Props = {
  role: Role
  canManageStudents?: boolean
  canTogglePayment?: boolean
  canRecordExpense?: boolean
  canChangeKas?: boolean
}

export function ClassDashboard({ role, canManageStudents, canTogglePayment, canChangeKas }: Props) {
  const params = useParams()
  const classId = params.classId as string
  const { addToast } = useToast()

  const [classData, setClassData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [isKasModalOpen, setIsKasModalOpen] = useState(false)
  const [kasNominal, setKasNominal] = useState('')
  const [isUpdatingKas, setIsUpdatingKas] = useState(false)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [userErrors, setUserErrors] = useState<Record<string, string>>({})
  const [isClassCardOpen, setIsClassCardOpen] = useState(false)
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([])

  useEffect(() => {
    const controller = new AbortController()
    fetchClass(controller.signal)
    fetchStudents(controller.signal)

    return () => controller.abort()
  }, [classId])

  async function fetchClass(signal?: AbortSignal) {
    try {
      const res = await fetch(`/api/classes/${classId}`, { signal })
      const data = await res.json()
      if (!signal?.aborted && data.class) setClassData(data.class)
    } catch {
      if (!signal?.aborted) addToast('error', 'Gagal memuat')
    } finally {
      if (!signal?.aborted) setIsLoading(false)
    }
  }

  async function fetchStudents(signal?: AbortSignal) {
    try {
      const res = await fetch(`/api/classes/${classId}/students`, { signal })
      const data = await res.json()
      if (!signal?.aborted && data.students) {
        setStudentOptions(data.students.map((student: { id: string; name: string }, index: number) => ({
          id: student.id,
          name: student.name,
          absen: index + 1,
        })))
      }
    } catch {
      if (!signal?.aborted) addToast('error', 'Gagal memuat siswa')
    }
  }

  async function handleUpdateKas() {
    setIsUpdatingKas(true)
    try {
      const res = await fetch(`/api/classes/${classId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kasNominal: parseInt(kasNominal.replace(/[^0-9]/g, '')) }),
      })
      const data = await res.json()
      if (!res.ok) {
        addToast('error', data.error || 'Gagal')
        return
      }
      addToast('success', 'Nominal kas diupdate')
      setIsKasModalOpen(false)
      fetchClass()
    } catch {
      addToast('error', 'Koneksi gagal')
    } finally {
      setIsUpdatingKas(false)
    }
  }

  async function handleCreateBendahara(formData: UserFormData) {
    setUserErrors({})
    if (formData.role === 'BENDAHARA' && studentOptions.length === 0) { setUserErrors({ name: 'Belum ada siswa di kelas ini' }); return }
    if (formData.role === 'BENDAHARA' && !formData.name) { setUserErrors({ name: 'Pilih siswa bendahara' }); return }
    if (!formData.name || formData.name.length < 2) { setUserErrors({ name: 'Nama minimal 2 karakter' }); return }
    if (!formData.username || formData.username.length < 3) { setUserErrors({ username: 'Username minimal 3 karakter' }); return }
    if (!formData.password || formData.password.length < 6) { setUserErrors({ password: 'Password minimal 6 karakter' }); return }
    if (formData.role !== 'BENDAHARA') { setUserErrors({ role: 'Wali kelas hanya dapat membuat akun bendahara' }); return }

    setIsCreatingUser(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) {
        addToast('error', data.error || 'Gagal membuat akun')
        return
      }
      addToast('success', 'Akun bendahara berhasil dibuat')
      setIsUserModalOpen(false)
      fetchClass()
    } catch {
      addToast('error', 'Koneksi gagal')
    } finally {
      setIsCreatingUser(false)
    }
  }

  if (!isLoading && !classData) {
    return <EmptyState variant="error" title="Kelas Tidak Ditemukan" description="Anda tidak memiliki akses ke kelas ini" />
  }

  const rolePath = role.toLowerCase().replace('_', '-')
  const studentHref = canManageStudents ? `/${rolePath}/${classId}/siswa` : undefined
  const waliKelas = classData?.members?.find((member: any) => member.role === 'WALI_KELAS')
  const bendahara = classData?.members?.find((member: any) => member.role === 'BENDAHARA')

  return (
    <div className="space-y-6">
      {isLoading || !classData ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : (
        <Card>
          <CardContent>
            <div className="flex flex-col gap-5">
              <div className="flex flex-row items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="mt-1 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-green text-white">
                    <Icon name="school" />
                  </span>
                  <div>
                    <h2 className="font-serif text-2xl font-bold text-brand-ink">{classData.name}</h2>
                    <p className="text-neutral-500">{classData.tingkat} - {classData.tahunAjaran} - {classData._count.students} siswa</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  {role === 'WALI_KELAS' && (
                    <button
                      type="button"
                      onClick={() => setIsClassCardOpen((current) => !current)}
                      aria-expanded={isClassCardOpen}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-brand-ink"
                      aria-label={isClassCardOpen ? 'Tutup detail akun kelas' : 'Buka detail akun kelas'}
                    >
                      <Icon
                        name="chevron-down"
                        size={18}
                        className={`transition-transform ${isClassCardOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                  )}
                </div>
              </div>

              {role === 'WALI_KELAS' && isClassCardOpen && (
                <div className="space-y-5 border-t border-neutral-200 pt-5">
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-brand-cream px-4 py-3">
                    <div className="text-left">
                      <p className="text-sm text-neutral-500">Kas/bulan</p>
                      <MoneyValue amount={classData.kasNominal} variant="neutral" className="text-lg" as="p" />
                    </div>
                    {canChangeKas && (
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Icon name="cash" size={16} />}
                        onClick={() => {
                          setKasNominal(classData.kasNominal.toString())
                          setIsKasModalOpen(true)
                        }}
                      >
                        Ubah
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(260px,420px)] md:items-start">
                    <div className="flex items-start gap-3">
                      <span className="mt-1 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-blue-bg text-brand-blue-info">
                        <Icon name="users" />
                      </span>
                      <div>
                        <h3 className="font-serif text-lg font-semibold text-brand-ink">Akun Kelas</h3>
                        <p className="text-sm text-neutral-500">Kelola akun bendahara untuk kelas ini</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <AssignmentSlot label="Wali Kelas" value={waliKelas} />
                      <AssignmentSlot
                        label="Bendahara"
                        value={bendahara}
                        onCreate={!bendahara ? () => {
                          setUserErrors({})
                          setIsUserModalOpen(true)
                        } : undefined}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <section className="space-y-4">
        <div className="flex justify-end">
          <div className="rounded-lg border border-neutral-200 bg-white px-2 py-1 shadow-sm">
            <MonthNavigator
              year={year}
              month={month}
              onChange={(nextYear, nextMonth) => {
                setYear(nextYear)
                setMonth(nextMonth)
              }}
              maxMonth={{ year: new Date().getFullYear(), month: new Date().getMonth() + 1 }}
            />
          </div>
        </div>

        <SaldoSummaryCard classId={classId} year={year} month={month} />
      </section>

      <PaymentChecklistTable
        classId={classId}
        year={year}
        month={month}
        kasNominal={classData?.kasNominal ?? 0}
        readOnly={!canTogglePayment}
        addStudentHref={studentHref}
      />

      {classData && (
        <Modal isOpen={isKasModalOpen} onClose={() => setIsKasModalOpen(false)} title="Ubah Nominal Kas">
        <form onSubmit={(event) => { event.preventDefault(); handleUpdateKas() }} className="space-y-4">
          <Input
            label="Nominal Kas per Bulan"
            value={kasNominal}
            onChange={(event) => setKasNominal(parseInt(event.target.value.replace(/[^0-9]/g, '') || '0', 10).toLocaleString('id-ID'))}
            placeholder="0"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsKasModalOpen(false)}>Batal</Button>
            <Button type="submit" isLoading={isUpdatingKas}>Simpan</Button>
          </div>
        </form>
        </Modal>
      )}

      {classData && (
        <UserFormModal
          isOpen={isUserModalOpen}
          onClose={() => setIsUserModalOpen(false)}
          onSubmit={handleCreateBendahara}
          isSubmitting={isCreatingUser}
          errors={userErrors}
          classes={[{ id: classData.id, name: classData.name, tingkat: classData.tingkat }]}
          currentClassId={classId}
          allowedRoles={['BENDAHARA']}
          defaultRole="BENDAHARA"
          title="Buat Akun Bendahara"
          studentOptions={studentOptions}
        />
      )}
    </div>
  )
}
