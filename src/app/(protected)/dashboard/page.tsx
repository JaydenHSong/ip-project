import { getCurrentUser } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { DEMO_CAMPAIGNS, DEMO_REPORTS, DEMO_LISTINGS } from '@/lib/demo/data'
import { DashboardContent } from './DashboardContent'

const DashboardPage = async () => {
  const user = await getCurrentUser()

  const activeCampaigns = isDemoMode()
    ? DEMO_CAMPAIGNS.filter((c) => c.status === 'active').length
    : 0
  const pendingReports = isDemoMode()
    ? DEMO_REPORTS.filter((r) => r.status === 'draft' || r.status === 'pending_review').length
    : 0
  const totalListings = isDemoMode() ? DEMO_LISTINGS.length : 0
  const resolvedRate = isDemoMode() ? '25%' : '—'

  return (
    <DashboardContent
      userName={user?.name ?? ''}
      stats={{ activeCampaigns, pendingReports, totalListings, resolvedRate }}
    />
  )
}

export default DashboardPage
