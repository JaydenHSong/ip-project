import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limit = Number(request.nextUrl.searchParams.get('limit') ?? '5')
  const scope = request.nextUrl.searchParams.get('scope') ?? 'my'
  const isAdmin = user.role === 'owner' || user.role === 'admin'

  const supabase = await createClient()
  let query = supabase
    .from('reports')
    .select('id, violation_type, status, ai_confidence_score, disagreement_flag, created_at, listings!reports_listing_id_fkey(asin, title, marketplace, seller_name)')
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (scope === 'my' || !isAdmin) {
    query = query.eq('created_by', user.id)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const reports = (data ?? []).map((r) => ({
    id: r.id,
    violation_type: r.violation_type ?? '',
    status: r.status,
    ai_confidence_score: r.ai_confidence_score,
    disagreement_flag: r.disagreement_flag,
    created_at: r.created_at,
    listings: (Array.isArray(r.listings) ? r.listings[0] : r.listings) as { asin: string; title: string; marketplace: string; seller_name: string | null } ?? { asin: '', title: '', marketplace: '', seller_name: null },
  }))

  return NextResponse.json(reports)
}
