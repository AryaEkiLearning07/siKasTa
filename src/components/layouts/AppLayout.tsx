'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'
import { useRouteLoading } from '@/components/ui/RouteLoading'
import { ROLE_LABELS } from '@/lib/roles'
import { cn } from '@/lib/utils'

type User = {
  id: string
  name: string
  role: string
  classId: string | null
  teachingAssignments?: { id: string; classId: string; className: string; subjectId: string; subjectName: string }[]
  homeroomAssignments?: { id: string; classId: string; className: string }[]
}

type Props = { children: React.ReactNode; role: string; initialUser?: User | null }
type NavigationItem = {
  href: string
  label: string
  icon: React.ComponentProps<typeof Icon>['name']
  group?: string
}

export function AppLayout({ children, role, initialUser = null }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const { addToast } = useToast()
  const { startRouteLoading } = useRouteLoading()
  const [user, setUser] = useState<User | null>(initialUser)
  const [isLoading, setIsLoading] = useState(!initialUser)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const navigationItems = useMemo(() => getNavigationItems(role, user), [role, user])
  const navigationGroups = useMemo(() => groupNavigationItems(navigationItems), [navigationItems])

  useEffect(() => {
    if (initialUser) return

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
  }, [initialUser, router, startRouteLoading])

  useEffect(() => {
    if (!isMobileNavOpen) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isMobileNavOpen])

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      addToast('success', 'Berhasil logout')
      startRouteLoading('Membuka halaman login')
      router.push('/login')
      router.refresh()
    } catch { addToast('error', 'Terjadi kesalahan')
    } finally { setIsLoggingOut(false) }
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-brand-cream">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-green" />
    </div>
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      <DesktopSidebar
        user={user}
        navigationGroups={navigationGroups}
        pathname={pathname}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      <div className="min-h-screen md:ml-72">
        <nav className="bg-white border-b-2 border-l-4 border-l-brand-green shadow-sm md:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white p-1 shadow-sm ring-1 ring-neutral-200">
                  <img src="/logo-spensagu.png" alt="Logo SMP Negeri 1 Dlanggu" className="h-full w-full object-contain" />
                </div>
                <div>
                  <span className="text-xl font-bold text-brand-ink font-serif">siKasta</span>
                  <p className="text-xs text-neutral-500">Sistem Kas dan Tabungan</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileNavOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center self-center rounded-lg text-brand-ink hover:bg-neutral-100"
                aria-label="Buka menu"
              >
                <Icon name="menu" />
              </button>
            </div>
          </div>
        </nav>

        <MobileSidebar
          isOpen={isMobileNavOpen}
          onClose={() => setIsMobileNavOpen(false)}
          user={user}
          navigationGroups={navigationGroups}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>

        <footer className="border-t border-neutral-200 py-6 mt-8">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm text-neutral-500">
            <p>siKasta - Sistem Kas dan Tabungan SMP Negeri 1 Dlanggu</p>
          </div>
        </footer>
      </div>
    </div>
  )
}

function DesktopSidebar({
  user,
  navigationGroups,
  pathname,
  onLogout,
  isLoggingOut,
}: {
  user: User | null
  navigationGroups: { label: string; items: NavigationItem[] }[]
  pathname: string
  onLogout: () => void
  isLoggingOut: boolean
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-neutral-200 bg-white shadow-sm md:flex">
      <div className="border-b border-neutral-200 px-5 py-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm ring-1 ring-neutral-200">
            <img src="/logo-spensagu.png" alt="Logo SMP Negeri 1 Dlanggu" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <p className="font-serif text-2xl font-bold leading-tight text-brand-ink">siKasta</p>
            <p className="text-sm leading-snug text-neutral-500">Sistem Kas dan Tabungan</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-5" aria-label="Menu utama">
        {navigationGroups.map((group) => (
          <div key={group.label} className="space-y-2">
            {(navigationGroups.length > 1 || group.label !== 'Menu') && (
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{group.label}</p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <DesktopSidebarLink key={item.href} item={item} pathname={pathname} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-neutral-200 p-4">
        {user && (
          <div className="mb-3 rounded-lg bg-brand-cream px-3 py-3">
            <p className="truncate text-sm font-semibold text-brand-ink">{user.name}</p>
            {user.name.trim().toLowerCase() !== ROLE_LABELS[user.role]?.trim().toLowerCase() && (
              <p className="truncate text-xs text-neutral-500">{ROLE_LABELS[user.role]}</p>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          fullWidth
          onClick={onLogout}
          isLoading={isLoggingOut}
          leftIcon={<Icon name="logout" size={16} />}
          className="justify-start text-neutral-600 hover:text-danger"
        >
          Keluar
        </Button>
      </div>
    </aside>
  )
}

function DesktopSidebarLink({ item, pathname }: { item: NavigationItem; pathname: string }) {
  const isActive = isNavigationItemActive(pathname, item.href)

  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2',
        isActive
          ? 'bg-brand-green text-white shadow-sm'
          : 'text-neutral-600 hover:bg-brand-green-bg hover:text-brand-green'
      )}
    >
      <Icon name={item.icon} size={18} />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

function MobileSidebar({
  isOpen,
  onClose,
  user,
  navigationGroups,
  onLogout,
  isLoggingOut,
}: {
  isOpen: boolean
  onClose: () => void
  user: User | null
  navigationGroups: { label: string; items: NavigationItem[] }[]
  onLogout: () => void
  isLoggingOut: boolean
}) {
  if (!isOpen) return null

  return (
    <aside
      className="fixed inset-0 z-[100] flex flex-col bg-brand-green text-white transition-opacity duration-200 md:hidden"
      aria-label="Menu utama"
    >
      <div className="flex min-h-16 items-center justify-between px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm ring-1 ring-white/30">
            <img src="/logo-spensagu.png" alt="Logo SMP Negeri 1 Dlanggu" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <p className="font-serif text-xl font-bold leading-tight text-white">siKasta</p>
            <p className="truncate text-xs text-white/75">Sistem Kas dan Tabungan</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white hover:bg-white/10"
          aria-label="Tutup menu"
        >
          <Icon name="x" size={28} />
        </button>
      </div>

      {user && (
        <div className="mx-5 rounded-lg border border-white/15 bg-white/10 px-4 py-3">
          <p className="text-sm font-semibold text-white">{user.name}</p>
          {user.name.trim().toLowerCase() !== ROLE_LABELS[user.role]?.trim().toLowerCase() && (
            <p className="text-xs text-white/70">{ROLE_LABELS[user.role]}</p>
          )}
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-5 py-6">
        <div className="space-y-5">
          {navigationGroups.map((group) => (
            <div key={group.label} className="space-y-2">
              {navigationGroups.length > 1 && (
                <p className="px-3 text-xs font-semibold uppercase tracking-wide text-white/60">{group.label}</p>
              )}
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="flex min-h-12 items-center justify-between rounded-lg px-3 text-sm font-semibold text-white hover:bg-white/10"
                >
                  <span className="flex items-center gap-3">
                    <Icon name={item.icon} size={18} />
                    {item.label}
                  </span>
                  <Icon name="chevron-down" size={18} className="-rotate-90 text-white/65" />
                </Link>
              ))}
            </div>
          ))}
        </div>
      </nav>

      <div className="border-t border-white/15 p-5">
        <button
          type="button"
          onClick={onLogout}
          disabled={isLoggingOut}
          className="flex min-h-12 w-full items-center justify-between rounded-lg px-3 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-70"
        >
          <span className="flex items-center gap-3">
            <Icon name="logout" size={18} />
            {isLoggingOut ? 'Keluar...' : 'Keluar'}
          </span>
        </button>
      </div>
    </aside>
  )
}

function getNavigationItems(role: string, user?: User | null): NavigationItem[] {
  const classId = user?.classId || user?.homeroomAssignments?.[0]?.classId || null
  const hasTeachingAssignments = Boolean(user?.teachingAssignments?.length)

  switch (role) {
    case 'ADMIN':
      return [
        { href: '/admin/kelas', label: 'Kelas', icon: 'school' },
        { href: '/admin/akun', label: 'Akun', icon: 'users' },
        { href: '/admin/migrasi', label: 'Migrasi', icon: 'calendar-check' },
        { href: '/admin/log', label: 'Log', icon: 'book' },
      ]
    case 'KEPALA_SEKOLAH':
      return [{ href: '/kepala-sekolah', label: 'Laporan', icon: 'chart' }]
    case 'GURU':
      return [{ href: '/guru-mapel', label: 'Kelas Diajar', icon: 'book', group: 'Guru Mata Pelajaran' }]
    case 'WALI_KELAS':
      return [
        ...(classId ? classNavigation('wali-kelas', classId, true, false, true, 'Wali Kelas') : []),
        ...(hasTeachingAssignments ? [{ href: '/guru-mapel', label: 'Kelas Diajar', icon: 'book', group: 'Guru Mata Pelajaran' } as NavigationItem] : []),
      ]
    case 'BENDAHARA':
      return classId ? classNavigation('bendahara', classId, false, true, false) : []
    default:
      return []
  }
}

function classNavigation(rolePath: string, classId: string, showStudents: boolean, showExpenses: boolean, showSavings = false, group?: string) {
  const baseHref = `/${rolePath}/${classId}`
  const items: NavigationItem[] = [{ href: baseHref, label: 'Kas Kelas', icon: 'home', group }]

  if (showStudents) {
    items.push({ href: `${baseHref}/siswa`, label: 'Siswa', icon: 'users', group })
  }

  if (showExpenses) {
    items.push({ href: `${baseHref}/pengeluaran`, label: 'Pengeluaran', icon: 'receipt', group })
  }

  if (showSavings) {
    items.push({ href: `${baseHref}/tabungan`, label: 'Tabungan', icon: 'wallet', group })
  }

  if (rolePath === 'wali-kelas') {
    items.push({ href: `${baseHref}/pengaturan`, label: 'Pengaturan', icon: 'settings', group })
  }

  return items
}

function groupNavigationItems(items: NavigationItem[]) {
  const groups = new Map<string, NavigationItem[]>()

  items.forEach((item) => {
    const key = item.group || 'Menu'
    groups.set(key, [...(groups.get(key) || []), item])
  })

  return Array.from(groups.entries()).map(([label, groupItems]) => ({ label, items: groupItems }))
}

function isNavigationItemActive(pathname: string, href: string) {
  if (pathname === href) return true
  return href === '/guru-mapel' && pathname.startsWith('/guru-mapel/')
}
