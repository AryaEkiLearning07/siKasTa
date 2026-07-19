'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { ClassesGrid, ClassFormModal, AccountTarget } from '@/components/admin/ClassComponents'
import { DeleteConfirmDialog, UserFormData, UserFormModal, UsersTable } from '@/components/admin/UserComponents'
import { ROLE_LABELS } from '@/lib/roles'

type AdminSection = 'kelas' | 'akun'
type ManagedAccountRole = 'GURU' | 'WALI_KELAS' | 'BENDAHARA'

type ClassData = {
  id: string
  name: string
  tingkat: string
  tahunAjaran: string
  kasNominal: number
  members: { id: string; name: string; username: string; role: string }[]
  _count: { students: number }
}

type UserData = {
  id: string
  name: string
  username: string
  role: string
  classId: string | null
  class: { id: string; name: string } | null
  teachingAssignments?: {
    id: string
    classId: string
    subjectId: string
    class: { id: string; name: string; tingkat: string; tahunAjaran: string }
    subject: { id: string; name: string }
  }[]
  homeroomAssignments?: {
    id: string
    classId: string
    class: { id: string; name: string; tingkat: string; tahunAjaran: string }
  }[]
}

type SubjectData = {
  id: string
  name: string
}

type FetchOptions = { preserveFilter?: boolean; silent?: boolean; signal?: AbortSignal }

export function AdminConsole({ section }: { section: AdminSection }) {
  const { addToast } = useToast()
  const [classes, setClasses] = useState<ClassData[]>([])
  const [users, setUsers] = useState<UserData[]>([])
  const [subjects, setSubjects] = useState<SubjectData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isClassModalOpen, setIsClassModalOpen] = useState(false)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [accountTarget, setAccountTarget] = useState<AccountTarget | null>(null)
  const [userEditTarget, setUserEditTarget] = useState<UserData | null>(null)
  const [userDeleteTarget, setUserDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [classDeleteTarget, setClassDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeletingUser, setIsDeletingUser] = useState(false)
  const [isDeletingClass, setIsDeletingClass] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tahunAjaranFilter, setTahunAjaranFilter] = useState('')
  const [classForm, setClassForm] = useState({ name: '', tingkat: '', tahunAjaran: '' })

  useEffect(() => {
    const controller = new AbortController()
    fetchData({ signal: controller.signal })

    return () => controller.abort()
  }, [section])

  async function fetchData(options?: FetchOptions) {
    if (section === 'kelas') {
      await fetchClasses(options)
      return
    }

    await fetchAccountData(options)
  }

  async function fetchAccountData(options?: FetchOptions) {
    if (!options?.silent) {
      setIsLoading(true)
    }

    try {
      await Promise.all([
        fetchUsers({ ...options, silent: true }),
        fetchClasses({ ...options, silent: true, preserveFilter: true }),
        fetchSubjects({ ...options, silent: true }),
      ])
    } finally {
      if (!options?.silent && !options?.signal?.aborted) {
        setIsLoading(false)
      }
    }
  }

  async function fetchClasses(options?: FetchOptions) {
    if (!options?.silent) {
      setIsLoading(true)
    }
    try {
      const res = await fetch('/api/admin/classes', {
        signal: options?.signal,
        cache: 'no-store',
      })
      const data = await res.json()
      if (options?.signal?.aborted) return

      if (!res.ok) {
        addToast('error', data.error || 'Gagal memuat data kelas')
        return
      }

      if (data.classes) {
        setClasses(data.classes)
        if (!options?.preserveFilter) {
          setTahunAjaranFilter((prev) => prev || getDefaultAcademicYear(data.classes))
        }
      }
    } catch {
      if (!options?.signal?.aborted) addToast('error', 'Gagal memuat data kelas')
    } finally {
      if (!options?.silent && !options?.signal?.aborted) {
        setIsLoading(false)
      }
    }
  }

  async function fetchUsers(options?: FetchOptions) {
    if (!options?.silent) {
      setIsLoading(true)
    }
    try {
      const res = await fetch('/api/admin/users', {
        signal: options?.signal,
        cache: 'no-store',
      })
      const data = await res.json()
      if (options?.signal?.aborted) return

      if (!res.ok) {
        addToast('error', data.error || 'Gagal memuat data akun')
        return
      }

      if (data.users) setUsers(data.users)
    } catch {
      if (!options?.signal?.aborted) addToast('error', 'Gagal memuat data akun')
    } finally {
      if (!options?.silent && !options?.signal?.aborted) {
        setIsLoading(false)
      }
    }
  }

  async function fetchSubjects(options?: FetchOptions) {
    try {
      const res = await fetch('/api/admin/subjects', {
        signal: options?.signal,
        cache: 'no-store',
      })
      const data = await res.json()
      if (options?.signal?.aborted) return

      if (!res.ok) {
        addToast('error', data.error || 'Gagal memuat data mapel')
        return
      }

      if (data.subjects) setSubjects(data.subjects)
    } catch {
      if (!options?.signal?.aborted) addToast('error', 'Gagal memuat data mapel')
    }
  }

  async function handleCreateClass(event: React.FormEvent) {
    event.preventDefault()
    setErrors({})
    if (!classForm.name) { setErrors({ name: 'Nama kelas wajib diisi' }); return }
    if (!classForm.tingkat) { setErrors({ tingkat: 'Tingkat wajib dipilih' }); return }
    if (!classForm.tahunAjaran) { setErrors({ tahunAjaran: 'Tahun ajaran wajib dipilih' }); return }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(classForm),
      })
      const data = await res.json()
      if (!res.ok) { addToast('error', data.error || 'Gagal'); return }
      if (data.class) {
        setClasses((prev) => [data.class, ...prev.filter((cls) => cls.id !== data.class.id)])
        setTahunAjaranFilter(data.class.tahunAjaran)
      }
      addToast('success', 'Kelas berhasil dibuat')
      setIsClassModalOpen(false)
      setClassForm({ name: '', tingkat: '', tahunAjaran: '' })
    } catch {
      addToast('error', 'Koneksi gagal')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCreateUser(formData: UserFormData) {
    const completeTeachingAssignments = validateUserForm(formData, { requirePassword: true })
    if (!completeTeachingAssignments) return

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          ...formData,
          teachingAssignments: completeTeachingAssignments,
        }),
      })
      const data = await res.json()
      if (!res.ok) { addToast('error', data.error || 'Gagal'); return }
      addToast('success', `Akun ${ROLE_LABELS[formData.role]} berhasil dibuat`)
      setIsUserModalOpen(false)
      setAccountTarget(null)
      setUserEditTarget(null)
      fetchData({ preserveFilter: true, silent: true })
    } catch {
      addToast('error', 'Koneksi gagal')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleUpdateUser(formData: UserFormData) {
    if (!userEditTarget) return

    const completeTeachingAssignments = validateUserForm(formData, { requirePassword: false })
    if (!completeTeachingAssignments) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/admin/users?id=${userEditTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          ...formData,
          password: formData.password || '',
          teachingAssignments: completeTeachingAssignments,
        }),
      })
      const data = await res.json()
      if (!res.ok) { addToast('error', data.error || 'Gagal menyimpan akun'); return }
      addToast('success', 'Akun berhasil diperbarui')
      setIsUserModalOpen(false)
      setAccountTarget(null)
      setUserEditTarget(null)
      fetchData({ preserveFilter: true, silent: true })
    } catch {
      addToast('error', 'Koneksi gagal')
    } finally {
      setIsSubmitting(false)
    }
  }

  function validateUserForm(formData: UserFormData, options: { requirePassword: boolean }) {
    setErrors({})
    if (!formData.name || formData.name.length < 2) { setErrors({ name: 'Nama minimal 2 karakter' }); return null }
    if (!formData.username || formData.username.length < 3) { setErrors({ username: 'Username minimal 3 karakter' }); return null }
    if (options.requirePassword && !formData.password) { setErrors({ password: 'Password wajib diisi' }); return null }
    if (formData.password && formData.password.length < 6) { setErrors({ password: 'Password minimal 6 karakter' }); return null }
    if (formData.role === 'BENDAHARA' && !formData.classId) { setErrors({ classId: 'Kelas wajib dipilih' }); return null }
    if (formData.role === 'WALI_KELAS' && !formData.classId && !formData.homeroomClassId) { setErrors({ homeroomClassId: 'Kelas wali wajib dipilih' }); return null }
    const teachingAssignments = formData.teachingAssignments || []
    const hasIncompleteTeachingAssignment = teachingAssignments.some((assignment) => (
      Boolean(assignment.classId) !== Boolean(assignment.subjectId)
    ))
    const completeTeachingAssignments = teachingAssignments.filter((assignment) => assignment.classId && assignment.subjectId)

    if (hasIncompleteTeachingAssignment) {
      setErrors({ teachingAssignments: 'Lengkapi mapel dan kelas pada setiap baris yang sudah diisi' })
      return null
    }

    if (formData.role === 'GURU' && completeTeachingAssignments.length === 0) {
      setErrors({ teachingAssignments: 'Minimal satu mapel dan kelas ajar wajib diisi' })
      return null
    }

    return completeTeachingAssignments
  }

  function openEditUser(user: UserData) {
    setErrors({})
    setAccountTarget(null)
    setUserEditTarget(user)
    setIsUserModalOpen(true)
  }

  async function handleDeleteUser() {
    if (!userDeleteTarget) return
    setIsDeletingUser(true)
    try {
      const res = await fetch(`/api/admin/users?id=${userDeleteTarget.id}`, {
        method: 'DELETE',
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) { addToast('error', data.error || 'Gagal'); return }
      addToast('success', 'Akun berhasil dihapus')
      setUserDeleteTarget(null)
      setUsers((prev) => prev.filter((user) => user.id !== userDeleteTarget.id))
      fetchUsers({ silent: true })
    } catch {
      addToast('error', 'Koneksi gagal')
    } finally {
      setIsDeletingUser(false)
    }
  }

  async function handleDeleteClass() {
    if (!classDeleteTarget) return
    setIsDeletingClass(true)
    try {
      const res = await fetch(`/api/admin/classes/${classDeleteTarget.id}`, {
        method: 'DELETE',
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) { addToast('error', data.error || 'Gagal'); return }
      addToast('success', 'Kelas berhasil dihapus')
      setClassDeleteTarget(null)
      setClasses((prev) => prev.filter((cls) => cls.id !== classDeleteTarget.id))
      fetchClasses({ preserveFilter: true, silent: true })
    } catch {
      addToast('error', 'Koneksi gagal')
    } finally {
      setIsDeletingClass(false)
    }
  }

  const tahunAjaranOptions = getAcademicYearOptions(classes)
  const filteredClasses = tahunAjaranFilter ? classes.filter((cls) => cls.tahunAjaran === tahunAjaranFilter) : classes
  const waliKelasUsers = users.filter((user) => user.role === 'WALI_KELAS' && user.classId)
  const bendaharaUsers = users.filter((user) => user.role === 'BENDAHARA' && user.classId)
  const guruMapelUsers = users.filter((user) => user.role === 'GURU' || (user.teachingAssignments?.length || 0) > 0)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => <Skeleton key={item} className="h-32 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-brand-ink font-serif">
              {section === 'kelas' ? 'Kelola Kelas' : 'Kelola Akun'}
            </h1>
            <p className="text-neutral-500 mt-1">
              {section === 'kelas' ? 'Tambah kelas dan buat akun wali kelas dari kelas terkait' : 'Pantau akun guru, wali kelas, dan bendahara'}
            </p>
          </div>
          {section === 'akun' && (
            <Button
              onClick={() => {
                setErrors({})
                setAccountTarget(null)
                setUserEditTarget(null)
                setIsUserModalOpen(true)
              }}
              leftIcon={<Icon name="plus" size={16} />}
            >
              Tambah Akun Guru
            </Button>
          )}
        </div>
      </div>

      {section === 'kelas' ? (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full sm:max-w-xs">
              <Select
                label="Tahun Ajaran"
                value={tahunAjaranFilter}
                onChange={(event) => setTahunAjaranFilter(event.target.value)}
                options={tahunAjaranOptions}
              />
            </div>
            <Button onClick={() => setIsClassModalOpen(true)}>+ Tambah Kelas</Button>
          </div>
          <ClassesGrid
            classes={filteredClasses}
            showActions
            onDelete={(id, name) => setClassDeleteTarget({ id, name })}
            onCreateAccount={(target) => {
              setErrors({})
              setAccountTarget(target)
              setUserEditTarget(null)
              setIsUserModalOpen(true)
            }}
            onCreateClass={() => setIsClassModalOpen(true)}
          />
        </>
      ) : (
        <div className="space-y-6">
          {guruMapelUsers.length === 0 && waliKelasUsers.length === 0 && bendaharaUsers.length === 0 ? (
            <EmptyState title="Belum Ada Akun" description="Buat akun guru atau wali kelas dari halaman ini." />
          ) : (
            <>
              <section className="space-y-3">
                <h2 className="font-serif text-lg font-semibold text-brand-ink">Guru Mata Pelajaran</h2>
                {guruMapelUsers.length === 0 ? (
                  <EmptyState title="Belum Ada Guru Mapel" description="Tambahkan akun guru beserta mapel dan kelas ajarnya." />
                ) : (
                  <UsersTable users={guruMapelUsers} onEdit={openEditUser} onDelete={(id, name) => setUserDeleteTarget({ id, name })} currentUserRole="ADMIN" variant="subject" />
                )}
              </section>
              <section className="space-y-3">
                <h2 className="font-serif text-lg font-semibold text-brand-ink">Wali Kelas</h2>
                {waliKelasUsers.length === 0 ? (
                  <EmptyState title="Belum Ada Wali Kelas" description="Buat akun wali kelas dari kartu kelas." />
                ) : (
                  <UsersTable users={waliKelasUsers} onEdit={openEditUser} onDelete={(id, name) => setUserDeleteTarget({ id, name })} currentUserRole="ADMIN" />
                )}
              </section>
              <section className="space-y-3">
                <h2 className="font-serif text-lg font-semibold text-brand-ink">Bendahara</h2>
                {bendaharaUsers.length === 0 ? (
                  <EmptyState title="Belum Ada Bendahara" description="Akun bendahara dibuat oleh wali kelas." />
                ) : (
                  <UsersTable users={bendaharaUsers} onEdit={openEditUser} onDelete={(id, name) => setUserDeleteTarget({ id, name })} currentUserRole="ADMIN" />
                )}
              </section>
            </>
          )}
        </div>
      )}

      <ClassFormModal isOpen={isClassModalOpen} onClose={() => setIsClassModalOpen(false)} onSubmit={handleCreateClass} isSubmitting={isSubmitting} formData={classForm} setFormData={setClassForm} errors={errors} />
      <UserFormModal
        isOpen={isUserModalOpen}
        onClose={() => {
          setIsUserModalOpen(false)
          setAccountTarget(null)
          setUserEditTarget(null)
        }}
        onSubmit={userEditTarget ? handleUpdateUser : handleCreateUser}
        isSubmitting={isSubmitting}
        errors={errors}
        classes={classes}
        subjects={subjects}
        currentClassId={accountTarget?.classId}
        allowedRoles={getAllowedUserRoles(accountTarget, userEditTarget)}
        defaultRole={accountTarget ? 'WALI_KELAS' : getDefaultUserRole(userEditTarget)}
        enableTeachingAssignments={!accountTarget && userEditTarget?.role !== 'BENDAHARA'}
        enableHomeroomAssignment={!accountTarget && userEditTarget?.role !== 'BENDAHARA'}
        mode={userEditTarget ? 'edit' : 'create'}
        initialUser={userEditTarget}
        title={userEditTarget ? `Edit Akun ${userEditTarget.name}` : accountTarget ? `Buat Akun ${ROLE_LABELS[accountTarget.role]}` : 'Tambah Akun Guru'}
      />
      <DeleteConfirmDialog isOpen={!!userDeleteTarget} onClose={() => setUserDeleteTarget(null)} onConfirm={handleDeleteUser} title="Hapus Akun" message={`Yakin menghapus akun "${userDeleteTarget?.name}"? Kelas tidak ikut terhapus.`} isLoading={isDeletingUser} />
      <DeleteConfirmDialog isOpen={!!classDeleteTarget} onClose={() => setClassDeleteTarget(null)} onConfirm={handleDeleteClass} title="Hapus Kelas" message={`Yakin menghapus kelas "${classDeleteTarget?.name}"? Data siswa, kas, dan pengeluaran di kelas ini ikut terhapus.`} isLoading={isDeletingClass} />
    </div>
  )
}

function getCurrentAcademicYear() {
  const now = new Date()
  const startYear = now.getMonth() + 1 >= 7 ? now.getFullYear() : now.getFullYear() - 1
  return `${startYear}/${startYear + 1}`
}

function getAcademicYearOptions(classes: ClassData[]) {
  const years = Array.from(new Set(classes.map((cls) => cls.tahunAjaran))).sort((a, b) => b.localeCompare(a))
  return years.map((year) => ({ value: year, label: year }))
}

function getDefaultAcademicYear(classes: ClassData[]) {
  const years = getAcademicYearOptions(classes).map((option) => option.value)
  const current = getCurrentAcademicYear()
  return years.includes(current) ? current : years[0] || ''
}

function getAllowedUserRoles(accountTarget: AccountTarget | null, editTarget: UserData | null): ManagedAccountRole[] {
  if (accountTarget) return ['WALI_KELAS']
  if (editTarget?.role === 'BENDAHARA') return ['BENDAHARA']
  return ['GURU', 'WALI_KELAS']
}

function getDefaultUserRole(editTarget: UserData | null): ManagedAccountRole {
  if (editTarget?.role === 'BENDAHARA') return 'BENDAHARA'
  if (editTarget?.role === 'WALI_KELAS') return 'WALI_KELAS'
  return 'GURU'
}
