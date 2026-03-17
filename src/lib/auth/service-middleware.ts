import { NextRequest, NextResponse } from 'next/server'

type ServiceAuthContext = {
  service: 'crawler'
  params: Record<string, string>
}

type ServiceApiHandler = (
  req: NextRequest,
  context: ServiceAuthContext,
) => Promise<NextResponse>

// Service Token 인증 미들웨어 (Crawler 전용)
// Supabase 세션이 아닌 환경변수 토큰으로 인증
const withServiceAuth = (
  handler: ServiceApiHandler,
): ((req: NextRequest, routeContext?: { params: Promise<Record<string, string>> }) => Promise<NextResponse>) => {
  return async (req: NextRequest, routeContext?: { params: Promise<Record<string, string>> }) => {
    const params = await routeContext?.params ?? {}
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')

    if (!token || token !== process.env.CRAWLER_SERVICE_TOKEN) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid service token' } },
        { status: 401 },
      )
    }

    return handler(req, { service: 'crawler', params })
  }
}

export { withServiceAuth }
export type { ServiceAuthContext }
