import { getCurrentUser } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { DEMO_CAMPAIGNS, DEMO_REPORTS } from '@/lib/demo/data'
import { getDemoDashboardStats } from '@/lib/demo/dashboard'
import { DashboardContent } from './DashboardContent'

const DashboardPage = async () => {
  const user = await getCurrentUser()

  const initialStats = isDemoMode()
    ? getDemoDashboardStats('30d')
    : null

  const recentReports = isDemoMode()
    ? DEMO_REPORTS.filter((r) => r.status !== 'archived').slice(0, 3).map((r) => ({
        id: r.id,
        violation_type: r.violation_type,
        status: r.status,
        ai_confidence_score: r.ai_confidence_score,
        disagreement_flag: r.disagreement_flag,
        created_at: r.created_at,
        listings: r.listings,
      }))
    : []

  const activeCampaignsList = isDemoMode()
    ? DEMO_CAMPAIGNS.filter((c) => c.status === 'active').map((c) => ({
        id: c.id,
        keyword: c.keyword,
        marketplace: c.marketplace,
        frequency: c.frequency,
      }))
    : []

  return (
    <DashboardContent
      userName={user?.name ?? ''}
      initialStats={initialStats}
      recentReports={recentReports}
      activeCampaigns={activeCampaignsList}
    />
  )
}

export default DashboardPage
