'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/ui/Icon'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

type TeachingAssignment = {
  id: string
  tahunAjaran: string
  class: {
    id: string
    name: string
    tingkat: string
    tahunAjaran: string
    _count: { students: number }
  }
  subject: {
    id: string
    name: string
  }
}

export default function GuruMapelPage() {
  const { addToast } = useToast()
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/guru-mapel/classes', {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (!res.ok) {
          addToast('error', data.error || 'Gagal memuat kelas diajar')
          return
        }
        setAssignments(data.assignments || [])
      })
      .catch(() => {
        if (!controller.signal.aborted) addToast('error', 'Gagal memuat kelas diajar')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [addToast])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => <Skeleton key={item} className="h-32 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-brand-ink">Kelas Diajar</h1>
        <p className="mt-1 text-neutral-500">Pilih kelas dan mata pelajaran untuk absensi, penilaian, dan rekap.</p>
      </div>

      {assignments.length === 0 ? (
        <EmptyState title="Belum Ada Kelas Diajar" description="Hubungi admin untuk menambahkan mapel dan kelas ajar." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assignments.map((assignment) => (
            <Link key={assignment.id} href={`/guru-mapel/${assignment.id}`} className="block">
              <Card interactive className="h-full">
                <CardContent>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-green text-white">
                        <Icon name="book" size={20} />
                      </span>
                      <div className="min-w-0">
                        <h2 className="font-serif text-lg font-semibold text-brand-ink">{assignment.subject.name}</h2>
                        <p className="text-sm font-medium text-neutral-700">Kelas {assignment.class.name}</p>
                        <p className="mt-1 text-sm text-neutral-500">
                          {assignment.class.tahunAjaran} · {assignment.class._count.students} siswa
                        </p>
                      </div>
                    </div>
                    <Icon name="chevron-down" size={18} className="-rotate-90 text-neutral-400" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
