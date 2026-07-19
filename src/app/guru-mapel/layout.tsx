import { AppLayout } from '@/components/layouts/AppLayout'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function GuruMapelLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (!user || user.teachingAssignments.length === 0) {
    redirect('/login')
  }

  return <AppLayout role={user.role} initialUser={user}>{children}</AppLayout>
}
