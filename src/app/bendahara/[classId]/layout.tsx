import { AppLayout } from '@/components/layouts/AppLayout'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function BendaharaLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'BENDAHARA') {
    redirect('/login')
  }

  return <AppLayout role="BENDAHARA" initialUser={user}>{children}</AppLayout>
}
