'use client'

import { formatRupiah } from '@/lib/utils'
import { cn } from '@/lib/utils'

type MoneyValueProps = {
  amount: number
  variant: 'income' | 'expense' | 'balance' | 'neutral'
  className?: string
  as?: 'span' | 'p' | 'div'
}

const VARIANT_CLASSES = {
  income: 'text-success',
  expense: 'text-danger',
  balance: (amount: number) => (amount >= 0 ? 'text-success' : 'text-danger'),
  neutral: 'text-brand-ink',
}

export function MoneyValue({ amount, variant, className = '', as: Tag = 'span' }: MoneyValueProps) {
  let colorClass = VARIANT_CLASSES[variant]
  if (variant === 'balance') {
    colorClass = typeof colorClass === 'function' ? colorClass(amount) : colorClass
  }

  return <Tag className={cn('font-bold', colorClass as string, className)}>{formatRupiah(amount)}</Tag>
}

// Badge version for tables with background
type MoneyBadgeProps = {
  amount: number
  variant: 'income' | 'expense' | 'balance' | 'neutral'
  className?: string
}

export function MoneyBadge({ amount, variant, className = '' }: MoneyBadgeProps) {
  const colorClass = variant === 'expense' ? 'text-danger' : variant === 'income' ? 'text-success' : variant === 'balance' ? (amount >= 0 ? 'text-success' : 'text-danger') : 'text-brand-ink'
  const bgClass = variant === 'expense' ? 'bg-danger-bg' : variant === 'income' ? 'bg-success-bg' : variant === 'balance' ? (amount >= 0 ? 'bg-success-bg' : 'bg-danger-bg') : 'bg-neutral-100'

  return (
    <span className={cn('inline-flex items-center rounded px-2 py-0.5 text-sm font-semibold', colorClass, bgClass, className)}>
      {formatRupiah(amount)}
    </span>
  )
}
