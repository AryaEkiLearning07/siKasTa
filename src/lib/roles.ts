// Role labels in Indonesian
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  KEPALA_SEKOLAH: 'Kepala Sekolah',
  GURU: 'Guru Mata Pelajaran',
  WALI_KELAS: 'Wali Kelas',
  BENDAHARA: 'Bendahara',
}

// Permissions per role
export const ROLE_PERMISSIONS = {
  canManageClasses: ['ADMIN'],
  canCreateWaliKelas: ['ADMIN'],
  canCreateBendahara: ['WALI_KELAS'],
  canTeachSubject: ['GURU', 'WALI_KELAS'],
  canManageStudents: ['ADMIN', 'WALI_KELAS'],
  canManageSavings: ['WALI_KELAS'],
  canTogglePayment: ['BENDAHARA'],
  canRecordExpense: ['BENDAHARA'],
  canDeleteExpense: ['BENDAHARA'],
  canChangeStudentStatus: ['ADMIN', 'WALI_KELAS'],
  canViewAllClasses: ['ADMIN', 'KEPALA_SEKOLAH'],
  canExportReports: ['ADMIN', 'KEPALA_SEKOLAH'],
}

export function hasPermission(role: string, permission: keyof typeof ROLE_PERMISSIONS): boolean {
  return ROLE_PERMISSIONS[permission].includes(role)
}

// Status configurations
export const STUDENT_STATUS = {
  AKTIF: { label: 'Aktif', color: 'neutral' },
  BEBAS_KAS: { label: 'Bebas Kas', color: 'warning' },
  PINDAH: { label: 'Pindah', color: 'muted' },
} as const

export const PAYMENT_STATUS = {
  LUNAS: { label: 'Lunas', color: 'success' },
  BELUM_BAYAR: { label: 'Belum Bayar', color: 'neutral' },
} as const

export const EXPENSE_CATEGORIES = {
  KONSUMSI: 'Konsumsi',
  ALAT_KEBERSIHAN: 'Alat Kebersihan',
  KEGIATAN_KELAS: 'Kegiatan Kelas',
  LAINNYA: 'Lainnya',
} as const
