'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { MoneyValue } from '@/components/ui/MoneyValue'
import { useToast } from '@/components/ui/Toast'
import { ExpenseCard, ExpenseSkeleton } from './ExpenseCard'

type Props = { classId: string; year: number; month: number; canAdd?: boolean; onAdd?: () => void }

export function ExpenseList({ classId, year, month, canAdd = false, onAdd }: Props) {
  const { addToast } = useToast()
  const [expenses, setExpenses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => { fetchExpenses() }, [classId, year, month])

  async function fetchExpenses() {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/classes/${classId}/expenses?year=${year}&month=${month}`)
      const data = await res.json()
      if (data.expenses) setExpenses(data.expenses)
    } catch { addToast('error', 'Gagal memuat')
    } finally { setIsLoading(false) }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/classes/${classId}/expenses/${id}`, { method: 'DELETE' })
      if (!res.ok) { addToast('error', 'Gagal'); return }
      addToast('success', 'Pengeluaran dihapus')
      fetchExpenses()
    } catch { addToast('error', 'Koneksi gagal') }
  }

  if (isLoading) return <div className="space-y-3">{[1, 2, 3].map(i => <ExpenseSkeleton key={i} />)}</div>

  const total = expenses.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-brand-ink">Pengeluaran</h3>
          <p className="text-sm text-neutral-500">
            Total: <MoneyValue amount={total} variant="expense" className="text-sm" />
          </p>
        </div>
        {canAdd && onAdd && <ExpenseAddButton onAdd={onAdd} />}
      </div>
      {expenses.length === 0 ? (
        <EmptyState
          title="Belum Ada Pengeluaran"
          description="Tidak ada pengeluaran"
          action={canAdd && onAdd ? { label: '+ Tambah Pengeluaran', onClick: onAdd } : undefined}
        />
      ) : (
        expenses.map(e => <ExpenseCard key={e.id} expense={e} onDelete={canAdd ? () => handleDelete(e.id) : undefined} />)
      )}
    </div>
  )
}

function ExpenseAddButton({ onAdd }: { onAdd: () => void }) {
  return <Button onClick={onAdd}>+ Tambah</Button>
}
