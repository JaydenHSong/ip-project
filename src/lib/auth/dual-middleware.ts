import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from './middleware'
import type { Role } from '@/types/users'

type DualApiHandler = (req: NextRequest, context?: unknown) => Promise<NextResponse>

// 듀얼 인증: Bearer 토큰 (서비스) 또는 Supabase 세션 (사용자)
// Crawler가 /api/ai/analyze를 호출할 때 서비스 토큰 사용
const withDualAuth = (
  handler: DualApiHandler,
  allowedRoles: Role[],
): ((req: NextRequest) => Promise<NextResponse>) => {
  return async (req: NextRequest) => {
    const authHeader = req.headers.get('authorization')

    // 서비스 토큰 모드
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      if (!token || token !== process.env.CRAWLER_SERVICE_TOKEN) {
        return NextResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Invalid service token' } },
          { status: 401 },
        )
      }
      return handler(req)
    }

    // 사용자 세션 모드 (기존 withAuth 위임)
    return withAuth(
      (innerReq, ctx) => handler(innerReq, ctx),
      allowedRoles,
    )(req)
  }
}

export { withDualAuth }
