'use client'

import { useParams } from 'next/navigation'
import { SavingsManagement } from '@/components/domain/SavingsManagement'

export default function WaliKelasTabunganPage() {
  const params = useParams()
  const classId = params.classId as string

  return <SavingsManagement classId={classId} />
}
