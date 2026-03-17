import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo'
import { DEMO_IP_ASSETS } from '@/lib/demo/patents'
import { sanitizeSearchTerm } from '@/lib/utils/sanitize'

const PAGE_SIZE = 20

// GET /api/patents/list — infinite scroll for patents/IP assets
export const GET = async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sp = req.nextUrl.searchParams
  const type = sp.get('type') ?? undefined
  const status = sp.get('status') ?? undefined
  const country = sp.get('country') ?? undefined
  const search = sp.get('search') ?? undefined

  // offset/limit -> page conversion
  const offset = Number(sp.get('offset') ?? '0')
  const limit = Number(sp.get('limit') ?? String(PAGE_SIZE))
  const page = Math.floor(offset / limit) + 1

  if (isDemoMode()) {
    let filtered = [...DEMO_IP_ASSETS]
    if (type) filtered = filtered.filter((a) => a.ip_type === type)
    if (status) filtered = filtered.filter((a) => a.status === status)
    if (country) filtered = filtered.filter((a) => a.country === country)
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (a) =>
          a.management_number.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          a.keywords.some((k) => k.toLowerCase().includes(q)),
      )
    }
    const totalCount = filtered.length
    const sliced = filtered.slice((page - 1) * limit, page * limit)
    return NextResponse.json({ data: sliced, totalCount })
  }

  const supabase = await createClient()
  const rangeFrom = (page - 1) * limit
  const rangeTo = rangeFrom + limit - 1

  let query = supabase
    .from('ip_assets')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(rangeFrom, rangeTo)

  if (type) query = query.eq('ip_type', type)
  if (status) query = query.eq('status', status)
  if (country) query = query.eq('country', country)
  if (search) {
    const safe = sanitizeSearchTerm(search)
    query = query.or(`management_number.ilike.%${safe}%,name.ilike.%${safe}%`)
  }

  const { data, error, count } = await query
  const assets = error ? [] : data
  const totalCount = count ?? 0

  return NextResponse.json({ data: assets, totalCount })
}
