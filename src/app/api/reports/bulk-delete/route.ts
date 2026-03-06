import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

type BulkDeleteRequest = {
  report_ids: string[]
}

// POST /api/reports/bulk-delete — 일괄 삭제
export const POST = withAuth(async (req, { user }) => {
  const body = (await req.json()) as BulkDeleteRequest

  if (!body.report_ids?.length) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'report_ids required' } },
      { status: 400 },
    )
  }

  if (body.report_ids.length > 50) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Max 50 reports per batch' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const isAdmin = user.role === 'owner' || user.role === 'admin'

  // 대상 리포트 조회
  const { data: reports, error: fetchError } = await supabase
    .from('reports')
    .select('id, status, created_by')
    .in('id', body.report_ids)

  if (fetchError) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: fetchError.message } },
      { status: 500 },
    )
  }

  const allReports = reports ?? []
  let deleted = 0
  const errors: { id: string; reason: string }[] = []

  for (const report of allReports) {
    // 권한 체크
    if (!isAdmin) {
      if (!['draft', 'pending_review'].includes(report.status)) {
        errors.push({ id: report.id, reason: 'Status not deletable by editor' })
        continue
      }
      if (report.created_by !== user.id) {
        errors.push({ id: report.id, reason: 'Not owner of report' })
        continue
      }
    }

    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', report.id)

    if (error) {
      errors.push({ id: report.id, reason: error.message })
    } else {
      deleted++
    }
  }

  return NextResponse.json({
    deleted,
    failed: errors.length,
    errors,
    total: body.report_ids.length,
  })
}, ['owner', 'admin', 'editor'])
