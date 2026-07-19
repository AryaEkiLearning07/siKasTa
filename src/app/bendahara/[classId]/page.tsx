'use client'

import { ClassDashboard } from '@/components/class/ClassDashboard'

export default function BendaharaPage() {
  return (
    <ClassDashboard
      role="BENDAHARA"
      canManageStudents={false}
      canTogglePayment={true}
      canRecordExpense={true}
      canChangeKas={false}
    />
  )
}
