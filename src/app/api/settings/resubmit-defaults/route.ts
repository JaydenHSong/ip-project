import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo'

type ResubmitDefaults = {
  interval_days: number
  max_count: number
  auto_strengthen: boolean
}

const DEFAULTS: ResubmitDefaults = {
  interval_days: 7,
  max_count: 3,
  auto_strengthen: true,
}

export const GET = withAuth(async () => {
  if (isDemoMode()) {
    return NextResponse.json(DEFAULTS)
  }

  const supabase = await createClient()

  const { data: setting } = await supabase
    .from('system_configs')
    .select('value')
    .eq('key', 'resubmit_defaults')
    .single()

  const settings: ResubmitDefaults = setting?.value
    ? (setting.value as ResubmitDefaults)
    : DEFAULTS

  return NextResponse.json(settings)
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])

export const PUT = withAuth(async (req, { user }) => {
  const body = await req.json().catch(() => ({})) as Partial<ResubmitDefaults>

  if (isDemoMode()) {
    return NextResponse.json({ ...DEFAULTS, ...body })
  }

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('system_configs')
    .select('value')
    .eq('key', 'resubmit_defaults')
    .single()

  const current: ResubmitDefaults = existing?.value
    ? (existing.value as ResubmitDefaults)
    : DEFAULTS

  const updated: ResubmitDefaults = {
    interval_days: body.interval_days ?? current.interval_days,
    max_count: body.max_count ?? current.max_count,
    auto_strengthen: body.auto_strengthen ?? current.auto_strengthen,
  }

  // Validation
  if (updated.interval_days < 3 || updated.interval_days > 30) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Interval must be 3~30 days.' } },
      { status: 400 },
    )
  }

  if (updated.max_count < 1 || updated.max_count > 10) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Max count must be 1~10.' } },
      { status: 400 },
    )
  }

  const now = new Date().toISOString()

  await supabase
    .from('system_configs')
    .upsert({
      key: 'resubmit_defaults',
      value: updated,
      updated_by: user.id,
      updated_at: now,
    })

  void supabase
    .from('audit_logs')
    .insert({
      user_id: user.id,
      action: 'update',
      resource_type: 'system_config',
      resource_id: 'resubmit_defaults',
      details: { previous: current, updated },
    })

  return NextResponse.json(updated)
}, ['owner', 'admin'])
