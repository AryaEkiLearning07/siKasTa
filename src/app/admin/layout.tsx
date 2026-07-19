import { AppLayout } from '@/components/layouts/AppLayout'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    redirect('/login')
  }

  return <AppLayout role="ADMIN" initialUser={user}>{children}</AppLayout>
}
