import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getDashboardRoute } from '@/lib/routes'

export default async function Home() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const route = getDashboardRoute(user)
  redirect(route)
}
