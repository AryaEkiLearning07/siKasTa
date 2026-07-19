'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { MoneyValue } from '@/components/ui/MoneyValue'
import { MonthNavigator } from '@/components/ui/MonthNavigator'
import { PercentBadge } from '@/components/ui/AssignmentSlot'
import { useToast } from '@/components/ui/Toast'
import { formatEmptyValue } from '@/lib/format'

type ClassOverview = {
  classId: string
  className: string
  tingkat: string
  waliKelas: string | null
  totalSiswa: number
  bebasKas: number
  kasNominal: number
  pemasukan: number
  pengeluaran: number
  saldo: number
  paidCount: number
  aktifCount: number
}

type Data = {
  year: number
  month: number
  classes: ClassOverview[]
  totals: {
    totalSiswa: number
    bebasKas: number
    pemasukan: number
    pengeluaran: number
    saldo: number
    paidCount: number
    aktifCount: number
  }
}

export default function KepalaSekolahDashboard() {
  const { addToast } = useToast()
  const [data, setData] = useState<Data | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)

  useEffect(() => {
    const controller = new AbortController()
    fetchData(controller.signal)

    return () => controller.abort()
  }, [year, month])

  async function fetchData(signal?: AbortSignal) {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/reports/overview?year=${year}&month=${month}`, { signal })
      const result = await res.json()
      if (signal?.aborted) return
      if (res.ok) {
        setData(result)
      } else {
        addToast('error', result.error || 'Gagal memuat')
      }
    } catch {
      if (!signal?.aborted) addToast('error', 'Koneksi gagal')
    } finally {
      if (!signal?.aborted) setIsLoading(false)
    }
  }

  async function handleExport() {
    try {
      const res = await fetch(`/api/reports/export?year=${year}&month=${month}`)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `laporan-kas-${year}-${month}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      addToast('success', 'File berhasil didownload')
    } catch {
      addToast('error', 'Gagal mendownload')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <ReportTableSkeleton />
      </div>
    )
  }

  if (!data) {
    return <EmptyState variant="error" title="Gagal Memuat" description="Tidak dapat mengambil data" />
  }

  const percentTotal = data.totals.aktifCount > 0 ? Math.round((data.totals.paidCount / data.totals.aktifCount) * 100) : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-brand-ink">Laporan Kas Kelas</h1>
          <p className="text-neutral-500">Rekapitulasi kas semua kelas</p>
        </div>
        <Button onClick={handleExport} variant="secondary">Export CSV</Button>
      </div>

      <MonthNavigator
        year={year}
        month={month}
        onChange={(nextYear, nextMonth) => {
          setYear(nextYear)
          setMonth(nextMonth)
        }}
        maxMonth={{ year: new Date().getFullYear(), month: new Date().getMonth() + 1 }}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent>
            <p className="mb-1 text-sm text-neutral-500">Total Siswa</p>
            <p className="text-xl font-bold text-brand-ink">{data.totals.totalSiswa}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="mb-1 text-sm text-neutral-500">Bebas Kas</p>
            <p className="text-xl font-bold text-brand-ink">{data.totals.bebasKas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="mb-1 text-sm text-neutral-500">Total Pemasukan</p>
            <MoneyValue amount={data.totals.pemasukan} variant="income" className="text-xl" as="p" />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="mb-1 text-sm text-neutral-500">Total Saldo</p>
            <MoneyValue amount={data.totals.saldo} variant="balance" className="text-xl" as="p" />
          </CardContent>
        </Card>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full">
          <thead className="border-b bg-brand-cream">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-500">Kelas</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-500">Wali Kelas</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase text-neutral-500">Siswa</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-neutral-500">Kas/Bulan</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-neutral-500">Pemasukan</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-neutral-500">Pengeluaran</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-neutral-500">Saldo</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase text-neutral-500">% Lunas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {data.classes.map(cls => {
              const percent = cls.aktifCount > 0 ? Math.round((cls.paidCount / cls.aktifCount) * 100) : null
              return (
                <tr key={cls.classId} className="hover:bg-brand-cream/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-brand-ink">{cls.className}</p>
                    <p className="text-xs text-neutral-500">{cls.tingkat}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-brand-ink">{formatEmptyValue(cls.waliKelas, 'table')}</td>
                  <td className="px-4 py-3 text-center text-sm">{cls.totalSiswa}</td>
                  <td className="px-4 py-3 text-right"><MoneyValue amount={cls.kasNominal} variant="neutral" /></td>
                  <td className="px-4 py-3 text-right"><MoneyValue amount={cls.pemasukan} variant="income" /></td>
                  <td className="px-4 py-3 text-right"><MoneyValue amount={cls.pengeluaran} variant="expense" /></td>
                  <td className="px-4 py-3 text-right"><MoneyValue amount={cls.saldo} variant="balance" /></td>
                  <td className="px-4 py-3 text-center"><PercentBadge value={percent} /></td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="border-t bg-brand-cream font-semibold">
            <tr>
              <td className="px-4 py-3">TOTAL</td>
              <td />
              <td className="px-4 py-3 text-center">{data.totals.totalSiswa}</td>
              <td />
              <td className="px-4 py-3 text-right"><MoneyValue amount={data.totals.pemasukan} variant="income" /></td>
              <td className="px-4 py-3 text-right"><MoneyValue amount={data.totals.pengeluaran} variant="expense" /></td>
              <td className="px-4 py-3 text-right"><MoneyValue amount={data.totals.saldo} variant="balance" /></td>
              <td className="px-4 py-3 text-center"><PercentBadge value={percentTotal} /></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function ReportTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="grid grid-cols-8 gap-4 border-b bg-brand-cream px-4 py-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-4 rounded" />
        ))}
      </div>
      <div className="divide-y divide-neutral-100">
        {Array.from({ length: 6 }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-8 gap-4 px-4 py-3">
            {Array.from({ length: 8 }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-4 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
