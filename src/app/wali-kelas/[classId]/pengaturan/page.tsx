'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/ui/Icon'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { UserFormModal, type UserFormData } from '@/components/admin/UserComponents'
import { ROLE_LABELS } from '@/lib/roles'

type Account = {
  id: string
  name: string
  username: string
  role: 'WALI_KELAS' | 'BENDAHARA'
}

type StudentOption = {
  id: string
  name: string
  absen: number
}

export default function WaliKelasPengaturanPage() {
  const params = useParams()
  const classId = params.classId as string
  const { addToast } = useToast()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [target, setTarget] = useState<Account | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [userErrors, setUserErrors] = useState<Record<string, string>>({})
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([])
  const [editTarget, setEditTarget] = useState<Account | null>(null)
  const [editForm, setEditForm] = useState({ name: '', username: '', password: '' })
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [isEditingAccount, setIsEditingAccount] = useState(false)

  useEffect(() => {
    fetchAccounts()
    fetchStudents()
  }, [classId])

  async function fetchAccounts() {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/classes/${classId}/accounts`)
      const data = await res.json()
      if (!res.ok) {
        addToast('error', data.error || 'Gagal memuat akun')
        return
      }
      setAccounts(data.accounts || [])
    } catch {
      addToast('error', 'Koneksi gagal')
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchStudents() {
    try {
      const res = await fetch(`/api/classes/${classId}/students`)
      const data = await res.json()
      if (!res.ok) {
        addToast('error', data.error || 'Gagal memuat siswa')
        return
      }
      setStudentOptions((data.students || []).map((student: { id: string; name: string }, index: number) => ({
        id: student.id,
        name: student.name,
        absen: index + 1,
      })))
    } catch {
      addToast('error', 'Koneksi siswa gagal')
    }
  }

  function openPasswordModal(account: Account) {
    setTarget(account)
    setPassword('')
    setConfirmPassword('')
    setError('')
  }

  function openBendaharaModal() {
    setUserErrors({})
    setIsUserModalOpen(true)
  }

  function openEditModal(account: Account) {
    setEditTarget(account)
    setEditForm({ name: account.name, username: account.username, password: '' })
    setEditErrors({})
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
        addToast('error', data.error || 'Gagal membuat akun bendahara')
        return
      }
      addToast('success', 'Akun bendahara berhasil dibuat')
      setIsUserModalOpen(false)
      fetchAccounts()
    } catch {
      addToast('error', 'Koneksi gagal')
    } finally {
      setIsCreatingUser(false)
    }
  }

  async function handleChangePassword(event: React.FormEvent) {
    event.preventDefault()
    if (!target) return

    setError('')
    if (password.length < 6) {
      setError('Password minimal 6 karakter')
      return
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak sama')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/classes/${classId}/accounts/${target.id}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Password gagal diganti')
        return
      }
      addToast('success', `Password ${target.name} berhasil diganti`)
      setTarget(null)
      fetchAccounts()
    } catch {
      setError('Koneksi gagal')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleEditAccount(event: React.FormEvent) {
    event.preventDefault()
    if (!editTarget) return

    setEditErrors({})
    if (editForm.name.trim().length < 2) {
      setEditErrors({ name: 'Nama minimal 2 karakter' })
      return
    }
    if (editForm.username.trim().length < 3) {
      setEditErrors({ username: 'Username minimal 3 karakter' })
      return
    }
    if (editForm.password && editForm.password.length < 6) {
      setEditErrors({ password: 'Password minimal 6 karakter' })
      return
    }

    setIsEditingAccount(true)
    try {
      const res = await fetch(`/api/classes/${classId}/accounts/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          username: editForm.username,
          password: editForm.password,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        const fieldErrors = data.details?.fieldErrors || {}
        setEditErrors({
          name: fieldErrors.name?.[0],
          username: fieldErrors.username?.[0],
          password: fieldErrors.password?.[0],
          form: data.error || 'Akun gagal diperbarui',
        })
        addToast('error', data.error || 'Akun gagal diperbarui')
        return
      }

      addToast('success', 'Akun bendahara berhasil diperbarui')
      setEditTarget(null)
      fetchAccounts()
    } catch {
      setEditErrors({ form: 'Koneksi gagal' })
      addToast('error', 'Koneksi gagal')
    } finally {
      setIsEditingAccount(false)
    }
  }

  const bendahara = accounts.find((account) => account.role === 'BENDAHARA')

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-green-bg text-brand-green">
            <Icon name="settings" size={19} />
          </span>
          <div>
            <h1 className="font-serif text-2xl font-bold text-brand-ink">Pengaturan</h1>
            <p className="text-sm text-neutral-500">Kelola akun wali kelas dan bendahara</p>
          </div>
        </div>
        <div>
          {!bendahara && (
            <Button
              type="button"
              leftIcon={<Icon name="plus" size={16} />}
              onClick={openBendaharaModal}
            >
              Tambah Bendahara
            </Button>
          )}
        </div>
      </div>

      {accounts.length === 0 ? (
        <EmptyState title="Belum Ada Akun" description="Akun kelas belum tersedia." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardContent>
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-blue-bg text-brand-blue-info">
                    <Icon name={account.role === 'WALI_KELAS' ? 'school' : 'wallet'} size={18} />
                  </span>
                  <h2 className="font-serif text-lg font-semibold text-brand-ink">{ROLE_LABELS[account.role]}</h2>
                </div>

                <div className="overflow-hidden rounded-lg border border-neutral-200">
                  <table className="w-full">
                    <tbody className="divide-y divide-neutral-100 bg-white">
                      <tr>
                        <th className="w-36 bg-brand-cream px-4 py-3 text-left text-xs font-semibold uppercase text-neutral-500">Nama Lengkap</th>
                        <td className="px-4 py-3 text-sm font-medium text-brand-ink">{account.name}</td>
                      </tr>
                      <tr>
                        <th className="bg-brand-cream px-4 py-3 text-left text-xs font-semibold uppercase text-neutral-500">Username</th>
                        <td className="px-4 py-3 text-sm text-neutral-600">@{account.username}</td>
                      </tr>
                      <tr>
                        <th className="bg-brand-cream px-4 py-3 text-left text-xs font-semibold uppercase text-neutral-500">Password</th>
                        <td className="px-4 py-3 text-sm font-semibold tracking-widest text-brand-ink">******</td>
                      </tr>
                      <tr>
                        <th className="bg-brand-cream px-4 py-3 text-left text-xs font-semibold uppercase text-neutral-500">Aksi</th>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {account.role === 'BENDAHARA' && (
                              <Button
                                variant="secondary"
                                size="sm"
                                leftIcon={<Icon name="settings" size={16} />}
                                onClick={() => openEditModal(account)}
                              >
                                Edit Akun
                              </Button>
                            )}
                            <Button
                              variant="secondary"
                              size="sm"
                              leftIcon={<Icon name="settings" size={16} />}
                              onClick={() => openPasswordModal(account)}
                            >
                              Ganti Password
                            </Button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
          {!bendahara && (
            <Card>
              <CardContent>
                <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-4 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-success-bg text-success">
                    <Icon name="wallet" size={20} />
                  </span>
                  <div>
                    <h2 className="font-serif text-lg font-semibold text-brand-ink">Bendahara Belum Dibuat</h2>
                    <p className="mt-1 text-sm text-neutral-500">Buat akun bendahara untuk mengelola pembayaran kas dan pengeluaran kelas.</p>
                  </div>
                  <Button
                    type="button"
                    leftIcon={<Icon name="plus" size={16} />}
                    onClick={openBendaharaModal}
                  >
                    Tambah Bendahara
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Modal isOpen={!!target} onClose={() => setTarget(null)} title={`Ganti Password - ${target?.name || ''}`} size="sm">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="Password Baru"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={error && password.length < 6 ? error : undefined}
            placeholder="Minimal 6 karakter"
            autoComplete="new-password"
          />
          <Input
            label="Konfirmasi Password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            error={error && password.length >= 6 ? error : undefined}
            placeholder="Ulangi password baru"
            autoComplete="new-password"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setTarget(null)}>Batal</Button>
            <Button type="submit" isLoading={isSubmitting}>Simpan</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit Akun Bendahara - ${editTarget?.name || ''}`} size="sm">
        <form onSubmit={handleEditAccount} className="space-y-4">
          {editErrors.form && (
            <div className="rounded-lg border border-danger/20 bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
              {editErrors.form}
            </div>
          )}
          <Input
            label="Nama Lengkap"
            value={editForm.name}
            onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
            error={editErrors.name}
            placeholder="Nama bendahara"
          />
          <Input
            label="Username"
            value={editForm.username}
            onChange={(event) => setEditForm((current) => ({ ...current, username: event.target.value }))}
            error={editErrors.username}
            placeholder="username"
            autoComplete="username"
          />
          <Input
            label="Password Baru"
            type="password"
            value={editForm.password}
            onChange={(event) => setEditForm((current) => ({ ...current, password: event.target.value }))}
            error={editErrors.password}
            placeholder="Kosongkan jika tidak diganti"
            autoComplete="new-password"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setEditTarget(null)}>Batal</Button>
            <Button type="submit" isLoading={isEditingAccount}>Simpan</Button>
          </div>
        </form>
      </Modal>

      <UserFormModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSubmit={handleCreateBendahara}
        isSubmitting={isCreatingUser}
        errors={userErrors}
        classes={[{ id: classId, name: 'Kelas Ini', tingkat: '' }]}
        currentClassId={classId}
        allowedRoles={['BENDAHARA']}
        defaultRole="BENDAHARA"
        title="Buat Akun Bendahara"
        studentOptions={studentOptions}
      />
    </div>
  )
}
