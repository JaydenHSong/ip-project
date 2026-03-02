import { NextResponse } from 'next/server'
import { getCurrentUser, hasRole } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { createClient } from '@/lib/supabase/server'

export const POST = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const user = await getCurrentUser()
  if (!user || !hasRole(user, 'editor')) {
    return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 })
  }

  const { id } = await params

  if (isDemoMode()) {
    return NextResponse.json({ success: true })
  }

  const supabase = await createClient()

  const { data: report } = await supabase
    .from('reports')
    .select('status, pre_archive_status')
    .eq('id', id)
    .single()

  if (!report) {
    return NextResponse.json({ error: { message: 'Report not found' } }, { status: 404 })
  }

  if (report.status !== 'archived') {
    return NextResponse.json(
      { error: { message: 'Report is not archived' } },
      { status: 400 },
    )
  }

  const restoreStatus = report.pre_archive_status ?? 'monitoring'

  const { error } = await supabase
    .from('reports')
    .update({
      status: restoreStatus,
      archived_at: null,
      archive_reason: null,
      pre_archive_status: null,
    })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: { message: error.message } }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
