import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo'

type AutoApproveConfig = {
  enabled: boolean
  threshold: number
  types: Record<string, boolean>
}

const DEFAULTS: AutoApproveConfig = {
  enabled: false,
  threshold: 90,
  types: {},
}

// GET /api/settings/auto-approve
export const GET = withAuth(async () => {
  if (isDemoMode()) {
    return NextResponse.json(DEFAULTS)
  }

  const supabase = await createClient()

  const { data: setting } = await supabase
    .from('system_configs')
    .select('value')
    .eq('key', 'auto_approve')
    .single()

  const config: AutoApproveConfig = setting?.value
    ? (setting.value as AutoApproveConfig)
    : DEFAULTS

  return NextResponse.json(config)
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])

// PUT /api/settings/auto-approve
export const PUT = withAuth(async (req, { user }) => {
  const body = await req.json().catch(() => ({})) as Partial<AutoApproveConfig>

  if (isDemoMode()) {
    return NextResponse.json({ ...DEFAULTS, ...body })
  }

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('system_configs')
    .select('value')
    .eq('key', 'auto_approve')
    .single()

  const current: AutoApproveConfig = existing?.value
    ? (existing.value as AutoApproveConfig)
    : DEFAULTS

  const updated: AutoApproveConfig = {
    enabled: body.enabled ?? current.enabled,
    threshold: body.threshold ?? current.threshold,
    types: body.types ?? current.types,
  }

  if (updated.threshold < 50 || updated.threshold > 100) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Threshold must be 50~100.' } },
      { status: 400 },
    )
  }

  const now = new Date().toISOString()

  await supabase
    .from('system_configs')
    .upsert({
      key: 'auto_approve',
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
      resource_id: 'auto_approve',
      details: { previous: current, updated },
    })

  return NextResponse.json(updated)
}, ['owner', 'admin'])
