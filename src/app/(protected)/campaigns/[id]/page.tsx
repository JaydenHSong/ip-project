import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { DEMO_CAMPAIGNS, DEMO_LISTINGS } from '@/lib/demo/data'
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
}

const CampaignDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { id } = await params

  let campaign: CampaignData | null = null
  let totalListings = 0
  let suspectCount = 0
  let listings: ListingRow[] = []

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
    }))
    totalListings = listings.length
    suspectCount = listings.filter((l) => l.is_suspect).length
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
      .from('campaign_listings')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', id)
    totalListings = tc ?? 0

    const suspectQuery = await supabase
      .from('campaign_listings')
      .select('listing_id')
      .eq('campaign_id', id)

    const listingIds = (suspectQuery.data ?? []).map((l) => l.listing_id)

    if (listingIds.length > 0) {
      const { count } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .in('id', listingIds)
        .eq('is_suspect', true)
      suspectCount = count ?? 0

      const { data: listingData } = await supabase
        .from('listings')
        .select('id, asin, title, seller_name, is_suspect, source')
        .in('id', listingIds)
        .order('is_suspect', { ascending: false })
        .limit(50)
      listings = (listingData ?? []) as ListingRow[]
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
      totalListings={totalListings}
      suspectCount={suspectCount}
      canEdit={user.role === 'admin' || user.role === 'editor'}
      userRole={user.role}
    />
  )
}

export default CampaignDetailPage
