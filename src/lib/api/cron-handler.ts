// Design Ref: ft-runtime-hardening §2.2.2 — cron verb/auth 불일치 재발 원천 차단
//
// Purpose: 4개 cron route 공통 로직(CRON_SECRET 검증 + Context 주입 + error envelope)을
// factory로 추출. GET/POST 둘 다 자동 export → Vercel Cron GET 호출 보장.
//
// Usage:
//   import { createCronHandler } from '@/lib/api/cron-handler'
//   import { runAutoPilotCron } from '@/modules/ads/cron/autopilot-run'
//
//   export const { GET, POST } = createCronHandler(
//     async (ctx) => runAutoPilotCron(ctx),
//     { name: 'autopilot-run', maxDuration: 300 },
//   )
//   export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { createAdsAdminContext, type AdsAdminContext } from '@/lib/supabase/ads-context'

export type CronHandlerResult<T> = {
  data: T
  summary?: string
}

export type CronHandler<T> = (
  ctx: AdsAdminContext,
  req: NextRequest,
) => Promise<CronHandlerResult<T>>

export type CronHandlerOptions = {
  /** 태그용. 에러 메시지 + 응답 메타에 포함됨 */
  name: string
  /** Vercel Function maxDuration (seconds). route.ts에서도 별도 export 필요 */
  maxDuration?: number
}

export function createCronHandler<T>(
  handler: CronHandler<T>,
  options: CronHandlerOptions,
) {
  const impl = async (req: NextRequest) => {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid CRON_SECRET' } },
        { status: 401 },
      )
    }

    try {
      const ctx = createAdsAdminContext()
      const { data, summary } = await handler(ctx, req)
      return NextResponse.json({
        success: true,
        data,
        ...(summary !== undefined && { summary }),
        _meta: {
          name: options.name,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return NextResponse.json(
        {
          error: {
            code: 'CRON_ERROR',
            message: `[${options.name}] ${message}`,
          },
        },
        { status: 500 },
      )
    }
  }

  return { GET: impl, POST: impl }
}
