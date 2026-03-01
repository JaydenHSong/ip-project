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

  const recentReports = isDemoMode()
    ? DEMO_REPORTS.slice(0, 3).map((r) => ({
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
      stats={{ activeCampaigns, pendingReports, totalListings, resolvedRate }}
      recentReports={recentReports}
      activeCampaigns={activeCampaignsList}
    />
  )
}

export default DashboardPage
