import { AppLayout } from '@/components/layouts/AppLayout'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function WaliKelasLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ classId: string }>
}) {
  const user = await getCurrentUser()
  const { classId } = await params
  const canOpenHomeroom = user?.role === 'WALI_KELAS' && (
    user.classId === classId ||
    user.homeroomAssignments.some((assignment) => assignment.classId === classId)
  )

  if (!user || !canOpenHomeroom) {
    redirect('/login')
  }

  return <AppLayout role="WALI_KELAS" initialUser={user}>{children}</AppLayout>
}
