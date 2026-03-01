import { NextRequest, NextResponse } from 'next/server'

type ServiceAuthContext = {
  service: 'crawler'
}

type ServiceApiHandler = (
  req: NextRequest,
  context: ServiceAuthContext,
) => Promise<NextResponse>

// Service Token 인증 미들웨어 (Crawler 전용)
// Supabase 세션이 아닌 환경변수 토큰으로 인증
const withServiceAuth = (
  handler: ServiceApiHandler,
): ((req: NextRequest) => Promise<NextResponse>) => {
  return async (req: NextRequest) => {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')

    if (!token || token !== process.env.CRAWLER_SERVICE_TOKEN) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid service token' } },
        { status: 401 },
      )
    }

    return handler(req, { service: 'crawler' })
  }
}

export { withServiceAuth }
export type { ServiceAuthContext }
