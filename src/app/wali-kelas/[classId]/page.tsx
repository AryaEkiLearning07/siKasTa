'use client'

import { ClassDashboard } from '@/components/class/ClassDashboard'

export default function WaliKelasPage() {
  return (
    <ClassDashboard
      role="WALI_KELAS"
      canManageStudents={true}
      canTogglePayment={false}
      canRecordExpense={false}
      canChangeKas={true}
    />
  )
}
