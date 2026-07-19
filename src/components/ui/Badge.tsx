'use client'

import { cn } from '@/lib/utils'

export type StatusType = 'AKTIF' | 'BEBAS_KAS' | 'PINDAH' | 'LUNAS' | 'BELUM_BAYAR' | 'PROGRESS'

interface StatusPillProps {
  status: StatusType
  size?: 'sm' | 'md'
  className?: string
}

const STATUS_CONFIG: Record<StatusType, { label: string; bgColor: string; textColor: string; borderColor?: string }> = {
  AKTIF: {
    label: 'Aktif',
    bgColor: 'bg-neutral-100',
    textColor: 'text-neutral-700'
  },
  BEBAS_KAS: {
    label: 'Bebas Kas',
    bgColor: 'bg-warning-bg',
    textColor: 'text-warning',
    borderColor: 'border-warning/20'
  },
  PINDAH: {
    label: 'Pindah',
    bgColor: 'bg-neutral-50',
    textColor: 'text-neutral-500'
  },
  LUNAS: {
    label: 'Lunas',
    bgColor: 'bg-success-bg',
    textColor: 'text-success'
  },
  BELUM_BAYAR: {
    label: 'Belum Bayar',
    bgColor: 'bg-white',
    textColor: 'text-neutral-500',
    borderColor: 'border-neutral-200'
  },
  PROGRESS: {
    label: 'Dalam Proses',
    bgColor: 'bg-info-bg',
    textColor: 'text-info'
  },
}

export function StatusPill({ status, size = 'md', className }: StatusPillProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        config.bgColor,
        config.textColor,
        config.borderColor || 'border-transparent',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        className
      )}
    >
      {config.label}
    </span>
  )
}
