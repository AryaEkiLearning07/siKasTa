'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { EXPENSE_CATEGORIES } from '@/lib/roles'

type Props = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  classId: string
}

export function ExpenseForm({ isOpen, onClose, onSuccess, classId }: Props) {
  const { addToast } = useToast()
  const [form, setForm] = useState({
    category: 'KONSUMSI',
    itemName: '',
    amount: '',
    note: '',
    spentAt: new Date().toISOString().split('T')[0],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.itemName) { addToast('error', 'Nama barang wajib diisi'); return }
    if (!form.amount || parseInt(form.amount.replace(/[^0-9]/g, '')) <= 0) { addToast('error', 'Jumlah tidak valid'); return }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/classes/${classId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: form.category,
          itemName: form.itemName,
          amount: parseInt(form.amount.replace(/[^0-9]/g, '')),
          note: form.note || null,
          spentAt: new Date(form.spentAt).toISOString(),
        }),
      })
      if (!res.ok) { const d = await res.json(); addToast('error', d.error || 'Gagal'); return }
      addToast('success', 'Pengeluaran disimpan')
      onSuccess()
      onClose()
      setForm({ category: 'KONSUMSI', itemName: '', amount: '', note: '', spentAt: new Date().toISOString().split('T')[0] })
    } catch { addToast('error', 'Koneksi gagal')
    } finally { setIsSubmitting(false) }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tambah Pengeluaran">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select label="Kategori" value={form.category}
          onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
          options={Object.entries(EXPENSE_CATEGORIES).map(([v, l]) => ({ value: v, label: l }))} />
        <Input label="Nama Barang/Jasa" value={form.itemName}
          onChange={(e) => setForm(f => ({ ...f, itemName: e.target.value }))}
          placeholder="Contoh: Air mineral 2 galon" />
        <Input label="Jumlah (Rp)" value={form.amount}
          onChange={(e) => setForm(f => ({ ...f, amount: parseInt(e.target.value.replace(/[^0-9]/g, '') || '0', 10).toLocaleString('id-ID') }))}
          placeholder="0" />
        <Input label="Tanggal" type="date" value={form.spentAt}
          onChange={(e) => setForm(f => ({ ...f, spentAt: e.target.value }))} />
        <Input label="Catatan (opsional)" value={form.note}
          onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))}
          placeholder="Catatan" />
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" type="button" onClick={onClose}>Batal</Button>
          <Button type="submit" isLoading={isSubmitting}>Simpan</Button>
        </div>
      </form>
    </Modal>
  )
}
