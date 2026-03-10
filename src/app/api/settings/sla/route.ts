import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { BrSlaConfig } from '@/types/br-case'

// GET /api/settings/sla — SLA 설정 조회
export const GET = withAuth(async () => {
  const supabase = await createClient()

  const { data: configs, error } = await supabase
    .from('br_sla_configs')
    .select('*')
    .order('violation_category', { ascending: true })

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ configs: configs ?? [] })
}, ['owner', 'admin'])

// PATCH /api/settings/sla — SLA 설정 수정 (admin only)
export const PATCH = withAuth(async (req, { user }) => {
  const body = (await req.json()) as {
    configs: Array<{
      violation_category: string
      expected_response_hours: number
      warning_threshold_hours: number
    }>
  }

  if (!Array.isArray(body.configs) || body.configs.length === 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'configs array required' } },
      { status: 400 },
    )
  }

  // Validate values
  for (const c of body.configs) {
    if (!c.violation_category || typeof c.expected_response_hours !== 'number' || typeof c.warning_threshold_hours !== 'number') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Each config must have violation_category, expected_response_hours, warning_threshold_hours' } },
        { status: 400 },
      )
    }
    if (c.expected_response_hours < 1 || c.expected_response_hours > 720) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'expected_response_hours must be 1~720' } },
        { status: 400 },
      )
    }
    if (c.warning_threshold_hours < 1 || c.warning_threshold_hours > c.expected_response_hours) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'warning_threshold_hours must be 1 ~ expected_response_hours' } },
        { status: 400 },
      )
    }
  }

  // Admin 설정이므로 service_role로 RLS 우회
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  const results: BrSlaConfig[] = []
  const errors: string[] = []

  for (const c of body.configs) {
    const { data, error } = await supabase
      .from('br_sla_configs')
      .update({
        expected_response_hours: c.expected_response_hours,
        warning_threshold_hours: c.warning_threshold_hours,
        updated_at: now,
      })
      .eq('violation_category', c.violation_category)
      .select()
      .single()

    if (error) {
      errors.push(`${c.violation_category}: ${error.message}`)
    } else {
      results.push(data as BrSlaConfig)
    }
  }

  if (errors.length > 0 && results.length === 0) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: errors.join('; ') } },
      { status: 500 },
    )
  }

  // 감사 로그
  void supabase
    .from('audit_logs')
    .insert({
      user_id: user.id,
      action: 'update',
      resource_type: 'system_config',
      resource_id: 'br_sla_configs',
      details: { updated: body.configs },
    })

  return NextResponse.json({ configs: results })
}, ['owner', 'admin'])
