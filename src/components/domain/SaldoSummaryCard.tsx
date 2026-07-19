'use client'

import type { ComponentProps } from 'react'
import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { MoneyValue } from '@/components/ui/MoneyValue'
import { Icon } from '@/components/ui/Icon'
import { formatRupiah } from '@/lib/utils'

type SaldoSummaryCardProps = {
  classId: string
  year: number
  month: number
  className?: string
}

type SaldoData = {
  year: number
  month: number
  pemasukan: number
  pengeluaran: number
  saldo: number
  saldoTerkini: number
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

export function SaldoSummaryCard({ classId, year, month, className }: SaldoSummaryCardProps) {
  const [data, setData] = useState<SaldoData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchSaldo() {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/classes/${classId}/saldo?year=${year}&month=${month}`, {
          signal: controller.signal,
        })
        const result = await res.json()
        if (controller.signal.aborted) return
        if (result.pemasukan !== undefined) {
          setData(result)
        } else {
          setError(result.error || 'Gagal memuat data')
        }
      } catch {
        if (!controller.signal.aborted) setError('Terjadi kesalahan koneksi')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    fetchSaldo()

    return () => controller.abort()
  }, [classId, year, month])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-lg" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return null
  }

  const monthName = MONTH_NAMES[(data?.month || month) - 1]

  return (
    <div className={`space-y-4 ${className || ''}`}>
      <div className="rounded-lg bg-brand-green p-4 text-white shadow-card sm:p-5">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/20 text-white">
            <Icon name="wallet" size={23} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-green-bg">Saldo Kas Terkini</p>
            <p className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">{formatRupiah(data?.saldoTerkini || 0)}</p>
            <p className="mt-2 inline-flex rounded-lg border border-white/20 px-3 py-1 text-xs text-white/90 sm:text-sm">
              Total semua bulan
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <MetricCard
            label={`Pemasukan ${monthName}`}
            amount={data?.pemasukan || 0}
            variant="income"
            icon="money-in"
            iconClassName="bg-success-bg text-success"
          />
          <MetricCard
            label={`Pengeluaran ${monthName}`}
            amount={data?.pengeluaran || 0}
            variant="expense"
            icon="money-out"
            iconClassName="bg-danger-bg text-danger"
          />
          <MetricCard
            label={`Saldo ${monthName}`}
            amount={data?.saldo || 0}
            variant="balance"
            icon="wallet"
            iconClassName="bg-brand-blue-bg text-brand-blue-info"
          />
      </div>
    </div>
  )
}

function MetricCard({
  label,
  amount,
  variant,
  icon,
  iconClassName,
}: {
  label: string
  amount: number
  variant: 'income' | 'expense' | 'balance'
  icon: ComponentProps<typeof Icon>['name']
  iconClassName: string
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
          <MoneyValue amount={amount} variant={variant} className="break-words text-sm sm:text-lg" as="p" />
        </div>
      </CardContent>
    </Card>
  )
}
