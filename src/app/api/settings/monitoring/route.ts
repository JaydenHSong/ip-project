import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import type { MonitoringSettings } from '@/types/monitoring'

// GET /api/settings/monitoring
// 모니터링 주기 설정 조회
export const GET = withAuth(async () => {
  const supabase = await createClient()

  const { data: intervalSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'monitoring_interval_days')
    .single()

  const { data: maxDaysSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'monitoring_max_days')
    .single()

  const settings: MonitoringSettings = {
    monitoring_interval_days: intervalSetting?.value ? Number(intervalSetting.value) : 7,
    monitoring_max_days: maxDaysSetting?.value ? Number(maxDaysSetting.value) : 90,
  }

  return NextResponse.json(settings)
}, ['viewer', 'editor', 'admin'])

// PUT /api/settings/monitoring
// 모니터링 주기 설정 수정 (admin only)
export const PUT = withAuth(async (req, { user }) => {
  const body = await req.json().catch(() => ({})) as Partial<MonitoringSettings>

  const supabase = await createClient()
  const now = new Date().toISOString()

  if (body.monitoring_interval_days !== undefined) {
    const val = Number(body.monitoring_interval_days)
    if (val < 1 || val > 30) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: '재확인 주기는 1~30일 사이여야 합니다.' } },
        { status: 400 },
      )
    }
    await supabase
      .from('settings')
      .upsert({
        key: 'monitoring_interval_days',
        value: val,
        updated_by: user.id,
        updated_at: now,
      })
  }

  if (body.monitoring_max_days !== undefined) {
    const val = Number(body.monitoring_max_days)
    if (val < 7 || val > 365) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: '최대 모니터링 기간은 7~365일 사이여야 합니다.' } },
        { status: 400 },
      )
    }
    await supabase
      .from('settings')
      .upsert({
        key: 'monitoring_max_days',
        value: val,
        updated_by: user.id,
        updated_at: now,
      })
  }

  const settings: MonitoringSettings = {
    monitoring_interval_days: body.monitoring_interval_days ?? 7,
    monitoring_max_days: body.monitoring_max_days ?? 90,
  }

  return NextResponse.json(settings)
}, ['admin'])
