import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo'

type ScAutomationSettings = {
  auto_submit_enabled: boolean
  default_countdown_seconds: number
  default_min_delay_sec: number
  default_max_delay_sec: number
}

const DEFAULTS: ScAutomationSettings = {
  auto_submit_enabled: false,
  default_countdown_seconds: 3,
  default_min_delay_sec: 30,
  default_max_delay_sec: 60,
}

// GET /api/settings/sc-automation
export const GET = withAuth(async () => {
  if (isDemoMode()) {
    return NextResponse.json(DEFAULTS)
  }

  const supabase = await createClient()

  const { data: setting } = await supabase
    .from('system_configs')
    .select('value')
    .eq('key', 'sc_automation_settings')
    .single()

  const settings: ScAutomationSettings = setting?.value
    ? (setting.value as ScAutomationSettings)
    : DEFAULTS

  return NextResponse.json(settings)
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])

// PUT /api/settings/sc-automation
export const PUT = withAuth(async (req, { user }) => {
  const body = await req.json().catch(() => ({})) as Partial<ScAutomationSettings>

  if (isDemoMode()) {
    return NextResponse.json({ ...DEFAULTS, ...body })
  }

  const supabase = await createClient()

  // 현재 설정 가져오기
  const { data: existing } = await supabase
    .from('system_configs')
    .select('value')
    .eq('key', 'sc_automation_settings')
    .single()

  const current: ScAutomationSettings = existing?.value
    ? (existing.value as ScAutomationSettings)
    : DEFAULTS

  const updated: ScAutomationSettings = {
    auto_submit_enabled: body.auto_submit_enabled ?? current.auto_submit_enabled,
    default_countdown_seconds: body.default_countdown_seconds ?? current.default_countdown_seconds,
    default_min_delay_sec: body.default_min_delay_sec ?? current.default_min_delay_sec,
    default_max_delay_sec: body.default_max_delay_sec ?? current.default_max_delay_sec,
  }

  // 유효성 검사
  if (updated.default_countdown_seconds < 1 || updated.default_countdown_seconds > 30) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Countdown must be 1~30 seconds.' } },
      { status: 400 },
    )
  }

  if (updated.default_min_delay_sec < 10 || updated.default_min_delay_sec > 300) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Min delay must be 10~300 seconds.' } },
      { status: 400 },
    )
  }

  const now = new Date().toISOString()

  await supabase
    .from('system_configs')
    .upsert({
      key: 'sc_automation_settings',
      value: updated,
      updated_by: user.id,
      updated_at: now,
    })

  // 감사 로그
  void supabase
    .from('audit_logs')
    .insert({
      user_id: user.id,
      action: 'update',
      resource_type: 'system_config',
      resource_id: 'sc_automation_settings',
      details: { previous: current, updated },
    })

  return NextResponse.json(updated)
}, ['owner', 'admin'])
