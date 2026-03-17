import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo'

// GET /api/reports/[id]/related — 관련 리포트 (parent chain + children + same listing)
export const GET = withAuth(async (req, { params }) => {
  const { id } = params

  if (!id) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'ID required' } }, { status: 400 })
  }

  if (isDemoMode()) {
    return NextResponse.json({ parent_chain: [], children: [], same_listing: [] })
  }

  const supabase = await createClient()

  // 현재 리포트 조회
  const { data: report, error } = await supabase
    .from('reports')
    .select('id, listing_id, parent_report_id, escalation_level, status, br_case_id, br_case_status, created_at, user_violation_type')
    .eq('id', id)
    .single()

  if (error || !report) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Report not found' } }, { status: 404 })
  }

  // Parent chain: 상위 리포트 추적
  const parentChain: typeof report[] = []
  let currentParentId = report.parent_report_id
  while (currentParentId) {
    const { data: parent } = await supabase
      .from('reports')
      .select('id, listing_id, parent_report_id, escalation_level, status, br_case_id, br_case_status, created_at, user_violation_type')
      .eq('id', currentParentId)
      .single()
    if (!parent) break
    parentChain.unshift(parent)
    currentParentId = parent.parent_report_id
  }

  // Children: 하위 리포트
  const { data: children } = await supabase
    .from('reports')
    .select('id, listing_id, parent_report_id, escalation_level, status, br_case_id, br_case_status, created_at, user_violation_type')
    .eq('parent_report_id', id)
    .order('created_at', { ascending: true })

  // Same listing: 동일 listing_id의 다른 리포트
  const { data: sameListing } = await supabase
    .from('reports')
    .select('id, status, br_case_id, br_case_status, created_at, user_violation_type, violation_category, br_form_type, listings!reports_listing_id_fkey(asin, title)')
    .eq('listing_id', report.listing_id)
    .neq('id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  return NextResponse.json({
    parent_chain: parentChain,
    children: children ?? [],
    same_listing: sameListing ?? [],
  })
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])
