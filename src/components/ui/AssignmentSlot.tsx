'use client'

import { Button } from './Button'
import { Icon } from './Icon'
import { formatEmptyValue, EMPTY_TABLE_VALUE } from '@/lib/format'

type AssignmentSlotProps = {
  label: string
  value?: { id: string; name: string } | string | null
  onCreate?: () => void
  loading?: boolean
}

export function AssignmentSlot({ label, value, onCreate, loading = false }: AssignmentSlotProps) {
  const displayValue = typeof value === 'string' ? value : value?.name

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-neutral-500">{label}:</span>
      {loading ? (
        <span className="text-sm italic text-neutral-400">Memuat...</span>
      ) : displayValue ? (
        <span className="text-right text-sm font-medium text-brand-ink">{displayValue}</span>
      ) : onCreate ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onCreate}
          leftIcon={<Icon name="users" size={16} />}
          className="text-brand-green hover:text-brand-greenDark"
        >
          Buat Akun
        </Button>
      ) : (
        <span className="text-sm italic text-neutral-400">{formatEmptyValue(null, 'card')}</span>
      )}
    </div>
  )
}

export function PercentBadge({ value, className = '' }: { value: number | null; className?: string }) {
  if (value === null || value === undefined) {
    return <span className={`font-medium text-neutral-400 ${className}`}>{EMPTY_TABLE_VALUE}</span>
  }

  const colorClass =
    value >= 100
      ? 'bg-success-bg text-success'
      : value >= 50
        ? 'bg-warning-bg text-warning'
        : 'bg-danger-bg text-danger'

  return (
    <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${colorClass} ${className}`}>
      {value}% Lunas
    </span>
  )
}
