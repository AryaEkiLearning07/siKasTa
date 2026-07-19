'use client'

import type { ComponentProps } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { MoneyValue } from '@/components/ui/MoneyValue'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatusPill } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'
import { cn, formatDate, formatRupiah, parseRupiah } from '@/lib/utils'
import { formatEmptyValue } from '@/lib/format'

type StudentSavings = {
  id: string
  name: string
  nisn: string | null
  status: 'AKTIF' | 'BEBAS_KAS' | 'PINDAH'
  accountId: string
  isLocked: boolean
  balance: number
  totalDeposits: number
  totalWithdrawals: number
  lastTransactionAt: string | null
}

type SavingsTransaction = {
  id: string
  type: 'DEPOSIT' | 'WITHDRAWAL'
  amount: number
  transactionDate: string
  note: string | null
  student: { id: string; name: string; nisn: string | null }
  recordedBy: { id: string; name: string; role: string }
  approvedBy: { id: string; name: string; role: string } | null
}

type WithdrawalRequest = {
  id: string
  amount: number
  reason: string | null
  status: 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK'
  rejectedReason: string | null
  createdAt: string
  processedAt: string | null
  student: { id: string; name: string; nisn: string | null }
  requestedBy: { id: string; name: string; role: string }
  processedBy: { id: string; name: string; role: string } | null
}

type SavingsData = {
  class: {
    id: string
    name: string
    tingkat: string
    tahunAjaran: string
  }
  totals: {
    balance: number
    totalDeposits: number
    totalWithdrawals: number
    lockedAccounts: number
    totalStudents: number
  }
  students: StudentSavings[]
  recentTransactions: SavingsTransaction[]
  withdrawalRequests: WithdrawalRequest[]
}

type Props = {
  classId: string
}

function todayInputValue() {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 10)
}

function requestStatusLabel(status: WithdrawalRequest['status']) {
  if (status === 'MENUNGGU') return 'Menunggu'
  if (status === 'DISETUJUI') return 'Disetujui'
  return 'Ditolak'
}

function transactionLabel(type: SavingsTransaction['type']) {
  return type === 'DEPOSIT' ? 'Setoran' : 'Penarikan'
}

export function SavingsManagement({ classId }: Props) {
  const { addToast } = useToast()
  const [data, setData] = useState<SavingsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [depositModalOpen, setDepositModalOpen] = useState(false)
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false)
  const [depositForm, setDepositForm] = useState({
    studentId: '',
    amount: '',
    transactionDate: todayInputValue(),
    note: '',
  })
  const [withdrawalForm, setWithdrawalForm] = useState({
    studentId: '',
    amount: '',
    reason: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [approveTarget, setApproveTarget] = useState<WithdrawalRequest | null>(null)
  const [rejectTarget, setRejectTarget] = useState<WithdrawalRequest | null>(null)
  const [rejectedReason, setRejectedReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [exportMonth, setExportMonth] = useState(todayInputValue().slice(0, 7))

  useEffect(() => {
    const controller = new AbortController()
    fetchSavings(controller.signal)

    return () => controller.abort()
  }, [classId])

  const selectableStudents = useMemo(
    () => data?.students.filter((student) => student.status !== 'PINDAH') || [],
    [data?.students]
  )

  const studentOptions = selectableStudents.map((student, index) => ({
    value: student.id,
    label: `${String(index + 1).padStart(2, '0')} - ${student.name}`,
  }))

  async function fetchSavings(signal?: AbortSignal) {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/classes/${classId}/savings`, { signal })
      const nextData = await res.json()
      if (signal?.aborted) return

      if (!res.ok) {
        addToast('error', nextData.error || 'Gagal memuat tabungan')
        return
      }

      setData(nextData)
    } catch {
      if (!signal?.aborted) addToast('error', 'Koneksi gagal')
    } finally {
      if (!signal?.aborted) setIsLoading(false)
    }
  }

  function setFormattedDepositAmount(value: string) {
    const amount = parseRupiah(value)
    setDepositForm((current) => ({
      ...current,
      amount: amount ? amount.toLocaleString('id-ID') : '',
    }))
  }

  function setFormattedWithdrawalAmount(value: string) {
    const amount = parseRupiah(value)
    setWithdrawalForm((current) => ({
      ...current,
      amount: amount ? amount.toLocaleString('id-ID') : '',
    }))
  }

  function openDepositModal(student?: StudentSavings) {
    setErrors({})
    setDepositForm({
      studentId: student?.id || '',
      amount: '',
      transactionDate: todayInputValue(),
      note: '',
    })
    setDepositModalOpen(true)
  }

  function openWithdrawalModal(student?: StudentSavings) {
    setErrors({})
    setWithdrawalForm({
      studentId: student?.id || '',
      amount: '',
      reason: '',
    })
    setWithdrawalModalOpen(true)
  }

  async function handleDepositSubmit(event: React.FormEvent) {
    event.preventDefault()
    setErrors({})

    const amount = parseRupiah(depositForm.amount)
    if (!depositForm.studentId) {
      setErrors({ studentId: 'Siswa wajib dipilih' })
      return
    }

    if (amount <= 0) {
      setErrors({ amount: 'Nominal wajib diisi' })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/classes/${classId}/savings/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: depositForm.studentId,
          amount,
          transactionDate: depositForm.transactionDate,
          note: depositForm.note || null,
        }),
      })
      const result = await res.json()

      if (!res.ok) {
        addToast('error', result.error || 'Setoran gagal disimpan')
        return
      }

      addToast('success', 'Setoran tabungan disimpan')
      setDepositModalOpen(false)
      fetchSavings()
    } catch {
      addToast('error', 'Koneksi gagal')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleWithdrawalSubmit(event: React.FormEvent) {
    event.preventDefault()
    setErrors({})

    const amount = parseRupiah(withdrawalForm.amount)
    const selectedStudent = data?.students.find((student) => student.id === withdrawalForm.studentId)

    if (!withdrawalForm.studentId) {
      setErrors({ studentId: 'Siswa wajib dipilih' })
      return
    }

    if (amount <= 0) {
      setErrors({ amount: 'Nominal wajib diisi' })
      return
    }

    if (selectedStudent && amount > selectedStudent.balance) {
      setErrors({ amount: 'Nominal melebihi saldo' })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/classes/${classId}/savings/withdrawals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: withdrawalForm.studentId,
          amount,
          reason: withdrawalForm.reason || null,
        }),
      })
      const result = await res.json()

      if (!res.ok) {
        addToast('error', result.error || 'Pengajuan gagal disimpan')
        return
      }

      addToast('success', 'Pengajuan penarikan dibuat')
      setWithdrawalModalOpen(false)
      fetchSavings()
    } catch {
      addToast('error', 'Koneksi gagal')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function processWithdrawal(
    withdrawal: WithdrawalRequest,
    status: 'DISETUJUI' | 'DITOLAK',
    reason?: string
  ) {
    setIsProcessing(true)
    try {
      const res = await fetch(`/api/classes/${classId}/savings/withdrawals/${withdrawal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          handoverConfirmed: status === 'DISETUJUI' ? true : undefined,
          rejectedReason: status === 'DITOLAK' ? reason : undefined,
        }),
      })
      const result = await res.json()

      if (!res.ok) {
        addToast('error', result.error || 'Pengajuan gagal diproses')
        return
      }

      addToast('success', status === 'DISETUJUI' ? 'Penarikan disetujui' : 'Penarikan ditolak')
      setApproveTarget(null)
      setRejectTarget(null)
      setRejectedReason('')
      fetchSavings()
    } catch {
      addToast('error', 'Koneksi gagal')
    } finally {
      setIsProcessing(false)
    }
  }

  function handleRejectSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!rejectTarget) return
    if (!rejectedReason.trim()) {
      setErrors({ rejectedReason: 'Alasan penolakan wajib diisi' })
      return
    }

    processWithdrawal(rejectTarget, 'DITOLAK', rejectedReason)
  }

  function downloadMonthlySavingsRecap() {
    const params = new URLSearchParams({ month: exportMonth })
    window.location.href = `/api/classes/${classId}/savings/export?${params.toString()}`
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!data) {
    return (
      <EmptyState
        title="Tabungan Tidak Tersedia"
        description="Data tabungan kelas belum dapat dimuat."
        variant="error"
      />
    )
  }

  const pendingWithdrawals = data.withdrawalRequests.filter((request) => request.status === 'MENUNGGU')
  const selectedWithdrawalStudent = data.students.find((student) => student.id === withdrawalForm.studentId)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-brand-ink">Tabungan Siswa</h1>
          <p className="text-sm text-neutral-500">
            {data.class.name} - {data.class.tahunAjaran}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <Input
              type="month"
              label="Rekap Bulan"
              value={exportMonth}
              onChange={(event) => setExportMonth(event.target.value)}
            />
          </div>
          <Button
            variant="outline"
            onClick={downloadMonthlySavingsRecap}
            leftIcon={<Icon name="download" size={16} />}
          >
            Download Rekap
          </Button>
          <Button
            variant="secondary"
            onClick={() => openWithdrawalModal()}
            disabled={selectableStudents.length === 0}
            leftIcon={<Icon name="money-out" size={16} />}
          >
            Ajukan Penarikan
          </Button>
          <Button
            onClick={() => openDepositModal()}
            disabled={selectableStudents.length === 0}
            leftIcon={<Icon name="money-in" size={16} />}
          >
            Catat Setoran
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg bg-brand-green p-4 text-white shadow-card sm:p-5">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/20 text-white">
              <Icon name="wallet" size={23} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-brand-green-bg">Saldo Tabungan Terkini</p>
              <p className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">{formatRupiah(data.totals.balance)}</p>
              <p className="mt-2 inline-flex rounded-lg border border-white/20 px-3 py-1 text-xs text-white/90 sm:text-sm">
                {data.class.name} - {data.class.tahunAjaran}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <SummaryCard
              label="Setoran"
              amount={data.totals.totalDeposits}
              variant="income"
              icon="money-in"
              iconClassName="bg-success-bg text-success"
            />
            <SummaryCard
              label="Penarikan"
              amount={data.totals.totalWithdrawals}
              variant="expense"
              icon="money-out"
              iconClassName="bg-danger-bg text-danger"
            />
            <SummaryCard
              label="Rekening Siswa"
              amount={data.totals.totalStudents}
              variant="neutral"
              icon="users"
              iconClassName="bg-brand-blue-bg text-brand-blue-info"
              valueType="count"
            />
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-serif text-lg font-semibold text-brand-ink">Rekap Saldo</h2>
              <p className="text-sm text-neutral-500">Saldo dihitung dari semua transaksi setoran dan penarikan.</p>
            </div>
          </div>

          {data.students.length === 0 ? (
            <EmptyState title="Belum Ada Siswa" description="Tambahkan data siswa terlebih dahulu." />
          ) : (
            <div className="overflow-hidden rounded-lg border border-neutral-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead className="bg-brand-cream">
                    <tr>
                      <th className="w-14 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">No</th>
                      <th className="min-w-56 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Siswa</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">Setoran</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">Penarikan</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">Saldo</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 bg-white">
                    {data.students.map((student, index) => (
                      <tr key={student.id} className="hover:bg-brand-cream/50">
                        <td className="px-4 py-3 text-sm text-neutral-500">{index + 1}</td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-brand-ink">{student.name}</p>
                          <p className="text-xs text-neutral-500">NISN: {formatEmptyValue(student.nisn, 'table')}</p>
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill status={student.status} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <MoneyValue amount={student.totalDeposits} variant="income" className="text-sm" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <MoneyValue amount={student.totalWithdrawals} variant="expense" className="text-sm" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <MoneyValue amount={student.balance} variant="balance" className="text-sm" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openDepositModal(student)} disabled={student.status === 'PINDAH'}>
                              Setor
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openWithdrawalModal(student)}
                              disabled={student.status === 'PINDAH' || student.balance <= 0}
                            >
                              Tarik
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
        <Card>
          <CardContent>
            <div className="mb-4">
              <h2 className="font-serif text-lg font-semibold text-brand-ink">Pengajuan Penarikan</h2>
              <p className="text-sm text-neutral-500">{pendingWithdrawals.length} pengajuan menunggu keputusan</p>
            </div>

            {data.withdrawalRequests.length === 0 ? (
              <EmptyState title="Belum Ada Pengajuan" description="Pengajuan penarikan akan tampil di sini." />
            ) : (
              <div className="space-y-3">
                {data.withdrawalRequests.map((request) => (
                  <div key={request.id} className="rounded-lg border border-neutral-200 bg-white p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-brand-ink">{request.student.name}</p>
                          <WithdrawalStatusPill status={request.status} />
                        </div>
                        <p className="mt-1 text-sm text-neutral-500">
                          {formatDate(request.createdAt)} oleh {request.requestedBy.name}
                        </p>
                        {request.reason && <p className="mt-2 text-sm text-neutral-600">{request.reason}</p>}
                        {request.rejectedReason && (
                          <p className="mt-2 text-sm font-medium text-danger">{request.rejectedReason}</p>
                        )}
                      </div>
                      <div className="text-left sm:text-right">
                        <MoneyValue amount={request.amount} variant="expense" as="p" />
                        {request.status === 'MENUNGGU' && (
                          <div className="mt-3 flex gap-2 sm:justify-end">
                            <Button variant="secondary" size="sm" onClick={() => setRejectTarget(request)}>
                              Tolak
                            </Button>
                            <Button size="sm" onClick={() => setApproveTarget(request)}>
                              Setujui
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="mb-4">
              <h2 className="font-serif text-lg font-semibold text-brand-ink">Transaksi Terakhir</h2>
              <p className="text-sm text-neutral-500">15 catatan terbaru</p>
            </div>

            {data.recentTransactions.length === 0 ? (
              <EmptyState title="Belum Ada Transaksi" description="Setoran dan penarikan akan tampil di sini." />
            ) : (
              <div className="space-y-3">
                {data.recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-3 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-brand-ink">{transaction.student.name}</p>
                      <p className="text-xs text-neutral-500">
                        {transactionLabel(transaction.type)} - {formatDate(transaction.transactionDate)}
                      </p>
                    </div>
                    <MoneyValue
                      amount={transaction.amount}
                      variant={transaction.type === 'DEPOSIT' ? 'income' : 'expense'}
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal isOpen={depositModalOpen} onClose={() => setDepositModalOpen(false)} title="Catat Setoran Tabungan">
        <form onSubmit={handleDepositSubmit} className="space-y-4">
          <Select
            label="Siswa"
            value={depositForm.studentId}
            onChange={(event) => setDepositForm((current) => ({ ...current, studentId: event.target.value }))}
            options={studentOptions}
            placeholder="Pilih siswa"
            error={errors.studentId}
          />
          <Input
            label="Nominal"
            value={depositForm.amount}
            onChange={(event) => setFormattedDepositAmount(event.target.value)}
            placeholder="0"
            error={errors.amount}
          />
          <Input
            label="Tanggal"
            type="date"
            value={depositForm.transactionDate}
            onChange={(event) => setDepositForm((current) => ({ ...current, transactionDate: event.target.value }))}
          />
          <Input
            label="Catatan"
            value={depositForm.note}
            onChange={(event) => setDepositForm((current) => ({ ...current, note: event.target.value }))}
            placeholder="Opsional"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setDepositModalOpen(false)}>Batal</Button>
            <Button type="submit" isLoading={isSubmitting}>Simpan</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={withdrawalModalOpen} onClose={() => setWithdrawalModalOpen(false)} title="Ajukan Penarikan Tabungan">
        <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
          <Select
            label="Siswa"
            value={withdrawalForm.studentId}
            onChange={(event) => setWithdrawalForm((current) => ({ ...current, studentId: event.target.value }))}
            options={studentOptions}
            placeholder="Pilih siswa"
            error={errors.studentId}
          />
          {selectedWithdrawalStudent && (
            <div className="rounded-lg border border-neutral-200 bg-brand-cream px-4 py-3">
              <p className="text-sm text-neutral-500">Saldo tersedia</p>
              <MoneyValue amount={selectedWithdrawalStudent.balance} variant="balance" as="p" />
            </div>
          )}
          <Input
            label="Nominal"
            value={withdrawalForm.amount}
            onChange={(event) => setFormattedWithdrawalAmount(event.target.value)}
            placeholder="0"
            error={errors.amount}
          />
          <Input
            label="Alasan"
            value={withdrawalForm.reason}
            onChange={(event) => setWithdrawalForm((current) => ({ ...current, reason: event.target.value }))}
            placeholder="Opsional"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setWithdrawalModalOpen(false)}>Batal</Button>
            <Button type="submit" isLoading={isSubmitting}>Ajukan</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        onConfirm={() => approveTarget && processWithdrawal(approveTarget, 'DISETUJUI')}
        title="Setujui Penarikan"
        message={
          approveTarget
            ? `Konfirmasi penarikan ${formatRupiah(approveTarget.amount)} untuk ${approveTarget.student.name}.`
            : ''
        }
        confirmLabel="Setujui"
        isLoading={isProcessing}
      />

      <Modal isOpen={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Tolak Penarikan" size="sm">
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          <Input
            label="Alasan Penolakan"
            value={rejectedReason}
            onChange={(event) => {
              setRejectedReason(event.target.value)
              setErrors({})
            }}
            error={errors.rejectedReason}
            placeholder="Alasan"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setRejectTarget(null)}>Batal</Button>
            <Button variant="danger" type="submit" isLoading={isProcessing}>Tolak</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function SummaryCard({
  label,
  amount,
  variant,
  icon,
  iconClassName,
  valueType = 'money',
}: {
  label: string
  amount: number
  variant: 'income' | 'expense' | 'balance' | 'neutral'
  icon: ComponentProps<typeof Icon>['name']
  iconClassName: string
  valueType?: 'money' | 'count'
}) {
  return (
    <Card padding="sm" className="min-h-24 min-w-0">
      <CardContent>
        <div className="flex h-full flex-col justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconClassName}`}>
              <Icon name={icon} size={17} />
            </span>
            <p className="min-w-0 break-words text-[10px] font-bold uppercase leading-snug text-neutral-600 sm:text-xs">{label}</p>
          </div>
          {valueType === 'count' ? (
            <p className="text-xl font-bold text-brand-ink sm:text-2xl">{amount}</p>
          ) : (
            <MoneyValue amount={amount} variant={variant} className="break-words text-sm sm:text-lg" as="p" />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function WithdrawalStatusPill({ status }: { status: WithdrawalRequest['status'] }) {
  const classes = {
    MENUNGGU: 'border-warning/20 bg-warning-bg text-warning',
    DISETUJUI: 'border-success/20 bg-success-bg text-success',
    DITOLAK: 'border-danger/20 bg-danger-bg text-danger',
  }

  return (
    <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-xs font-medium', classes[status])}>
      {requestStatusLabel(status)}
    </span>
  )
}
