import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
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
export const PATCH = withAuth(async (req) => {
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

  const supabase = await createClient()
  const now = new Date().toISOString()

  const upsertRows = body.configs.map((c) => ({
    violation_category: c.violation_category,
    expected_response_hours: c.expected_response_hours,
    warning_threshold_hours: c.warning_threshold_hours,
    updated_at: now,
  }))

  const { data: configs, error } = await supabase
    .from('br_sla_configs')
    .upsert(upsertRows, { onConflict: 'violation_category' })
    .select()

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ configs: configs as BrSlaConfig[] })
}, ['owner', 'admin'])
