import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { DEMO_NOTICES } from '@/lib/demo/data'
import { sanitizeSearchTerm } from '@/lib/utils/sanitize'
import { NoticesContent } from './NoticesContent'

const NoticesPage = async ({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    category?: string
    search?: string
    sort?: string
    from?: string
    to?: string
  }>
}) => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const page = Number(params.page) || 1
  const limit = 20
  const sortAsc = params.sort === 'asc'

  let notices: typeof DEMO_NOTICES | null = null
  let totalPages = 1
  let readNoticeIds: string[] = []

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
    notices = filtered
    totalPages = 1
  } else {
    const offset = (page - 1) * limit
    const supabase = createAdminClient()

    let query = supabase
      .from('notices')
      .select('*, users!notices_created_by_fkey(name, email)', { count: 'exact' })
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: sortAsc })
      .range(offset, offset + limit - 1)

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
    if (error) {
      notices = []
    } else {
      notices = data as typeof DEMO_NOTICES
    }
    totalPages = Math.ceil((count ?? 0) / limit)

    // Fetch read notice IDs for current user
    const { data: reads } = await supabase
      .from('notice_reads')
      .select('notice_id')
      .eq('user_id', user.id)

    if (reads) {
      readNoticeIds = reads.map((r) => r.notice_id)
    }
  }

  return (
    <NoticesContent
      notices={notices ?? []}
      totalPages={totalPages}
      page={page}
      categoryFilter={params.category ?? ''}
      userRole={user.role}
      readNoticeIds={readNoticeIds}
      searchQuery={params.search ?? ''}
      sortOrder={params.sort ?? 'desc'}
      dateFrom={params.from ?? ''}
      dateTo={params.to ?? ''}
    />
  )
}

export default NoticesPage
