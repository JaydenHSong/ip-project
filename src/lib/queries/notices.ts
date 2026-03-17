import { createAdminClient } from '@/lib/supabase/admin'
import { isDemoMode } from '@/lib/demo'
import { DEMO_NOTICES } from '@/lib/demo/data'
import { sanitizeSearchTerm } from '@/lib/utils/sanitize'
import type { User } from '@/types/users'

export type NoticeQueryParams = {
  page?: string
  category?: string
  search?: string
  sort?: string
  from?: string
  to?: string
}

type FetchNoticesResult = {
  notices: typeof DEMO_NOTICES
  totalPages: number
  totalCount: number
  readNoticeIds: string[]
}

const PAGE_SIZE = 20

export async function fetchNotices(
  params: NoticeQueryParams,
  user: User,
): Promise<FetchNoticesResult> {
  const page = Number(params.page) || 1
  const sortAsc = params.sort === 'asc'

  if (isDemoMode()) {
    let filtered = [...DEMO_NOTICES]
    if (params.category) filtered = filtered.filter((n) => n.category === params.category)
    if (params.search) {
      const q = params.search.toLowerCase()
      filtered = filtered.filter(
        (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q),
      )
    }
    filtered.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
      const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return sortAsc ? -diff : diff
    })
    return { notices: filtered, totalPages: 1, totalCount: filtered.length, readNoticeIds: [] }
  }

  const offset = (page - 1) * PAGE_SIZE
  const supabase = createAdminClient()

  let query = supabase
    .from('notices')
    .select('*, users!notices_created_by_fkey(name, email)', { count: 'exact' })
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: sortAsc })
    .range(offset, offset + PAGE_SIZE - 1)

  if (params.category) {
    query = query.eq('category', params.category)
  }
  if (params.search) {
    const safe = sanitizeSearchTerm(params.search)
    query = query.or(`title.ilike.%${safe}%,content.ilike.%${safe}%`)
  }
  if (params.from) {
    query = query.gte('created_at', params.from)
  }
  if (params.to) {
    query = query.lte('created_at', `${params.to}T23:59:59.999Z`)
  }

  const { data, error, count } = await query
  const notices = (error ? [] : data) as typeof DEMO_NOTICES
  const totalCount = count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // Fetch read notice IDs for current user
  let readNoticeIds: string[] = []
  const { data: reads } = await supabase
    .from('notice_reads')
    .select('notice_id')
    .eq('user_id', user.id)
  if (reads) {
    readNoticeIds = reads.map((r) => r.notice_id)
  }

  return { notices, totalPages, totalCount, readNoticeIds }
}
