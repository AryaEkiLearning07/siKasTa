'use client'

import type { ReactNode } from 'react'
import { EmptyState } from './EmptyState'
import { Spinner } from './Spinner'

type DataStateProps = {
  isLoading?: boolean
  isEmpty?: boolean
  error?: ReactNode
  loadingLabel?: string
  loading?: ReactNode
  empty?: ReactNode
  errorState?: ReactNode
  emptyTitle?: string
  emptyDescription?: string
  errorTitle?: string
  children: ReactNode
}

export function DataState({
  isLoading = false,
  isEmpty = false,
  error,
  loadingLabel = 'Memuat data',
  loading,
  empty,
  errorState,
  emptyTitle = 'Belum ada data',
  emptyDescription = 'Data akan muncul di sini setelah tersedia.',
  errorTitle = 'Gagal memuat data',
  children,
}: DataStateProps) {
  if (isLoading) {
    return (
      <div aria-busy="true" aria-live="polite">
        {loading || (
          <div className="flex min-h-40 items-center justify-center rounded-lg border border-neutral-200 bg-white">
            <div className="flex items-center gap-3 text-sm font-medium text-neutral-500">
              <Spinner size="sm" label={loadingLabel} />
              <span>{loadingLabel}</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (error) {
    return (
      <>
        {errorState || (
          <EmptyState
            variant="error"
            title={errorTitle}
            description={typeof error === 'string' ? error : 'Terjadi kesalahan. Coba muat ulang halaman.'}
          />
        )}
      </>
    )
  }

  if (isEmpty) {
    return <>{empty || <EmptyState title={emptyTitle} description={emptyDescription} />}</>
  }

  return <>{children}</>
}
