import { getCurrentUser } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { getDemoDashboardStats } from '@/lib/demo/dashboard'
import { DashboardContent } from './DashboardContent'

const DashboardPage = async () => {
  const user = await getCurrentUser()

  const initialStats = isDemoMode() ? getDemoDashboardStats('30d') : null

  return (
    <DashboardContent
      userName={user?.name ?? ''}
      userId={user?.id ?? ''}
      userRole={user?.role ?? 'viewer'}
      initialStats={initialStats}
    />
  )
}

export default DashboardPage
