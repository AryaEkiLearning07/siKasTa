'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Icon } from '@/components/ui/Icon'
import { formatEmptyValue } from '@/lib/format'
import { ROLE_LABELS } from '@/lib/roles'

type ManagedRole = 'GURU' | 'WALI_KELAS' | 'BENDAHARA'

type TeachingAssignmentInput = {
  classId: string
  subjectId: string
}

type TeachingAssignmentSnapshot = TeachingAssignmentInput & {
  class?: { id?: string; name?: string; tingkat?: string; tahunAjaran?: string } | null
  subject?: { id?: string; name?: string } | null
}

export type UserFormData = {
  name: string
  username: string
  password: string
  role: ManagedRole
  classId: string
  homeroomClassId?: string
  teachingAssignments?: TeachingAssignmentInput[]
}

export type EditableUserData = {
  id: string
  name: string
  username: string
  role: string
  classId: string | null
  class?: { id: string; name: string } | null
  teachingAssignments?: TeachingAssignmentSnapshot[]
  homeroomAssignments?: {
    classId: string
    class?: { id: string; name: string; tingkat?: string; tahunAjaran?: string }
  }[]
}

type StudentAccountOption = {
  id: string
  name: string
  absen: number
}

type UserFormProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: UserFormData) => void
  isSubmitting: boolean
  errors: Record<string, string>
  classes: { id: string; name: string; tingkat: string; tahunAjaran?: string }[]
  subjects?: { id: string; name: string }[]
  currentClassId?: string | null
  allowedRoles?: ManagedRole[]
  defaultRole?: ManagedRole
  title?: string
  studentOptions?: StudentAccountOption[]
  enableTeachingAssignments?: boolean
  enableHomeroomAssignment?: boolean
  mode?: 'create' | 'edit'
  initialUser?: EditableUserData | null
}

export function UserFormModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  errors,
  classes,
  subjects = [],
  currentClassId,
  allowedRoles = ['WALI_KELAS', 'BENDAHARA'],
  defaultRole,
  title = 'Tambah Akun',
  studentOptions = [],
  enableTeachingAssignments = false,
  enableHomeroomAssignment = false,
  mode = 'create',
  initialUser = null,
}: UserFormProps) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<ManagedRole>(defaultRole || allowedRoles[0])
  const [classId, setClassId] = useState(currentClassId || '')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [homeroomEnabled, setHomeroomEnabled] = useState(defaultRole === 'WALI_KELAS')
  const [homeroomClassId, setHomeroomClassId] = useState(currentClassId || '')
  const [teachingAssignmentErrors, setTeachingAssignmentErrors] = useState<
    Record<number, Partial<Record<keyof TeachingAssignmentInput, string>>>
  >({})
  const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignmentInput[]>([
    { subjectId: '', classId: '' },
  ])
  const allowedRolesKey = allowedRoles.join(',')
  const isEditMode = mode === 'edit'

  useEffect(() => {
    if (!initialUser && currentClassId) setClassId(currentClassId)
  }, [currentClassId, initialUser])

  useEffect(() => {
    if (!isOpen) return
    const nextRole = normalizeManagedRole(initialUser?.role) || defaultRole || allowedRoles[0]
    const nextHomeroomClassId = initialUser?.homeroomAssignments?.[0]?.classId
      || (nextRole === 'WALI_KELAS' ? initialUser?.classId || currentClassId || '' : '')
    const nextTeachingAssignments = initialUser?.teachingAssignments?.length
      ? sortTeachingAssignments(initialUser.teachingAssignments).map((assignment) => ({
          subjectId: assignment.subjectId,
          classId: assignment.classId,
        }))
      : [{ subjectId: '', classId: '' }]

    setName(initialUser?.name || '')
    setUsername(initialUser?.username || '')
    setPassword('')
    setShowPassword(false)
    setSelectedStudentId('')
    setRole(nextRole)
    setClassId(initialUser?.classId || currentClassId || '')
    setHomeroomEnabled(Boolean(nextHomeroomClassId))
    setHomeroomClassId(nextHomeroomClassId)
    setTeachingAssignmentErrors({})
    setTeachingAssignments(nextTeachingAssignments)
  }, [allowedRolesKey, currentClassId, defaultRole, initialUser, isOpen])

  const requiresStudentSelection = !isEditMode && role === 'BENDAHARA' && Boolean(currentClassId)
  const studentSelectOptions = studentOptions.map((student) => ({
    value: student.id,
    label: `${String(student.absen).padStart(2, '0')} - ${student.name}`,
  }))

  function handleStudentChange(studentId: string) {
    setSelectedStudentId(studentId)
    const selectedStudent = studentOptions.find((student) => student.id === studentId)
    if (!selectedStudent) {
      setName('')
      setUsername('')
      return
    }
    setName(selectedStudent.name)
    setUsername(buildStudentUsername(selectedStudent.name, selectedStudent.absen))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (enableTeachingAssignments) {
      if (!validateTeachingAssignments()) return

      const cleanedAssignments = teachingAssignments.filter((assignment) => assignment.classId && assignment.subjectId)
      const selectedHomeroomClassId = homeroomEnabled ? homeroomClassId : ''
      onSubmit({
        name,
        username,
        password,
        role: homeroomEnabled ? 'WALI_KELAS' : 'GURU',
        classId: selectedHomeroomClassId,
        homeroomClassId: selectedHomeroomClassId,
        teachingAssignments: cleanedAssignments,
      })
      return
    }

    onSubmit({ name, username, password, role, classId })
  }

  const roleOptions = allowedRoles.map((value) => ({ value, label: ROLE_LABELS[value] }))
  const classOptions = classes.map((c) => ({
    value: c.id,
    label: c.tahunAjaran ? `${c.name} - ${c.tahunAjaran}` : c.name,
  }))
  const subjectOptions = subjects.map((subject) => ({ value: subject.id, label: subject.name }))
  const selectedClass = classOptions.find((option) => option.value === classId)
  const jabatanLabel = selectedClass ? `${formatJabatan(role)} ${selectedClass.label}` : formatJabatan(role)
  const hasIncompleteTeachingAssignment = enableTeachingAssignments
    && teachingAssignments.some(isIncompleteTeachingAssignment)
  const currentClassLabel = findClassLabel(initialUser?.classId || null, classOptions)
  const currentHomeroomLabel = findHomeroomLabel(initialUser, classOptions)
  const currentTeachingItems = findTeachingItems(initialUser, classOptions, subjectOptions)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {isEditMode && initialUser && (
          <section className="space-y-2 rounded-lg border border-neutral-200 bg-brand-cream/40 p-3 text-sm">
            <h3 className="font-semibold text-brand-ink">Data Saat Ini</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <p><span className="font-medium text-neutral-500">Nama:</span> {initialUser.name}</p>
              <p><span className="font-medium text-neutral-500">Username:</span> @{initialUser.username}</p>
              <p><span className="font-medium text-neutral-500">Jabatan:</span> {ROLE_LABELS[normalizeManagedRole(initialUser.role) || 'GURU']}</p>
              <p><span className="font-medium text-neutral-500">Kelas:</span> {currentClassLabel || currentHomeroomLabel || formatEmptyValue(null, 'table')}</p>
              <div className="space-y-1 sm:col-span-2">
                <span className="font-medium text-neutral-500">Mapel/Kelas ajar:</span>
                {currentTeachingItems.length > 0 ? (
                  <ol className="ml-5 list-decimal space-y-1">
                    {currentTeachingItems.map((item, index) => (
                      <li key={`${item}-${index}`} className="leading-5 text-brand-ink">
                        {item}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <span>{formatEmptyValue(null, 'table')}</span>
                )}
              </div>
            </div>
          </section>
        )}
        {requiresStudentSelection ? (
          <Select
            label="Nama Lengkap"
            value={selectedStudentId}
            onChange={(e) => handleStudentChange(e.target.value)}
            options={studentSelectOptions}
            placeholder={studentOptions.length > 0 ? 'Pilih nama siswa' : 'Belum ada siswa di kelas ini'}
            error={errors.name}
            disabled={studentOptions.length === 0}
            hint="Nama otomatis mengikuti siswa yang dipilih dari kelas ini."
          />
        ) : (
          <Input
            label="Nama Lengkap"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            placeholder="Contoh: Budi Santoso"
          />
        )}
        <Input
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={errors.username}
          placeholder="contoh: wali7a"
          autoComplete="username"
          readOnly={requiresStudentSelection}
          className="read-only:bg-neutral-50"
          hint={requiresStudentSelection ? 'Otomatis dari nama depan dan nomor absen.' : undefined}
        />
        <Input
          type={showPassword ? 'text' : 'password'}
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          placeholder={isEditMode ? 'Kosongkan jika tidak diganti' : 'Minimal 6 karakter'}
          hint={isEditMode ? 'Isi hanya jika ingin reset password akun ini.' : undefined}
          className="pr-12"
          endAdornment={(
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-brand-green"
              aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
            >
              <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
            </button>
          )}
        />
        {enableTeachingAssignments ? (
          <>
            <section className="space-y-3 rounded-lg border border-neutral-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-brand-ink">Mapel yang Diajar</h3>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<Icon name="plus" size={16} />}
                  onClick={() => setTeachingAssignments((current) => [...current, { subjectId: '', classId: '' }])}
                >
                  Tambah
                </Button>
              </div>
              <div className="space-y-3">
                {teachingAssignments.map((assignment, index) => (
                  <div key={index} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <Select
                      label={`Mapel ${index + 1}`}
                      value={assignment.subjectId}
                      onChange={(event) => updateTeachingAssignment(index, 'subjectId', event.target.value)}
                      options={subjectOptions}
                      placeholder="Pilih mapel"
                      error={
                        teachingAssignmentErrors[index]?.subjectId
                          || (assignment.classId && !assignment.subjectId ? 'Mapel wajib dipilih' : undefined)
                          || (index === 0 ? errors.teachingAssignments : undefined)
                      }
                    />
                    <Select
                      label="Kelas"
                      value={assignment.classId}
                      onChange={(event) => updateTeachingAssignment(index, 'classId', event.target.value)}
                      options={classOptions}
                      placeholder="Pilih kelas"
                      error={
                        teachingAssignmentErrors[index]?.classId
                          || (assignment.subjectId && !assignment.classId ? 'Kelas wajib dipilih' : undefined)
                      }
                    />
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTeachingAssignment(index)}
                        disabled={teachingAssignments.length === 1}
                      >
                        Hapus
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {hasIncompleteTeachingAssignment && (
                <p className="text-sm font-medium text-danger">
                  Lengkapi mapel dan kelas pada setiap baris yang sudah diisi.
                </p>
              )}
            </section>

            <section className="space-y-3 rounded-lg border border-neutral-200 p-3">
              <label className="flex items-center gap-3 text-sm font-semibold text-brand-ink">
                <input
                  type="checkbox"
                  checked={homeroomEnabled}
                  onChange={(event) => setHomeroomEnabled(event.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 text-brand-green focus:ring-brand-green"
                />
                Guru ini juga wali kelas
              </label>
              {homeroomEnabled && (
                <Select
                  label="Kelas Wali"
                  value={homeroomClassId}
                  onChange={(event) => setHomeroomClassId(event.target.value)}
                  options={classOptions}
                  placeholder="Pilih kelas wali"
                  error={errors.homeroomClassId || errors.classId}
                />
              )}
            </section>
          </>
        ) : currentClassId ? (
          <Input label="Jabatan" value={jabatanLabel} readOnly error={errors.classId || errors.role} />
        ) : (
          <>
            {roleOptions.length > 1 && (
              <Select label="Jabatan" value={role} onChange={(e) => setRole(e.target.value as ManagedRole)} options={roleOptions} />
            )}
            <Select label="Kelas" value={classId} onChange={(e) => setClassId(e.target.value)} options={classOptions} placeholder="Pilih kelas" error={errors.classId} />
          </>
        )}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" type="button" onClick={onClose}>Batal</Button>
          <Button type="submit" isLoading={isSubmitting} disabled={hasIncompleteTeachingAssignment}>Simpan</Button>
        </div>
      </form>
    </Modal>
  )

  function validateTeachingAssignments() {
    const nextErrors: Record<number, Partial<Record<keyof TeachingAssignmentInput, string>>> = {}

    teachingAssignments.forEach((assignment, index) => {
      if (!isIncompleteTeachingAssignment(assignment)) return

      nextErrors[index] = {}
      if (!assignment.subjectId) nextErrors[index].subjectId = 'Mapel wajib dipilih'
      if (!assignment.classId) nextErrors[index].classId = 'Kelas wajib dipilih'
    })

    setTeachingAssignmentErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function updateTeachingAssignment(index: number, key: keyof TeachingAssignmentInput, value: string) {
    setTeachingAssignmentErrors({})
    setTeachingAssignments((current) => current.map((assignment, assignmentIndex) => (
      assignmentIndex === index ? { ...assignment, [key]: value } : assignment
    )))
  }

  function removeTeachingAssignment(index: number) {
    setTeachingAssignmentErrors({})
    setTeachingAssignments((current) => current.filter((_, assignmentIndex) => assignmentIndex !== index))
  }
}

function isIncompleteTeachingAssignment(assignment: TeachingAssignmentInput) {
  return Boolean(assignment.classId) !== Boolean(assignment.subjectId)
}

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  isLoading
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  isLoading: boolean
}) {
  return (
    <ConfirmDialog isOpen={isOpen} onClose={onClose} onConfirm={onConfirm} title={title} message={message} confirmLabel="Hapus" variant="danger" isLoading={isLoading} />
  )
}

type UsersTableUser = {
  id: string
  name: string
  username: string
  role: string
  classId: string | null
  class: { id: string; name: string } | null
  teachingAssignments?: Array<{
    id: string
    classId: string
    subjectId: string
    class: { id: string; name: string; tingkat: string; tahunAjaran: string }
    subject: { id: string; name: string }
  }>
  homeroomAssignments?: Array<{
    id: string
    classId: string
    class: { id: string; name: string; tingkat: string; tahunAjaran: string }
  }>
}

type UsersTableProps = {
  users: UsersTableUser[]
  onEdit?: (user: UsersTableUser) => void
  onDelete: (id: string, name: string) => void
  currentUserRole: string
  variant?: 'default' | 'subject'
}

export function UsersTable({ users, onEdit, onDelete, currentUserRole, variant = 'default' }: UsersTableProps) {
  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrator',
    KEPALA_SEKOLAH: 'Kepala Sekolah',
    GURU: 'Guru Mapel',
    WALI_KELAS: 'Wali Kelas',
    BENDAHARA: 'Bendahara',
  }

  const roleBadgeColor = (role: string) => {
    if (role === 'GURU') return 'bg-info-bg text-info'
    if (role === 'WALI_KELAS') return 'bg-brand-green-bg text-brand-green'
    if (role === 'BENDAHARA') return 'bg-success-bg text-success'
    return 'bg-neutral-100 text-neutral-700'
  }
  const thirdColumnLabel = variant === 'subject' ? 'Mata Pelajaran' : 'Jabatan'

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
      <table className="w-full min-w-[720px] table-fixed">
        <colgroup>
          <col className="w-[22%]" />
          <col className="w-[25%]" />
          <col className="w-[20%]" />
          <col className="w-[16%]" />
          <col className="w-[17%]" />
        </colgroup>
        <thead className="bg-brand-cream border-b border-neutral-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Nama</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Username</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">{thirdColumnLabel}</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Kelas</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {users.map((u) => {
            const subjectSummary = formatSubjectSummary(u)
            const classSummary = variant === 'subject' ? formatTeachingClassSummary(u) : formatAssignmentSummary(u)

            return (
            <tr key={u.id} className="hover:bg-brand-cream/50 transition-colors">
              <td className="px-4 py-3 font-semibold text-brand-ink truncate">{u.name}</td>
              <td className="px-4 py-3 text-neutral-600 truncate">{u.username}</td>
              <td className="px-4 py-3">
                {variant === 'subject' ? (
                  <span className="text-sm font-medium text-brand-ink" title={subjectSummary}>
                    {subjectSummary || formatEmptyValue(null, 'table')}
                  </span>
                ) : (
                  <span className={`px-2 py-1 text-xs font-medium rounded ${roleBadgeColor(u.role)}`}>
                    {roleLabels[u.role]}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-neutral-600 truncate" title={classSummary}>
                {classSummary || formatEmptyValue(u.class?.name, 'table')}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {onEdit && (
                    <Button variant="ghost" size="sm" onClick={() => onEdit(u)}>
                      Edit
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => onDelete(u.id, u.name)} className="text-danger hover:bg-danger-bg">Hapus</Button>
                </div>
              </td>
            </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function formatJabatan(role: ManagedRole) {
  if (role === 'GURU') return 'Guru Mapel'
  if (role === 'WALI_KELAS') return 'Walikelas'
  return 'Bendahara'
}

function normalizeManagedRole(role: string | undefined): ManagedRole | null {
  if (role === 'GURU' || role === 'WALI_KELAS' || role === 'BENDAHARA') return role
  return null
}

function findClassLabel(classId: string | null | undefined, classOptions: { value: string; label: string }[]) {
  if (!classId) return ''
  return classOptions.find((option) => option.value === classId)?.label || ''
}

function findHomeroomLabel(
  user: EditableUserData | null,
  classOptions: { value: string; label: string }[]
) {
  const classId = user?.homeroomAssignments?.[0]?.classId
  if (!classId) return ''
  return classOptions.find((option) => option.value === classId)?.label || user?.homeroomAssignments?.[0]?.class?.name || ''
}

function findTeachingItems(
  user: EditableUserData | null,
  classOptions: { value: string; label: string }[],
  subjectOptions: { value: string; label: string }[]
) {
  if (!user?.teachingAssignments?.length) return []

  return sortTeachingAssignments(user.teachingAssignments)
    .map((assignment) => resolveTeachingAssignmentLabel(assignment, classOptions, subjectOptions))
    .filter((label): label is string => Boolean(label))
}

function resolveTeachingAssignmentLabel(
  assignment: TeachingAssignmentSnapshot,
  classOptions: { value: string; label: string }[],
  subjectOptions: { value: string; label: string }[]
) {
  const subjectLabel = subjectOptions.find((option) => option.value === assignment.subjectId)?.label
    || assignment.subject?.name
    || ''
  const classLabel = classOptions.find((option) => option.value === assignment.classId)?.label
    || assignment.class?.name
    || ''

  if (subjectLabel && classLabel) return `${subjectLabel} di ${classLabel}`
  return subjectLabel || classLabel
}

function sortTeachingAssignments(assignments: TeachingAssignmentSnapshot[]) {
  return [...assignments].sort(compareTeachingAssignments)
}

function compareTeachingAssignments(left: TeachingAssignmentSnapshot, right: TeachingAssignmentSnapshot) {
  const leftClassLabel = getAssignmentClassLabel(left)
  const rightClassLabel = getAssignmentClassLabel(right)
  const classComparison = compareText(leftClassLabel, rightClassLabel)
  if (classComparison !== 0) return classComparison

  return compareText(getAssignmentSubjectLabel(left), getAssignmentSubjectLabel(right))
}

function getAssignmentClassLabel(assignment: TeachingAssignmentSnapshot) {
  if (assignment.class?.name && assignment.class.tahunAjaran) {
    return `${assignment.class.name} - ${assignment.class.tahunAjaran}`
  }

  return assignment.class?.name || assignment.classId || ''
}

function getAssignmentSubjectLabel(assignment: TeachingAssignmentSnapshot) {
  return assignment.subject?.name || assignment.subjectId || ''
}

function compareText(left: string, right: string) {
  return left.localeCompare(right, 'id', { sensitivity: 'base', numeric: true })
}

function formatAssignmentSummary(user: UsersTableProps['users'][number]) {
  const teachingSummary = sortTeachingAssignments(user.teachingAssignments || []).map((assignment) => (
    `${assignment.subject?.name || ''} ${assignment.class?.name || ''}`.trim()
  )).filter(Boolean)
  const homeroomSummary = sortHomeroomAssignments(user.homeroomAssignments || []).map((assignment) => (
    `Wali ${assignment.class?.name || ''}`.trim()
  )).filter(Boolean)

  return [...homeroomSummary, ...teachingSummary].join(', ')
}

function formatSubjectSummary(user: UsersTableProps['users'][number]) {
  const subjects = sortTeachingAssignments(user.teachingAssignments || [])
    .map((assignment) => assignment.subject?.name || '')
    .filter(Boolean)
  return Array.from(new Set(subjects)).join(', ')
}

function formatTeachingClassSummary(user: UsersTableProps['users'][number]) {
  const classes = sortTeachingAssignments(user.teachingAssignments || []).map((assignment) => (
    assignment.class?.tahunAjaran
      ? `${assignment.class?.name || ''} - ${assignment.class.tahunAjaran}`
      : assignment.class?.name || ''
  )).filter(Boolean)

  return Array.from(new Set(classes)).join(', ')
}

function sortHomeroomAssignments(
  assignments: NonNullable<UsersTableProps['users'][number]['homeroomAssignments']>
) {
  return [...assignments].sort((left, right) => compareText(
    left.class?.tahunAjaran ? `${left.class?.name || ''} - ${left.class.tahunAjaran}` : left.class?.name || '',
    right.class?.tahunAjaran ? `${right.class?.name || ''} - ${right.class.tahunAjaran}` : right.class?.name || '',
  ))
}

function buildStudentUsername(name: string, absen: number) {
  const firstName = name.trim().split(/\s+/)[0] || 'siswa'
  const normalizedName = firstName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

  return `${normalizedName || 'siswa'}${String(absen).padStart(2, '0')}`
}
