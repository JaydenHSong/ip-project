import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { DEMO_CAMPAIGNS, DEMO_REPORTS } from '@/lib/demo/data'
import { getDemoDashboardStats } from '@/lib/demo/dashboard'
import { DashboardContent } from './DashboardContent'

const DashboardPage = async () => {
  const user = await getCurrentUser()

  let initialStats = null
  let recentReports: { id: string; violation_type: string; status: string; ai_confidence_score: number | null; disagreement_flag: boolean; created_at: string; listings: { asin: string; title: string; marketplace: string; seller_name: string | null } }[] = []
  let activeCampaignsList: { id: string; keyword: string; marketplace: string; frequency: string }[] = []

  if (isDemoMode()) {
    initialStats = getDemoDashboardStats('30d')
    recentReports = DEMO_REPORTS.filter((r) => r.status !== 'archived').slice(0, 3).map((r) => ({
      id: r.id,
      violation_type: r.violation_type,
      status: r.status,
      ai_confidence_score: r.ai_confidence_score,
      disagreement_flag: r.disagreement_flag,
      created_at: r.created_at,
      listings: r.listings,
    }))
    activeCampaignsList = DEMO_CAMPAIGNS.filter((c) => c.status === 'active').map((c) => ({
      id: c.id,
      keyword: c.keyword,
      marketplace: c.marketplace,
      frequency: c.frequency,
    }))
  } else {
    const supabase = await createClient()

    const { data: reportData, error: reportError } = await supabase
      .from('reports')
      .select('id, violation_type, status, ai_confidence_score, disagreement_flag, created_at, listings!reports_listing_id_fkey(asin, title, marketplace, seller_name)')
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .limit(3)

    if (reportError) {
      console.error('Dashboard reports query error:', reportError.message)
    }

    if (reportData) {
      recentReports = reportData.map((r) => ({
        id: r.id,
        violation_type: r.violation_type ?? '',
        status: r.status,
        ai_confidence_score: r.ai_confidence_score,
        disagreement_flag: r.disagreement_flag,
        created_at: r.created_at,
        listings: (r.listings as unknown as { asin: string; title: string; marketplace: string; seller_name: string | null }) ?? { asin: '', title: '', marketplace: '', seller_name: null },
      }))
    }

    const { data: campaignData, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, keyword, marketplace, frequency')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(10)

    if (campaignError) {
      console.error('Dashboard campaigns query error:', campaignError.message)
    }

    if (campaignData) {
      activeCampaignsList = campaignData
    }
  }

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
