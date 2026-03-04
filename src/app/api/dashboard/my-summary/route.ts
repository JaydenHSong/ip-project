import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { MySummary } from '@/types/dashboard'

export const GET = async (): Promise<NextResponse> => {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
  }

  const supabase = await createClient()
  const uid = user.id

  const [
    { count: totalReports },
    { count: resolvedReports },
    { count: pendingReports },
    { count: monitoringReports },
    { count: totalCampaigns },
    { count: activeCampaigns },
  ] = await Promise.all([
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('created_by', uid),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('created_by', uid).eq('status', 'resolved'),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('created_by', uid).in('status', ['draft', 'pending_review']),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('created_by', uid).eq('status', 'monitoring'),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('created_by', uid),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('created_by', uid).eq('status', 'active'),
  ])

  const summary: MySummary = {
    totalReports: totalReports ?? 0,
    resolvedReports: resolvedReports ?? 0,
    pendingReports: pendingReports ?? 0,
    monitoringReports: monitoringReports ?? 0,
    totalCampaigns: totalCampaigns ?? 0,
    activeCampaigns: activeCampaigns ?? 0,
  }

  return NextResponse.json(summary)
}
