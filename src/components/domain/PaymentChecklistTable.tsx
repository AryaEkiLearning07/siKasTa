'use client'

import { useState, useEffect } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusPill } from '@/components/ui/Badge'
import { MoneyValue } from '@/components/ui/MoneyValue'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

type Student = {
  id: string
  name: string
  status: 'AKTIF' | 'BEBAS_KAS' | 'PINDAH'
  payments: { isPaid: boolean; amount: number }[]
}

type Props = { classId: string; year: number; month: number; kasNominal?: number; readOnly?: boolean; addStudentHref?: string }

export function PaymentChecklistTable({ classId, year, month, kasNominal = 0, readOnly = false, addStudentHref }: Props) {
  const { addToast } = useToast()
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const controller = new AbortController()
    fetchStudents(controller.signal)

    return () => controller.abort()
  }, [classId, year, month])

  async function fetchStudents(signal?: AbortSignal) {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/classes/${classId}/students?year=${year}&month=${month}`, { signal })
      const data = await res.json()
      if (!signal?.aborted && data.students) setStudents(data.students)
    } catch {
      if (!signal?.aborted) addToast('error', 'Gagal memuat')
    } finally {
      if (!signal?.aborted) setIsLoading(false)
    }
  }

  async function handleToggle(student: Student) {
    const currentIsPaid = student.payments[0]?.isPaid || false
    const previousPayments = student.payments
    const nextIsPaid = !currentIsPaid

    setTogglingIds(prev => new Set(prev).add(student.id))
    setStudents(prev => prev.map(s => s.id === student.id
      ? { ...s, payments: [{ ...(s.payments[0] || { amount: kasNominal }), isPaid: nextIsPaid }] }
      : s))

    try {
      const res = await fetch('/api/payments/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: student.id, year, month, isPaid: nextIsPaid }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStudents(prev => prev.map(s => s.id === student.id
          ? { ...s, payments: previousPayments }
          : s))
        addToast('error', data.error || 'Gagal')
        return
      }

      if (data.payment) {
        setStudents(prev => prev.map(s => s.id === student.id
          ? { ...s, payments: [{ isPaid: data.payment.isPaid, amount: data.payment.amount }] }
          : s))
      }
    } catch {
      setStudents(prev => prev.map(s => s.id === student.id
        ? { ...s, payments: previousPayments }
        : s))
      addToast('error', 'Koneksi gagal')
    } finally {
      setTogglingIds(prev => { const n = new Set(prev); n.delete(student.id); return n })
    }
  }

  if (isLoading) return <SkeletonRows />

  const aktif = students.filter(s => s.status === 'AKTIF')
  const paidCount = aktif.filter(s => s.payments[0]?.isPaid).length
  const progress = aktif.length > 0 ? Math.round((paidCount / aktif.length) * 100) : 0

  if (students.length === 0) {
    return (
      <EmptyState
        title="Belum Ada Siswa"
        description="Tambahkan siswa terlebih dahulu"
        action={addStudentHref ? { label: '+ Tambah Siswa', href: addStudentHref } : undefined}
      />
    )
  }

  return (
    <div className="space-y-4">
      <ProgressBar progress={progress} paid={paidCount} total={aktif.length} year={year} month={month} />
      <PaymentMatrix
        students={students}
        kasNominal={kasNominal}
        readOnly={readOnly}
        togglingIds={togglingIds}
        onToggle={handleToggle}
      />
    </div>
  )
}

function ProgressBar({ progress, paid, total, year, month }: {
  progress: number; paid: number; total: number; year: number; month: number
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-brand-ink">Progress {month}/{year}</span>
        <span className="text-sm font-bold text-brand-green">{progress}%</span>
      </div>
      <div className="w-full bg-neutral-100 rounded-full h-2">
        <div className="bg-brand-green h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-xs text-neutral-500 mt-2">{paid} dari {total} siswa aktif telah membayar</p>
    </div>
  )
}

function PaymentMatrix({ students, kasNominal, readOnly, togglingIds, onToggle }: {
  students: Student[]; kasNominal: number; readOnly: boolean; togglingIds: Set<string>; onToggle: (student: Student) => void
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <caption className="sr-only">Matrix pembayaran kas siswa</caption>
          <thead className="bg-brand-cream">
            <tr>
              <th scope="col" className="w-14 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">No</th>
              <th scope="col" className="min-w-56 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Nama Siswa</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">Nominal Kas</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-neutral-500">Status</th>
              {!readOnly && (
                <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-neutral-500">Ceklis Bayar</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {students.map((student, index) => {
              const isPaid = student.payments[0]?.isPaid || false
              const isAktif = student.status === 'AKTIF'
              const isToggling = togglingIds.has(student.id)
              const amount = student.payments[0]?.amount ?? kasNominal
              const status = isPaid ? 'LUNAS' : isAktif ? 'BELUM_BAYAR' : student.status

              return (
                <tr key={student.id} className={cn('transition-colors hover:bg-brand-cream/50', isToggling && 'opacity-60')}>
                  <td className="px-4 py-3 text-sm text-neutral-500">{index + 1}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-brand-ink">{student.name}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <MoneyValue amount={amount} variant="neutral" className="text-sm" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusPill status={status} size="sm" />
                  </td>
                  {!readOnly && (
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isPaid}
                        disabled={!isAktif || isToggling}
                        onChange={() => onToggle(student)}
                        aria-label={`Tandai pembayaran kas ${student.name}`}
                        className="h-5 w-5 rounded border-neutral-300 text-brand-green focus:ring-2 focus:ring-brand-green disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SkeletonRows() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <Skeleton className="h-24 rounded-xl" />
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="grid grid-cols-5 gap-4 border-b border-neutral-200 bg-brand-cream px-4 py-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-4" />)}
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="grid grid-cols-5 gap-4 border-b border-neutral-100 px-4 py-3 last:border-b-0">
            {[1, 2, 3, 4, 5].map(cell => <Skeleton key={cell} className="h-5" />)}
          </div>
        ))}
      </div>
    </div>
  )
}
