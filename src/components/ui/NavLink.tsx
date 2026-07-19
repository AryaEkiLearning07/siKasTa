'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useRouteLoading } from './RouteLoading'

type NavLinkProps = {
  href: string
  children: React.ReactNode
  className?: string
}

export function NavLink({ href, children, className = '' }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'relative px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2',
        isActive && 'font-semibold text-brand-green',
        className
      )}
    >
      {children}
      {isActive && <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-brand-green" />}
    </Link>
  )
}

// Sidebar NavLink for mobile/bottom nav
export function SideNavLink({ href, children, icon }: NavLinkProps & { icon?: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { startRouteLoading } = useRouteLoading()
  const isActive = pathname === href

  return (
    <button
      onClick={() => {
        if (!isActive) {
          startRouteLoading()
        }
        router.push(href)
      }}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'relative flex min-w-[64px] flex-col items-center gap-1 rounded-lg px-3 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2',
        isActive ? 'font-semibold text-brand-green' : 'text-neutral-500'
      )}
    >
      {icon && <span className="text-xl">{icon}</span>}
      <span className="text-xs font-medium">{children}</span>
      {isActive && <span className="absolute bottom-0 w-8 h-0.5 bg-brand-green rounded-full" />}
    </button>
  )
}
