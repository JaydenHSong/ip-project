import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const revalidate = 300 // 5분 캐시

export const GET = async (): Promise<NextResponse> => {
  const supabase = createAdminClient()

  const { data: releases, error } = await supabase
    .from('extension_releases')
    .select('version, download_url, changes, released_at')
    .order('released_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const latest = releases?.[0] ?? null

  return NextResponse.json({
    latest,
    history: releases ?? [],
  })
}
