'use client'

import { cn } from '@/lib/utils'

type MonthNavigatorProps = {
  year: number
  month: number
  onChange: (year: number, month: number) => void
  maxMonth?: { year: number; month: number }
  minMonth?: { year: number; month: number }
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

export function MonthNavigator({ year, month, onChange, maxMonth, minMonth }: MonthNavigatorProps) {
  function isFuture() {
    if (!maxMonth) return false
    if (year > maxMonth.year) return true
    if (year === maxMonth.year && month >= maxMonth.month) return true
    return false
  }

  function isPast() {
    if (!minMonth) return false
    if (year < minMonth.year) return true
    if (year === minMonth.year && month <= minMonth.month) return true
    return false
  }

  function prev() {
    if (isPast()) return
    let m = month - 1
    let y = year
    if (m < 1) { m = 12; y-- }
    onChange(y, m)
  }

  function next() {
    if (isFuture()) return
    let m = month + 1
    let y = year
    if (m > 12) { m = 1; y++ }
    onChange(y, m)
  }

  const future = isFuture()
  const past = isPast()

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={prev}
        disabled={past}
        aria-label="Bulan sebelumnya"
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2',
          past ? 'cursor-not-allowed text-neutral-300' : 'text-neutral-600 hover:bg-neutral-100'
        )}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <span className="min-w-[140px] text-center font-medium text-brand-ink">
        {MONTH_NAMES[month - 1]} {year}
      </span>

      <button
        onClick={next}
        disabled={future}
        aria-label="Bulan berikutnya"
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2',
          future ? 'cursor-not-allowed text-neutral-300' : 'text-neutral-600 hover:bg-neutral-100'
        )}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}
