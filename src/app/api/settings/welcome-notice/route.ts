import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { WelcomeNotice } from '@/types/dashboard'

export const GET = async (request: Request): Promise<NextResponse> => {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
  }

  const supabase = await createClient()

  const { data } = await supabase
    .from('system_configs')
    .select('value')
    .eq('key', 'welcome_notice')
    .single()

  if (!data?.value) {
    return NextResponse.json({ enabled: false, notice_id: '', title: '', body: '' } satisfies WelcomeNotice)
  }

  const raw = data.value as Record<string, unknown>
  if (raw.enabled !== true) {
    return NextResponse.json({ enabled: false, notice_id: '', title: '', body: '' } satisfies WelcomeNotice)
  }

  const { searchParams } = new URL(request.url)
  const lang = searchParams.get('lang') ?? 'en'
  const titleKey = lang === 'ko' ? 'title_ko' : 'title_en'
  const bodyKey = lang === 'ko' ? 'body_ko' : 'body_en'

  const notice: WelcomeNotice = {
    notice_id: String(raw.notice_id ?? ''),
    title: String(raw[titleKey] ?? raw.title_en ?? ''),
    body: String(raw[bodyKey] ?? raw.body_en ?? ''),
    enabled: true,
  }

  return NextResponse.json(notice)
}
