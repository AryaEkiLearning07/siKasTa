'use client'

import { Card, CardContent } from '@/components/ui/Card'
import { MoneyValue } from '@/components/ui/MoneyValue'
import { formatDate } from '@/lib/utils'
import { EXPENSE_CATEGORIES } from '@/lib/roles'

type Expense = {
  id: string
  category: string
  itemName: string
  amount: number
  note: string | null
  spentAt: string
  recordedBy: { name: string }
}

type Props = { expense: Expense; onDelete?: () => void }

export function ExpenseCard({ expense, onDelete }: Props) {
  const category = EXPENSE_CATEGORIES[expense.category as keyof typeof EXPENSE_CATEGORIES] || expense.category

  return (
    <Card className="hover:shadow-card-hover">
      <CardContent>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-xs bg-neutral-100 text-neutral-700 rounded">{category}</span>
              <span className="text-xs text-neutral-400">{formatDate(expense.spentAt)}</span>
            </div>
            <p className="font-semibold text-brand-ink">{expense.itemName}</p>
            {expense.note && <p className="text-sm text-neutral-500 mt-1">{expense.note}</p>}
            <p className="text-xs text-neutral-400 mt-2">Oleh {expense.recordedBy.name}</p>
          </div>
          <div className="text-right">
            <MoneyValue amount={expense.amount} variant="expense" as="p" />
            {onDelete && (
              <button onClick={onDelete} className="text-xs text-danger hover:underline mt-1">Hapus</button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ExpenseSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-4 w-24 bg-neutral-200 rounded" />
          <div className="h-5 w-40 bg-neutral-200 rounded" />
        </div>
        <div className="h-5 w-20 bg-neutral-200 rounded" />
      </div>
    </div>
  )
}
