import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo'
import { DEMO_REPORTS } from '@/lib/demo/data'
import { sanitizeSearchTerm } from '@/lib/utils/sanitize'
import type { User } from '@/types/users'

export type ReportQueryParams = {
  page?: string
  status?: string
  br_form_type?: string
  br_case_status?: string
  smart_queue?: string
  search?: string
  date_from?: string
  date_to?: string
  sort_field?: string
  sort_dir?: string
  owner?: string
}

type FetchReportsResult = {
  reports: typeof DEMO_REPORTS | null
  totalPages: number
  totalCount: number
  effectiveOwner: 'my' | 'all'
}

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

const PAGE_SIZE = 20

export async function fetchReports(
  params: ReportQueryParams,
  user: User,
): Promise<FetchReportsResult> {
  const page = Number(params.page) || 1
  // viewer는 본인 리포트만 볼 수 있음 (URL 조작 방지)
  const canSeeAll = user.role !== 'viewer'
  const effectiveOwner = canSeeAll
    ? (params.owner ?? ((user.role === 'owner' || user.role === 'admin') ? 'all' : 'my')) as 'my' | 'all'
    : 'my'

  if (isDemoMode()) {
    let filtered = [...DEMO_REPORTS]
    if (params.status) filtered = filtered.filter((r) => r.status === params.status)
    if (params.br_form_type) filtered = filtered.filter((r) => r.br_form_type === params.br_form_type)
    return { reports: filtered, totalPages: 1, totalCount: filtered.length, effectiveOwner }
  }

  const offset = (page - 1) * PAGE_SIZE
  const supabase = await createClient()

  const sortField = params.sort_field && SORT_MAP[params.sort_field] ? SORT_MAP[params.sort_field] : 'created_at'
  const sortAsc = params.sort_dir === 'asc'

  let query = supabase
    .from('reports')
    .select(
      '*, listing_snapshot, listings!reports_listing_id_fkey(asin, title, marketplace, seller_name), users!reports_created_by_fkey(name)',
      { count: 'exact' },
    )
    .order(sortField, { ascending: sortAsc, nullsFirst: false })
    .range(offset, offset + PAGE_SIZE - 1)

  // Status filter
  if (params.status === 'answered') {
    query = query.eq('status', 'monitoring').eq('br_case_status', 'answered')
  } else if (params.status === 'monitoring') {
    query = query.in('status', ['monitoring', 'br_submitting']).neq('br_case_status', 'answered')
  } else if (params.status) {
    query = query.eq('status', params.status)
  } else {
    query = query.in('status', ['draft', 'pending_review', 'approved', 'rejected', 'br_submitting', 'monitoring'])
  }
  if (params.br_form_type) {
    query = query.eq('br_form_type', params.br_form_type)
  }
  if (params.br_case_status) {
    query = query.eq('br_case_status', params.br_case_status)
  }

  // Smart queue
  if (params.smart_queue === 'needs_attention') {
    query = query.eq('br_case_status', 'needs_attention')
  } else if (params.smart_queue === 'new_reply') {
    query = query.not('br_last_amazon_reply_at', 'is', null)
  } else if (params.smart_queue === 'stale') {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    query = query.or(`br_last_scraped_at.lt.${sevenDaysAgo},br_last_scraped_at.is.null`)
  }

  // Search filter
  const searchTerm = params.search?.trim()
  if (searchTerm) {
    const isNumber = /^\d+$/.test(searchTerm)
    if (isNumber) {
      query = query.eq('report_number', Number(searchTerm))
    } else {
      const safe = sanitizeSearchTerm(searchTerm)

      // listings 테이블에서 ASIN/title/seller 매칭
      const { data: matchedListings } = await supabase
        .from('listings')
        .select('id')
        .or(`asin.ilike.%${safe}%,title.ilike.%${safe}%,seller_name.ilike.%${safe}%`)
      const matchedListingIds = matchedListings?.map((l) => l.id) ?? []

      // users 테이블에서 Created by 이름 매칭
      const { data: matchedUsers } = await supabase
        .from('users')
        .select('id')
        .ilike('name', `%${safe}%`)
      const matchedUserIds = matchedUsers?.map((u) => u.id) ?? []

      const orParts = [
        `listing_snapshot->>asin.ilike.%${safe}%`,
        `listing_snapshot->>title.ilike.%${safe}%`,
        `listing_snapshot->>seller_name.ilike.%${safe}%`,
      ]
      if (matchedListingIds.length > 0) {
        orParts.push(`listing_id.in.(${matchedListingIds.join(',')})`)
      }
      if (matchedUserIds.length > 0) {
        orParts.push(`created_by.in.(${matchedUserIds.join(',')})`)
      }

      query = query.or(orParts.join(','))
    }
  }

  // Date filter
  if (params.date_from) {
    query = query.gte('created_at', `${params.date_from}T00:00:00.000Z`)
  }
  if (params.date_to) {
    query = query.lte('created_at', `${params.date_to}T23:59:59.999Z`)
  }

  // Owner filter
  if (effectiveOwner === 'my') {
    query = query.eq('created_by', user.id)
  }

  const { data, error, count } = await query
  if (error) {
    return { reports: [], totalPages: 1, totalCount: 0, effectiveOwner }
  }

  const reports = (data ?? []).map((r: Record<string, unknown>) => {
    if (!r.listings && r.listing_snapshot) return { ...r, listings: r.listing_snapshot }
    return r
  }) as typeof DEMO_REPORTS | null

  return {
    reports,
    totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
    totalCount: count ?? 0,
    effectiveOwner,
  }
}
