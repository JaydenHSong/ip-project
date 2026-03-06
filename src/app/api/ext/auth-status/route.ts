import { NextRequest, NextResponse } from 'next/server'
import { createClientFromToken } from '@/lib/supabase/server-token'

// GET /api/ext/auth-status — Extension 인증 상태 확인
// Bearer 토큰 기반 인증 (Extension은 쿠키 없음)
export const GET = async (req: NextRequest): Promise<NextResponse> => {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        authenticated: false,
        user: null,
      })
    }

    const token = authHeader.slice(7)
    const supabase = createClientFromToken(token)
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return NextResponse.json({
        authenticated: false,
        user: null,
      })
    }

    // users 테이블에서 role 조회
    const { data: profile } = await supabase
      .from('users')
      .select('role, name')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email ?? '',
        name: profile?.name ?? user.user_metadata?.full_name ?? '',
        role: profile?.role ?? 'viewer',
      },
    })
  } catch {
    return NextResponse.json({
      authenticated: false,
      user: null,
    })
  }
}
