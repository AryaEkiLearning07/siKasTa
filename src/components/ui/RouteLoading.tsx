'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Spinner } from './Spinner'

type RouteLoadingContextType = {
  startRouteLoading: (message?: string) => void
  stopRouteLoading: () => void
}

const RouteLoadingContext = createContext<RouteLoadingContextType | undefined>(undefined)

export function useRouteLoading() {
  const context = useContext(RouteLoadingContext)
  if (!context) {
    throw new Error('useRouteLoading must be used within RouteLoadingProvider')
  }
  return context
}

export function RouteLoadingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('Memuat halaman')
  const previousPathname = useRef(pathname)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearLoadingTimers = useCallback(() => {
    if (showDelayRef.current) {
      clearTimeout(showDelayRef.current)
      showDelayRef.current = null
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const stopRouteLoading = useCallback(() => {
    clearLoadingTimers()
    setIsLoading(false)
  }, [clearLoadingTimers])

  const startRouteLoading = useCallback((nextMessage = 'Memuat halaman') => {
    setMessage(nextMessage)
    clearLoadingTimers()
    showDelayRef.current = setTimeout(() => {
      setIsLoading(true)
      showDelayRef.current = null
    }, 300)
    timeoutRef.current = setTimeout(() => {
      setIsLoading(false)
      timeoutRef.current = null
    }, 10000)
  }, [clearLoadingTimers])

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname
      stopRouteLoading()
    }
  }, [pathname, stopRouteLoading])

  useEffect(() => {
    return () => clearLoadingTimers()
  }, [clearLoadingTimers])

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      ) {
        return
      }

      const target = event.target instanceof Element ? event.target : null
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null
      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return
      }

      if (anchor.target && anchor.target !== '_self') return
      if (anchor.hasAttribute('download')) return

      const url = new URL(anchor.href, window.location.href)
      const isInternal = url.origin === window.location.origin
      const isSameLocation = url.pathname === window.location.pathname && url.search === window.location.search

      if (isInternal && !isSameLocation) {
        startRouteLoading()
      }
    }

    document.addEventListener('click', handleDocumentClick, true)
    return () => document.removeEventListener('click', handleDocumentClick, true)
  }, [startRouteLoading])

  return (
    <RouteLoadingContext.Provider value={{ startRouteLoading, stopRouteLoading }}>
      {children}
      {isLoading && (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-[60]"
          role="status"
          aria-live="polite"
          aria-label={message}
        >
          <div className="h-1 overflow-hidden bg-brand-green-bg">
            <div className="h-full w-1/2 animate-route-progress bg-brand-green" />
          </div>
          <div className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-lg border border-neutral-200 bg-white/95 px-3 py-2 text-sm font-semibold text-brand-ink shadow-card backdrop-blur">
            <Spinner size="sm" label={message} className="text-brand-green" />
            <span>{message}</span>
          </div>
        </div>
      )}
    </RouteLoadingContext.Provider>
  )
}
