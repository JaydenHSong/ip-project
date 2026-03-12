import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { DEMO_CAMPAIGNS, DEMO_LISTINGS, DEMO_REPORTS } from '@/lib/demo/data'
import { MARKETPLACES, type MarketplaceCode } from '@/constants/marketplaces'
import { CampaignDetailContent } from './CampaignDetailContent'

type CampaignData = {
  id: string
  keyword: string
  marketplace: string
  status: string
  frequency: string
  max_pages: number
  start_date: string
  end_date: string | null
  created_by: string
  created_at: string
  updated_at: string
  users: { name: string; email: string } | null
}

type ListingRow = {
  id: string
  asin: string
  title: string
  seller_name: string | null
  is_suspect: boolean
  source: string
  screenshot_url: string | null
  suspect_reasons: string[]
}

type ReportRow = {
  id: string
  listing_id: string
  status: string
  br_form_type: string | null
  user_violation_type: string
  violation_category: string | null
  ai_violation_type: string | null
  ai_confidence_score: number | null
  confirmed_violation_type: string | null
  disagreement_flag: boolean
  draft_title: string | null
  draft_body: string | null
  rejection_reason: string | null
  pd_case_id: string | null
  created_at: string
  approved_at: string | null
  rejected_at: string | null
}

const CampaignDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { id } = await params

  let campaign: CampaignData | null = null
  let totalListings = 0
  let suspectCount = 0
  let listings: ListingRow[] = []
  let reports: ReportRow[] = []

  if (isDemoMode()) {
    const found = DEMO_CAMPAIGNS.find((c) => c.id === id)
    if (!found) notFound()
    campaign = found as CampaignData
    listings = DEMO_LISTINGS.map((l) => ({
      id: l.id,
      asin: l.asin,
      title: l.title,
      seller_name: l.seller_name,
      is_suspect: l.is_suspect,
      source: l.source,
      screenshot_url: (l as { screenshot_url?: string | null }).screenshot_url ?? null,
      suspect_reasons: (l as { suspect_reasons?: string[] }).suspect_reasons ?? [],
    }))
    totalListings = listings.length
    suspectCount = listings.filter((l) => l.is_suspect).length
    // Get reports for listings in this campaign
    const listingIds = new Set(listings.map((l) => l.id))
    reports = DEMO_REPORTS
      .filter((r) => listingIds.has(r.listing_id))
      .map((r) => ({
        id: r.id,
        listing_id: r.listing_id,
        status: r.status,
        br_form_type: r.br_form_type ?? null,
        user_violation_type: r.user_violation_type,
        violation_category: (r as Record<string, unknown>).violation_category as string | null ?? null,
        ai_violation_type: r.ai_violation_type,
        ai_confidence_score: r.ai_confidence_score,
        confirmed_violation_type: r.confirmed_violation_type,
        disagreement_flag: r.disagreement_flag,
        draft_title: r.draft_title,
        draft_body: r.draft_body,
        rejection_reason: r.rejection_reason,
        pd_case_id: r.pd_case_id,
        created_at: r.created_at,
        approved_at: r.approved_at,
        rejected_at: r.rejected_at,
      }))
  } else {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('campaigns')
      .select('*, users!campaigns_created_by_fkey(name, email)')
      .eq('id', id)
      .single()

    if (error || !data) notFound()
    campaign = data as unknown as CampaignData

    const { count: tc } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('source_campaign_id', id)
    totalListings = tc ?? 0

    const { count: sc } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('source_campaign_id', id)
      .eq('is_suspect', true)
    suspectCount = sc ?? 0

    const { data: listingData } = await supabase
      .from('listings')
      .select('id, asin, title, seller_name, is_suspect, source, screenshot_url, suspect_reasons')
      .eq('source_campaign_id', id)
      .order('is_suspect', { ascending: false })
      .limit(50)
    listings = (listingData ?? []) as ListingRow[]

    if (listings.length > 0) {
      const listingIds = listings.map((l) => l.id)
      const { data: reportData } = await supabase
        .from('reports')
        .select('id, listing_id, status, br_form_type, user_violation_type, violation_category, ai_violation_type, ai_confidence_score, confirmed_violation_type, disagreement_flag, draft_title, draft_body, rejection_reason, pd_case_id, created_at, approved_at, rejected_at')
        .in('listing_id', listingIds)
      reports = (reportData ?? []) as ReportRow[]
    }
  }

  if (!campaign) notFound()

  const marketplace = MARKETPLACES[campaign.marketplace as MarketplaceCode]

  return (
    <CampaignDetailContent
      campaign={{
        id: campaign.id,
        keyword: campaign.keyword,
        marketplace: campaign.marketplace,
        marketplaceName: marketplace?.name ?? campaign.marketplace,
        status: campaign.status,
        frequency: campaign.frequency,
        max_pages: campaign.max_pages,
        start_date: campaign.start_date,
        end_date: campaign.end_date,
        creatorName: campaign.users?.name ?? null,
      }}
      listings={listings}
      reports={reports}
      totalListings={totalListings}
      suspectCount={suspectCount}
      canEdit={user.role === 'owner' || user.role === 'admin' || user.role === 'editor'}
      userRole={user.role}
    />
  )
}

export default CampaignDetailPage
