import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { DEMO_CAMPAIGNS } from '@/lib/demo/data'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { MARKETPLACES, type MarketplaceCode } from '@/constants/marketplaces'

const CampaignsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; marketplace?: string }>
}) => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const page = Number(params.page) || 1
  const limit = 20

  let campaigns: typeof DEMO_CAMPAIGNS | null = null
  let totalPages = 1

  if (isDemoMode()) {
    let filtered = [...DEMO_CAMPAIGNS]
    if (params.status) filtered = filtered.filter((c) => c.status === params.status)
    if (params.marketplace) filtered = filtered.filter((c) => c.marketplace === params.marketplace)
    campaigns = filtered
    totalPages = 1
  } else {
    const offset = (page - 1) * limit
    const supabase = await createClient()

    let query = supabase
      .from('campaigns')
      .select('*, users!campaigns_created_by_fkey(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (params.status) {
      query = query.eq('status', params.status)
    }
    if (params.marketplace) {
      query = query.eq('marketplace', params.marketplace)
    }

    const { data, count } = await query
    campaigns = data as typeof DEMO_CAMPAIGNS | null
    totalPages = Math.ceil((count ?? 0) / limit)
  }

  const statusFilters = ['active', 'paused', 'completed'] as const

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-th-text">Campaigns</h1>
        {(user.role === 'admin' || user.role === 'editor') && (
          <Link href="/campaigns/new">
            <Button>+ New Campaign</Button>
          </Link>
        )}
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2">
        <Link
          href="/campaigns"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            !params.status
              ? 'bg-th-accent-soft text-th-accent-text'
              : 'text-th-text-tertiary hover:bg-th-bg-hover'
          }`}
        >
          All
        </Link>
        {statusFilters.map((s) => (
          <Link
            key={s}
            href={`/campaigns?status=${s}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${
              params.status === s
                ? 'bg-th-accent-soft text-th-accent-text'
                : 'text-th-text-tertiary hover:bg-th-bg-hover'
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-th-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-th-border bg-th-bg-tertiary">
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">Keyword</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">Marketplace</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">Frequency</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">Pages</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">Status</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-th-border">
            {(!campaigns || campaigns.length === 0) ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-th-text-muted">
                  No campaigns found.
                </td>
              </tr>
            ) : (
              campaigns.map((campaign) => (
                <tr
                  key={campaign.id}
                  className="bg-surface-card transition-colors hover:bg-th-bg-hover"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/campaigns/${campaign.id}`}
                      className="font-medium text-th-text hover:text-th-accent-text"
                    >
                      {campaign.keyword}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-th-text-secondary">
                    {MARKETPLACES[campaign.marketplace as MarketplaceCode]?.name ?? campaign.marketplace}
                  </td>
                  <td className="px-4 py-3 text-th-text-secondary">{campaign.frequency}</td>
                  <td className="px-4 py-3 text-th-text-secondary">{campaign.max_pages}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={campaign.status as 'active' | 'paused' | 'completed' | 'scheduled'} type="campaign" />
                  </td>
                  <td className="px-4 py-3 text-th-text-muted">
                    {new Date(campaign.created_at).toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/campaigns?page=${p}${params.status ? `&status=${params.status}` : ''}`}
              className={`rounded-md px-3 py-1.5 text-sm ${
                p === page ? 'bg-th-accent text-white' : 'text-th-text-secondary hover:bg-th-bg-hover'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default CampaignsPage
