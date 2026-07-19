import { getCurrentUser, requireAuth, AuthError, SessionUser } from './auth'

export async function requireClassAccess(classId: string): Promise<SessionUser> {
  const user = await getCurrentUser()
  requireAuth(user)

  // ADMIN and KEPALA_SEKOLAH can access all classes
  if (user.role === 'ADMIN' || user.role === 'KEPALA_SEKOLAH') {
    return user
  }

  // Other class-scoped roles must belong to this class.
  const hasHomeroomAssignment = user.homeroomAssignments.some((assignment) => assignment.classId === classId)
  if (user.classId !== classId && !hasHomeroomAssignment) {
    throw new AuthError('Anda tidak memiliki akses ke kelas ini')
  }

  return user
}

export function requireWaliKelas(user: SessionUser): void {
  if (user.role !== 'WALI_KELAS' && user.homeroomAssignments.length === 0) {
    throw new AuthError('Hanya wali kelas yang dapat melakukan aksi ini')
  }
}

export function requireCanMutatePayment(user: SessionUser): void {
  if (user.role !== 'BENDAHARA') {
    throw new AuthError('Anda tidak memiliki akses untuk mengubah pembayaran')
  }
}

export function requireCanCreateExpense(user: SessionUser): void {
  if (user.role !== 'BENDAHARA') {
    throw new AuthError('Anda tidak memiliki akses untuk membuat pengeluaran')
  }
}

export function requireCanManageStudent(user: SessionUser): void {
  if (user.role !== 'WALI_KELAS' && user.homeroomAssignments.length === 0) {
    throw new AuthError('Hanya wali kelas yang dapat mengelola data siswa')
  }
}

export function canReadClass(user: SessionUser, classId: string): boolean {
  if (user.role === 'ADMIN' || user.role === 'KEPALA_SEKOLAH') {
    return true
  }
  return user.classId === classId || user.homeroomAssignments.some((assignment) => assignment.classId === classId)
}
