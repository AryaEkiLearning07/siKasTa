'use client'

import { useParams } from 'next/navigation'
import { StudentManagement } from '@/components/class/StudentManagement'

export default function WaliKelasSiswaPage() {
  const params = useParams()
  const classId = params.classId as string

  return <StudentManagement classId={classId} canManage={true} />
}
