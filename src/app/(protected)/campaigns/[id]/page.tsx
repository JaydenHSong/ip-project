import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { DEMO_CAMPAIGNS, DEMO_LISTINGS } from '@/lib/demo/data'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Badge } from '@/components/ui/Badge'
import { CampaignStats } from '@/components/features/CampaignStats'
import { MARKETPLACES, type MarketplaceCode } from '@/constants/marketplaces'
import { CampaignActions } from './CampaignActions'

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/campaigns" className="text-th-text-muted hover:text-th-text-secondary">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-th-text">{campaign.keyword}</h1>
          <StatusBadge status={campaign.status as 'active' | 'paused' | 'completed' | 'scheduled'} type="campaign" />
        </div>
        {(user.role === 'admin' || user.role === 'editor') && (
          <CampaignActions campaignId={id} status={campaign.status} userRole={user.role} />
        )}
      </div>

      {/* Stats */}
      <CampaignStats stats={{ total_listings: totalListings, suspect_listings: suspectCount }} />

      {/* Campaign Details */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-th-text">Campaign Details</h2>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-th-text-tertiary">Marketplace</dt>
              <dd className="mt-1 text-sm font-medium text-th-text">
                {marketplace?.name ?? campaign.marketplace} ({campaign.marketplace})
              </dd>
            </div>
            <div>
              <dt className="text-sm text-th-text-tertiary">Frequency</dt>
              <dd className="mt-1 text-sm font-medium text-th-text">{campaign.frequency}</dd>
            </div>
            <div>
              <dt className="text-sm text-th-text-tertiary">Start Date</dt>
              <dd className="mt-1 text-sm font-medium text-th-text">
                {new Date(campaign.start_date).toLocaleDateString('ko-KR')}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-th-text-tertiary">End Date</dt>
              <dd className="mt-1 text-sm font-medium text-th-text">
                {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString('ko-KR') : 'No end date'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-th-text-tertiary">Max Pages</dt>
              <dd className="mt-1 text-sm font-medium text-th-text">{campaign.max_pages}</dd>
            </div>
            <div>
              <dt className="text-sm text-th-text-tertiary">Created By</dt>
              <dd className="mt-1 text-sm font-medium text-th-text">
                {campaign.users?.name ?? 'Unknown'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Collected Listings - Inline Table (#6) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-th-text">Collected Listings</h2>
            <Badge variant="info">{totalListings} items</Badge>
          </div>
        </CardHeader>
        {listings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-th-border bg-th-bg-tertiary">
                  <th className="px-4 py-2 text-xs font-medium uppercase text-th-text-tertiary">ASIN</th>
                  <th className="px-4 py-2 text-xs font-medium uppercase text-th-text-tertiary">Title</th>
                  <th className="px-4 py-2 text-xs font-medium uppercase text-th-text-tertiary">Seller</th>
                  <th className="px-4 py-2 text-xs font-medium uppercase text-th-text-tertiary">Status</th>
                  <th className="px-4 py-2 text-xs font-medium uppercase text-th-text-tertiary">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-th-border">
                {listings.map((listing) => (
                  <tr key={listing.id} className="bg-surface-card hover:bg-th-bg-hover">
                    <td className="px-4 py-2 font-mono text-th-text">{listing.asin}</td>
                    <td className="max-w-xs truncate px-4 py-2 text-th-text-secondary">{listing.title}</td>
                    <td className="px-4 py-2 text-th-text-secondary">{listing.seller_name ?? '—'}</td>
                    <td className="px-4 py-2">
                      {listing.is_suspect ? (
                        <Badge variant="danger">Suspect</Badge>
                      ) : (
                        <Badge variant="success">Normal</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {listing.is_suspect && (
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-xs font-medium text-th-accent-text hover:bg-th-accent-soft"
                        >
                          Report
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <CardContent>
            <p className="text-sm text-th-text-muted">No listings collected yet.</p>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

export default CampaignDetailPage
