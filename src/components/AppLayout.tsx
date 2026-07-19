'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout as RoleAppLayout } from '@/components/layouts/AppLayout'
import { useRouteLoading } from '@/components/ui/RouteLoading'

type User = {
  role: string
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { startRouteLoading } = useRouteLoading()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/auth/me', { cache: 'no-store', signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (controller.signal.aborted) return
        if (data.user) {
          setUser(data.user)
        } else {
          startRouteLoading('Membuka halaman login')
          router.push('/login')
        }
      })
      .catch(() => {
        if (controller.signal.aborted) return
        startRouteLoading('Membuka halaman login')
        router.push('/login')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => controller.abort()
  }, [router, startRouteLoading])

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-cream">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-green" />
      </div>
    )
  }

  return <RoleAppLayout role={user.role}>{children}</RoleAppLayout>
}
