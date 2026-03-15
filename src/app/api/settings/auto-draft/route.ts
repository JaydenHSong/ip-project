import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDemoMode } from '@/lib/demo'

type AutoDraftConfig = {
  enabled: boolean
  types: Record<string, boolean>
}

const DEFAULTS: AutoDraftConfig = {
  enabled: false,
  types: {},
}

// GET /api/settings/auto-draft
export const GET = withAuth(async () => {
  if (isDemoMode()) {
    return NextResponse.json(DEFAULTS)
  }

  const supabase = await createClient()

  // Try new key first, fallback to legacy key
  const { data: setting } = await supabase
    .from('system_configs')
    .select('value')
    .eq('key', 'auto_draft')
    .single()

  if (setting?.value) {
    return NextResponse.json(setting.value as AutoDraftConfig)
  }

  // Fallback: read legacy auto_approve key
  const { data: legacy } = await supabase
    .from('system_configs')
    .select('value')
    .eq('key', 'auto_approve')
    .single()

  if (legacy?.value) {
    const v = legacy.value as Record<string, unknown>
    return NextResponse.json({ enabled: v.enabled === true, types: (v.types ?? {}) as Record<string, boolean> })
  }

  return NextResponse.json(DEFAULTS)
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])

// PUT /api/settings/auto-draft
export const PUT = withAuth(async (req, { user }) => {
  const body = await req.json().catch(() => ({})) as Partial<AutoDraftConfig>

  if (isDemoMode()) {
    return NextResponse.json({ ...DEFAULTS, ...body })
  }

  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('system_configs')
    .select('value')
    .eq('key', 'auto_draft')
    .single()

  const current: AutoDraftConfig = existing?.value
    ? (existing.value as AutoDraftConfig)
    : DEFAULTS

  const updated: AutoDraftConfig = {
    enabled: body.enabled ?? current.enabled,
    types: body.types ?? current.types,
  }

  const now = new Date().toISOString()

  await supabase
    .from('system_configs')
    .upsert({
      key: 'auto_draft',
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
      resource_id: 'auto_draft',
      details: { previous: current, updated },
    })

  return NextResponse.json(updated)
}, ['owner', 'admin'])
