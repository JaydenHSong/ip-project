import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDemoMode } from '@/lib/demo'
import { DEMO_NOTICES } from '@/lib/demo/data'
import { sanitizeSearchTerm } from '@/lib/utils/sanitize'

const PAGE_SIZE = 20

// GET /api/notices/list — infinite scroll for notices
export const GET = async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sp = req.nextUrl.searchParams
  const category = sp.get('category') ?? undefined
  const search = sp.get('search') ?? undefined
  const sort = sp.get('sort') ?? 'desc'
  const from = sp.get('from') ?? undefined
  const to = sp.get('to') ?? undefined

  // offset/limit -> page conversion
  const offset = Number(sp.get('offset') ?? '0')
  const limit = Number(sp.get('limit') ?? String(PAGE_SIZE))
  const page = Math.floor(offset / limit) + 1

  if (isDemoMode()) {
    let filtered = [...DEMO_NOTICES]
    if (category) filtered = filtered.filter((n) => n.category === category)
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q),
      )
    }
    const sortAsc = sort === 'asc'
    filtered.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
      const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return sortAsc ? -diff : diff
    })
    const totalCount = filtered.length
    const sliced = filtered.slice((page - 1) * limit, page * limit)
    return NextResponse.json({ data: sliced, totalCount })
  }

  const supabase = createAdminClient()
  const sortAsc = sort === 'asc'
  const rangeFrom = (page - 1) * limit
  const rangeTo = rangeFrom + limit - 1

  let query = supabase
    .from('notices')
    .select('*, users!notices_created_by_fkey(name, email)', { count: 'exact' })
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: sortAsc })
    .range(rangeFrom, rangeTo)

  if (category) query = query.eq('category', category)
  if (search) {
    const safe = sanitizeSearchTerm(search)
    query = query.or(`title.ilike.%${safe}%,content.ilike.%${safe}%`)
  }
  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', `${to}T23:59:59.999Z`)

  const { data, error, count } = await query
  const notices = error ? [] : data
  const totalCount = count ?? 0

  return NextResponse.json({ data: notices, totalCount })
}
