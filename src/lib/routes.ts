// Role-based routing helper
import { SessionUser } from '@/lib/auth'

type DashboardUser = Pick<SessionUser, 'role' | 'classId'>

type RouteConfig = {
  admin: string[]
  kepalaSekolah: string[]
  guruMapel: string[]
  waliKelas: string[]
  bendahara: string[]
}

export const ROLE_ROUTES: Record<string, string> = {
  ADMIN: '/admin/kelas',
  KEPALA_SEKOLAH: '/kepala-sekolah',
  GURU: '/guru-mapel',
  WALI_KELAS: '/wali-kelas',
  BENDAHARA: '/bendahara',
}

export function getDashboardRoute(user: DashboardUser): string {
  if (!user) return '/login'

  const route = ROLE_ROUTES[user.role]
  if (!route) return '/login'

  // Add classId for class-scoped roles
  if (user.classId && ['WALI_KELAS', 'BENDAHARA'].includes(user.role)) {
    return `${route}/${user.classId}`
  }

  return route
}

export function canAccessRoute(role: string, path: string): boolean {
  if (path.startsWith('/admin')) return role === 'ADMIN'
  if (path.startsWith('/kepala-sekolah')) return role === 'KEPALA_SEKOLAH'
  if (path.startsWith('/guru-mapel')) return role === 'GURU' || role === 'WALI_KELAS'
  if (path.startsWith('/wali-kelas')) return role === 'WALI_KELAS'
  if (path.startsWith('/bendahara')) return role === 'BENDAHARA'
  return true
}
