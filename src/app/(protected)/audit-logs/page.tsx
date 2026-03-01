import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { DEMO_AUDIT_LOGS } from '@/lib/demo/data'
import { AuditLogsContent } from './AuditLogsContent'

const AuditLogsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string; entity_type?: string }>
}) => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'admin') redirect('/dashboard')

  const params = await searchParams
  const page = Number(params.page) || 1
  const limit = 50

  let logs: typeof DEMO_AUDIT_LOGS | null = null
  let totalPages = 1

  if (isDemoMode()) {
    let filtered = [...DEMO_AUDIT_LOGS]
    if (params.action) filtered = filtered.filter((l) => l.action === params.action)
    if (params.entity_type) filtered = filtered.filter((l) => l.entity_type === params.entity_type)
    logs = filtered
    totalPages = 1
  } else {
    const offset = (page - 1) * limit
    const supabase = await createClient()

    let query = supabase
      .from('audit_logs')
      .select('*, users!audit_logs_user_id_fkey(name, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (params.action) {
      query = query.eq('action', params.action)
    }
    if (params.entity_type) {
      query = query.eq('entity_type', params.entity_type)
    }

    const { data, count } = await query
    logs = data as typeof DEMO_AUDIT_LOGS | null
    totalPages = Math.ceil((count ?? 0) / limit)
  }

  return (
    <AuditLogsContent
      logs={logs as Parameters<typeof AuditLogsContent>[0]['logs']}
      totalPages={totalPages}
      page={page}
      actionFilter={params.action ?? ''}
    />
  )
}

export default AuditLogsPage
