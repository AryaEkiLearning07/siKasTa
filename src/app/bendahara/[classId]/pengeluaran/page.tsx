'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { ExpenseManagement } from '@/components/class/ExpenseManagement'

export default function BendaharaPengeluaranPage() {
  const params = useParams()
  const classId = params.classId as string
  const [year] = useState(new Date().getFullYear())
  const [month] = useState(new Date().getMonth() + 1)

  return <ExpenseManagement classId={classId} year={year} month={month} canAdd={true} />
}
