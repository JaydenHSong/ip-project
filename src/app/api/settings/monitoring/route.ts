import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type BrMonitoringSettings = {
  br_checks_per_day: number
  br_max_monitoring_days: number
  clone_threshold_days: number
}

const KEYS = ['br_checks_per_day', 'br_max_monitoring_days', 'clone_threshold_days'] as const
const LEGACY_KEYS: Record<string, string> = {
  monitoring_interval_days: 'br_checks_per_day',
  monitoring_max_days: 'br_max_monitoring_days',
}
const DEFAULTS: BrMonitoringSettings = {
  br_checks_per_day: 2,
  br_max_monitoring_days: 90,
  clone_threshold_days: 14,
}

// GET /api/settings/monitoring
export const GET = withAuth(async () => {
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('system_configs')
    .select('key, value')
    .in('key', [...KEYS, ...Object.keys(LEGACY_KEYS)])

  const result = { ...DEFAULTS }
  for (const row of rows ?? []) {
    const mappedKey = LEGACY_KEYS[row.key] ?? row.key
    if (mappedKey in result) {
      (result as Record<string, number>)[mappedKey] = Number(row.value)
    }
  }

  return NextResponse.json(result)
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])

// PUT /api/settings/monitoring
export const PUT = withAuth(async (req, { user }) => {
  const body = await req.json().catch(() => ({})) as Partial<BrMonitoringSettings>
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  const updates: { key: string; value: number }[] = []

  if (body.br_checks_per_day !== undefined) {
    const val = Number(body.br_checks_per_day)
    if (val < 1 || val > 4) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Checks per day must be 1~4.' } },
        { status: 400 },
      )
    }
    updates.push({ key: 'br_checks_per_day', value: val })
  }

  if (body.br_max_monitoring_days !== undefined) {
    const val = Number(body.br_max_monitoring_days)
    if (val < 7 || val > 365) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Max monitoring days must be 7~365.' } },
        { status: 400 },
      )
    }
    updates.push({ key: 'br_max_monitoring_days', value: val })
  }

  if (body.clone_threshold_days !== undefined) {
    const val = Number(body.clone_threshold_days)
    if (val < 7 || val > 60) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Clone threshold must be 7~60 days.' } },
        { status: 400 },
      )
    }
    updates.push({ key: 'clone_threshold_days', value: val })
  }

  for (const { key, value } of updates) {
    await supabase
      .from('system_configs')
      .upsert({ key, value, updated_by: user.id, updated_at: now })
  }

  const settings: BrMonitoringSettings = {
    br_checks_per_day: body.br_checks_per_day ?? DEFAULTS.br_checks_per_day,
    br_max_monitoring_days: body.br_max_monitoring_days ?? DEFAULTS.br_max_monitoring_days,
    clone_threshold_days: body.clone_threshold_days ?? DEFAULTS.clone_threshold_days,
  }

  void supabase
    .from('audit_logs')
    .insert({
      user_id: user.id,
      action: 'update',
      resource_type: 'system_config',
      resource_id: 'monitoring_settings',
      details: { updated: settings },
    })

  return NextResponse.json(settings)
}, ['owner', 'admin'])
