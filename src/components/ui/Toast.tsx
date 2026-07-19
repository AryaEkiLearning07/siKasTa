'use client'

import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { createPortal } from 'react-dom'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextType {
  addToast: (type: ToastType, message: string, duration?: number) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const addToast = useCallback((type: ToastType, message: string, duration?: number) => {
    const id = Math.random().toString(36).slice(2)
    const defaultDuration = type === 'success' ? 1800 : type === 'info' ? 2500 : 4500
    setToasts([{ id, type, message, duration: duration ?? defaultDuration }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {mounted && toasts.length > 0 &&
        createPortal(
          <div
            className="pointer-events-none fixed right-4 top-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:top-6"
            aria-live="polite"
          >
            {toasts.map((toast) => (
              <FeedbackModal key={toast.id} toast={toast} onRemove={removeToast} />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  )
}

const TOAST_CONFIG: Record<ToastType, { title: string; border: string; text: string; iconBg: string; icon: React.ReactNode }> = {
  success: {
    title: 'Berhasil',
    border: 'border-success',
    text: 'text-success',
    iconBg: 'bg-success-bg',
    icon: (
      <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  error: {
    title: 'Gagal',
    border: 'border-danger',
    text: 'text-danger',
    iconBg: 'bg-danger-bg',
    icon: (
      <svg className="h-5 w-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
  warning: {
    title: 'Perhatian',
    border: 'border-warning',
    text: 'text-warning',
    iconBg: 'bg-warning-bg',
    icon: (
      <svg className="h-5 w-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  info: {
    title: 'Informasi',
    border: 'border-info',
    text: 'text-info',
    iconBg: 'bg-info-bg',
    icon: (
      <svg className="h-5 w-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
}

function FeedbackModal({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const config = TOAST_CONFIG[toast.type]
  const role = toast.type === 'error' || toast.type === 'warning' ? 'alert' : 'status'

  useEffect(() => {
    if (toast.duration) {
      const timer = setTimeout(() => onRemove(toast.id), toast.duration)
      return () => clearTimeout(timer)
    }
  }, [toast.id, toast.duration, onRemove])

  return (
    <div
      className={`pointer-events-auto relative w-full rounded-lg border bg-white p-4 pr-12 text-left shadow-card-hover animate-slide-in ${config.border}`}
      role={role}
      aria-labelledby={`feedback-title-${toast.id}`}
      aria-describedby={`feedback-message-${toast.id}`}
    >
      <div className="flex gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${config.iconBg}`}>
          {config.icon}
        </div>
        <div className="min-w-0">
          <h2 id={`feedback-title-${toast.id}`} className={`text-sm font-semibold ${config.text}`}>
            {config.title}
          </h2>
          <p id={`feedback-message-${toast.id}`} className="mt-1 text-sm leading-5 text-neutral-600">
            {toast.message}
          </p>
        </div>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2"
        aria-label="Tutup"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
