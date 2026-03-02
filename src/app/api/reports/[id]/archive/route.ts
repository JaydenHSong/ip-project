import { NextResponse } from 'next/server'
import { getCurrentUser, hasRole } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { createClient } from '@/lib/supabase/server'

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const user = await getCurrentUser()
  if (!user || !hasRole(user, 'editor')) {
    return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json() as { archive_reason?: string }

  if (isDemoMode()) {
    return NextResponse.json({ success: true })
  }

  const supabase = await createClient()

  // Get current report to save pre_archive_status
  const { data: report } = await supabase
    .from('reports')
    .select('status')
    .eq('id', id)
    .single()

  if (!report) {
    return NextResponse.json({ error: { message: 'Report not found' } }, { status: 404 })
  }

  if (!['monitoring', 'unresolved', 'resolved'].includes(report.status)) {
    return NextResponse.json(
      { error: { message: 'Only monitoring/unresolved/resolved reports can be archived' } },
      { status: 400 },
    )
  }

  const { error } = await supabase
    .from('reports')
    .update({
      pre_archive_status: report.status,
      status: 'archived',
      archived_at: new Date().toISOString(),
      archive_reason: body.archive_reason ?? null,
    })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: { message: error.message } }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
