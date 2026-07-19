'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { MoneyValue } from '@/components/ui/MoneyValue'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'
import { formatDate } from '@/lib/utils'
import { EXPENSE_CATEGORIES } from '@/lib/roles'

type Expense = {
  id: string
  category: string
  itemName: string
  amount: number
  photoUrl: string | null
  note: string | null
  spentAt: string
  recordedBy: { name: string }
}

type Props = { classId: string; year: number; month: number; canAdd: boolean }

export function ExpenseManagement({ classId, year, month, canAdd }: Props) {
  const { addToast } = useToast()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [form, setForm] = useState({ category: 'KONSUMSI', itemName: '', amount: '', note: '', spentAt: new Date().toISOString().split('T')[0], photoUrl: '' })
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    if (!form.itemName) { setErrors({ itemName: 'Nama barang wajib diisi' }); return }
    if (!form.amount || parseInt(form.amount.replace(/[^0-9]/g, '')) <= 0) { setErrors({ amount: 'Jumlah tidak valid' }); return }
    if (!form.spentAt) { setErrors({ spentAt: 'Tanggal wajib diisi' }); return }

    setIsSubmitting(true)
    try {
      const photoUrl = receiptFile ? await uploadReceipt(receiptFile) : form.photoUrl || null
      const res = await fetch(`/api/classes/${classId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: form.category,
          itemName: form.itemName,
          amount: parseInt(form.amount.replace(/[^0-9]/g, '')),
          note: form.note || null,
          photoUrl,
          spentAt: new Date(form.spentAt).toISOString(),
        }),
      })
      if (!res.ok) { const d = await res.json(); addToast('error', d.error || 'Gagal'); return }
      addToast('success', 'Pengeluaran disimpan')
      setIsModalOpen(false)
      setReceiptFile(null)
      setForm({ category: 'KONSUMSI', itemName: '', amount: '', note: '', spentAt: new Date().toISOString().split('T')[0], photoUrl: '' })
      fetchExpenses()
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Koneksi gagal')
    } finally { setIsSubmitting(false) }
  }

  async function uploadReceipt(file: File) {
    const presignRes = await fetch('/api/uploads/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, fileType: file.type }),
    })
    const presignData = await presignRes.json()
    if (!presignRes.ok) throw new Error(presignData.error || 'Gagal menyiapkan upload bukti')

    const uploadRes = await fetch(presignData.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    })
    if (!uploadRes.ok) throw new Error('Gagal upload bukti pengeluaran')

    return presignData.publicUrl as string
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/classes/${classId}/expenses/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); addToast('error', d.error || 'Gagal'); return }
      addToast('success', 'Pengeluaran dihapus')
      setDeleteTarget(null)
      fetchExpenses()
    } catch { addToast('error', 'Koneksi gagal')
    } finally { setIsDeleting(false) }
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const categoryOptions = Object.entries(EXPENSE_CATEGORIES).map(([v, l]) => ({ value: v, label: l }))

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 rounded-xl" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-danger-bg text-danger">
            <Icon name="receipt" size={18} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-brand-ink font-serif">Pengeluaran</h2>
            <p className="text-sm text-neutral-500">
              Total: <MoneyValue amount={total} variant="expense" className="text-sm" />
            </p>
          </div>
        </div>
        {canAdd && <Button onClick={() => setIsModalOpen(true)} leftIcon={<Icon name="receipt" size={16} />}>Tambah</Button>}
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          title="Belum Ada Pengeluaran"
          description="Tidak ada pengeluaran pada bulan ini"
          action={canAdd ? { label: '+ Tambah Pengeluaran', onClick: () => setIsModalOpen(true) } : undefined}
        />
      ) : (
        <div className="space-y-3">
          {expenses.map(e => (
            <Card key={e.id} className="hover:shadow-card-hover">
              <CardContent>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 text-xs bg-neutral-100 text-neutral-700 rounded">{EXPENSE_CATEGORIES[e.category as keyof typeof EXPENSE_CATEGORIES]}</span>
                      <span className="text-xs text-neutral-400">{formatDate(e.spentAt)}</span>
                    </div>
                    <p className="font-semibold text-brand-ink">{e.itemName}</p>
                    {e.note && <p className="text-sm text-neutral-500 mt-1">{e.note}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                      <span>Oleh {e.recordedBy.name}</span>
                      {e.photoUrl && (
                        <a href={e.photoUrl} target="_blank" rel="noreferrer" className="font-medium text-brand-green hover:underline">
                          Lihat bukti
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <MoneyValue amount={e.amount} variant="expense" as="p" />
                    {canAdd && (
                      <button onClick={() => setDeleteTarget(e)} className="text-xs text-danger hover:underline mt-1">Hapus</button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tambah Pengeluaran">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Kategori" value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} options={categoryOptions} />
          <Input label="Nama Barang/Jasa" value={form.itemName} onChange={(e) => setForm(f => ({ ...f, itemName: e.target.value }))} error={errors.itemName} placeholder="Contoh: Air mineral 2 galon" />
          <Input label="Jumlah (Rp)" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: parseInt(e.target.value.replace(/[^0-9]/g, '') || '0', 10).toLocaleString('id-ID') }))} error={errors.amount} placeholder="0" />
          <Input label="Tanggal Pengeluaran" type="date" value={form.spentAt} onChange={(e) => setForm(f => ({ ...f, spentAt: e.target.value }))} error={errors.spentAt} />
          <Input label="Bukti Pengeluaran" type="file" accept="image/*" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} hint="Upload foto nota/kwitansi jika ada." />
          <Input label="Catatan (opsional)" value={form.note} onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Catatan" />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" isLoading={isSubmitting}>Simpan</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Hapus Pengeluaran" message={`Yakin menghapus "${deleteTarget?.itemName}"?`} variant="danger" isLoading={isDeleting} />
    </div>
  )
}
