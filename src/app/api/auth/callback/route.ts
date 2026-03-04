import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const GET = async (req: NextRequest): Promise<NextResponse> => {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', req.url))
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL('/login?error=auth_failed', req.url))
  }

  // @spigen.com 도메인 체크
  const email = data.user?.email ?? ''
  if (!email.endsWith('@spigen.com')) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login?error=domain_restricted', req.url))
  }

  // users 테이블에 사용자 upsert (첫 로그인 시 Viewer로 생성)
  // Admin 클라이언트 사용 — RLS를 우회하여 last_login_at이 매 로그인마다 갱신되도록 보장
  const adminSupabase = createAdminClient()
  const { error: upsertError } = await adminSupabase
    .from('users')
    .upsert(
      {
        id: data.user.id,
        email: data.user.email!,
        name: data.user.user_metadata?.full_name ?? data.user.email!.split('@')[0],
        avatar_url: data.user.user_metadata?.avatar_url ?? null,
        last_login_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )

  if (upsertError) {
    return NextResponse.redirect(new URL('/login?error=user_sync_failed', req.url))
  }

  // 비활성화된 사용자 차단
  const { data: dbUser } = await supabase
    .from('users')
    .select('is_active')
    .eq('id', data.user.id)
    .single()

  if (dbUser && !dbUser.is_active) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login?error=account_deactivated', req.url))
  }

  return NextResponse.redirect(new URL(next, req.url))
}
