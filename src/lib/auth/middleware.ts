import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClientFromToken } from '@/lib/supabase/server-token'
import type { Role, User } from '@/types/users'

type AuthContext = {
  user: User
  params: Record<string, string>
}

type ApiHandler = (
  req: NextRequest,
  context: AuthContext,
) => Promise<NextResponse>

// RBAC 미들웨어: 인증 + 권한 체크
// 쿠키 인증 (Web) + Bearer 토큰 인증 (Extension) 모두 지원
export const withAuth = (handler: ApiHandler, allowedRoles: Role[]): ((req: NextRequest, routeContext?: { params: Promise<Record<string, string>> }) => Promise<NextResponse>) => {
  return async (req: NextRequest, routeContext?: { params: Promise<Record<string, string>> }) => {
    const params = await routeContext?.params ?? {}

    // Extension Bearer 토큰 우선, 없으면 쿠키 기반 클라이언트
    const authHeader = req.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    const supabase = bearerToken
      ? createClientFromToken(bearerToken)
      : await createClient()

    // 1. Supabase Auth 세션 확인
    const { data: { user: authUser }, error: authError } = bearerToken
      ? await supabase.auth.getUser(bearerToken)
      : await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
        { status: 401 },
      )
    }

    // 2. users 테이블에서 역할 조회
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (dbError || !dbUser) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: '사용자 정보를 찾을 수 없습니다.' } },
        { status: 403 },
      )
    }

    // 3. 활성 사용자 확인
    if (!dbUser.is_active) {
      return NextResponse.json(
        { error: { code: 'ACCOUNT_DISABLED', message: '비활성화된 계정입니다.' } },
        { status: 403 },
      )
    }

    // 4. 역할 권한 확인
    if (!allowedRoles.includes(dbUser.role as Role)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '접근 권한이 없습니다.' } },
        { status: 403 },
      )
    }

    return handler(req, { user: dbUser as User, params })
  }
}
