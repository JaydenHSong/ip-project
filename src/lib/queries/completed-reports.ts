import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo'
import { DEMO_REPORTS } from '@/lib/demo/data'
import { sanitizeSearchTerm } from '@/lib/utils/sanitize'
import type { User } from '@/types/users'

export type CompletedReportQueryParams = {
  page?: string
  status?: string
  owner?: string
  search?: string
  sort_field?: string
  sort_dir?: string
}

type FetchCompletedResult = {
  reports: typeof DEMO_REPORTS | null
  totalCount: number
  effectiveOwner: 'my' | 'all'
}

const COMPLETED_STATUSES = ['resolved', 'unresolved', 'resubmitted', 'escalated']
const PAGE_SIZE = 100
const SELECT_FIELDS = '*, listing_snapshot, listings!reports_listing_id_fkey(asin, title, marketplace, seller_name), users!reports_created_by_fkey(name)'

const SORT_MAP: Record<string, string> = {
  status: 'status',
  channel: 'listing_snapshot->>marketplace',
  asin: 'listing_snapshot->>asin',
  violation: 'br_form_type',
  seller: 'listing_snapshot->>seller_name',
  date: 'created_at',
  updated: 'updated_at',
  resolved: 'resolved_at',
}

export { PAGE_SIZE as COMPLETED_PAGE_SIZE }

export async function fetchCompletedReports(
  params: CompletedReportQueryParams,
  user: User,
): Promise<FetchCompletedResult> {
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)
  // viewer는 본인 리포트만 볼 수 있음 (URL 조작 방지)
  const canSeeAll = user.role !== 'viewer'
  const effectiveOwner = canSeeAll
    ? (params.owner ?? ((user.role === 'owner' || user.role === 'admin') ? 'all' : 'my')) as 'my' | 'all'
    : 'my'

  if (isDemoMode()) {
    let filtered = DEMO_REPORTS.filter((r) => COMPLETED_STATUSES.includes(r.status))
    if (params.status) filtered = filtered.filter((r) => r.status === params.status)
    const totalCount = filtered.length
    const reports = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    return { reports, totalCount, effectiveOwner }
  }

  const supabase = await createClient()
  const searchTerm = params.search?.trim()
  const isArchived = params.status === 'archived'
  const statusFilter = isArchived ? ['archived'] : params.status ? [params.status] : COMPLETED_STATUSES

  // Pre-fetch matching listing IDs for search
  let matchedListingIds: string[] = []
  const safeSearch = searchTerm ? sanitizeSearchTerm(searchTerm) : ''
  if (searchTerm && !/^\d+$/.test(searchTerm)) {
    const { data: matchedListings } = await supabase
      .from('listings')
      .select('id')
      .or(`asin.ilike.%${safeSearch}%,title.ilike.%${safeSearch}%,seller_name.ilike.%${safeSearch}%`)
    matchedListingIds = matchedListings?.map((l) => l.id) ?? []
  }

  const buildSearchFilter = () => {
    const snapshotFilter = `listing_snapshot->>asin.ilike.%${safeSearch}%,listing_snapshot->>title.ilike.%${safeSearch}%,listing_snapshot->>seller_name.ilike.%${safeSearch}%`
    if (matchedListingIds.length > 0) {
      return `${snapshotFilter},listing_id.in.(${matchedListingIds.join(',')})`
    }
    return snapshotFilter
  }

  const applySearchFilter = <T extends { eq: (col: string, val: number) => T; or: (filter: string) => T }>(q: T): T => {
    if (!searchTerm) return q
    const isNumber = /^\d+$/.test(searchTerm)
    if (isNumber) return q.eq('report_number', Number(searchTerm))
    return q.or(buildSearchFilter())
  }

  const applyOwnerFilter = <T extends { eq: (col: string, val: string) => T }>(q: T): T => {
    if (effectiveOwner === 'my') return q.eq('created_by', user.id)
    return q
  }

  // Count query
  let countQuery = supabase.from('reports').select('id', { count: 'exact', head: true }).in('status', statusFilter)
  countQuery = applySearchFilter(countQuery)
  countQuery = applyOwnerFilter(countQuery)
  const { count } = await countQuery
  const totalCount = count ?? 0

  // Data query
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const defaultSort = isArchived ? 'archived_at' : 'created_at'
  const sortField = params.sort_field && SORT_MAP[params.sort_field] ? SORT_MAP[params.sort_field] : defaultSort
  const sortAsc = params.sort_dir === 'asc'

  let query = supabase
    .from('reports')
    .select(SELECT_FIELDS)
    .in('status', statusFilter)
    .order(sortField, { ascending: sortAsc, nullsFirst: false })
    .range(from, to)

  query = applySearchFilter(query)
  query = applyOwnerFilter(query)

  const { data } = await query

  const reports = (data ?? []).map((r: Record<string, unknown>) => {
    if (!r.listings && r.listing_snapshot) return { ...r, listings: r.listing_snapshot }
    return r
  }) as typeof DEMO_REPORTS | null

  return { reports, totalCount, effectiveOwner }
}
