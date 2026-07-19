import { AppLayout } from '@/components/layouts/AppLayout'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function KepalaSekolahLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'KEPALA_SEKOLAH') {
    redirect('/login')
  }

  return <AppLayout role="KEPALA_SEKOLAH" initialUser={user}>{children}</AppLayout>
}
