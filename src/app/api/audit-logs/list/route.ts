import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDemoMode } from '@/lib/demo'
import { DEMO_AUDIT_LOGS } from '@/lib/demo/data'

const PAGE_SIZE = 50

// GET /api/audit-logs/list — infinite scroll for audit logs
export const GET = async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role !== 'owner' && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const sp = req.nextUrl.searchParams
  const action = sp.get('action') ?? undefined
  const resourceType = sp.get('resource_type') ?? undefined

  // offset/limit -> page conversion
  const offset = Number(sp.get('offset') ?? '0')
  const limit = Number(sp.get('limit') ?? String(PAGE_SIZE))
  const page = Math.floor(offset / limit) + 1

  if (isDemoMode()) {
    let filtered = [...DEMO_AUDIT_LOGS]
    if (action) filtered = filtered.filter((l) => l.action === action)
    if (resourceType) filtered = filtered.filter((l) => l.resource_type === resourceType)
    const totalCount = filtered.length
    const sliced = filtered.slice((page - 1) * limit, page * limit)
    return NextResponse.json({ data: sliced, totalCount })
  }

  const supabase = createAdminClient()
  const rangeFrom = (page - 1) * limit
  const rangeTo = rangeFrom + limit - 1

  let query = supabase
    .from('audit_logs')
    .select('*, users!audit_logs_user_id_fkey(name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(rangeFrom, rangeTo)

  if (action) query = query.eq('action', action)
  if (resourceType) query = query.eq('resource_type', resourceType)

  const { data, error, count } = await query
  const logs = error ? [] : data
  const totalCount = count ?? 0

  return NextResponse.json({ data: logs, totalCount })
}
