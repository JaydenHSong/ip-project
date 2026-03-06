import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limit = Number(request.nextUrl.searchParams.get('limit') ?? '10')
  const scope = request.nextUrl.searchParams.get('scope') ?? 'my'
  const isAdmin = user.role === 'owner' || user.role === 'admin'

  const supabase = await createClient()
  let query = supabase
    .from('campaigns')
    .select('id, keyword, marketplace, frequency')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (scope === 'my' || !isAdmin) {
    query = query.eq('created_by', user.id)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
