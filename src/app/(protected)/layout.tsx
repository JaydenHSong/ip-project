import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { AppLayout } from '@/components/layout/AppLayout'

const ProtectedLayout = async ({
  children,
}: {
  children: React.ReactNode
}) => {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return <AppLayout user={user} isDemo={isDemoMode()}>{children}</AppLayout>
}

export default ProtectedLayout
