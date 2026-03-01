import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/ext/auth-status — Extension 인증 상태 확인
// 미인증이어도 200 반환 (Extension에서 상태 판단용)
export const GET = async (req: NextRequest): Promise<NextResponse> => {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        authenticated: false,
        user: null,
      })
    }

    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

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
