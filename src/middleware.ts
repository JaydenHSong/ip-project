import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const middleware = async (req: NextRequest): Promise<NextResponse> => {
  // Demo mode: skip all auth checks
  if (process.env.DEMO_MODE === 'true') {
    // 로그인 페이지 접근 시 대시보드로 리다이렉트
    if (req.nextUrl.pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  }

  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            res.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Extension API — CORS 허용 + 자체 인증
  if (req.nextUrl.pathname.startsWith('/api/ext/')) {
    // OPTIONS preflight
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Extension-Version',
          'Access-Control-Max-Age': '86400',
        },
      })
    }
    res.headers.set('Access-Control-Allow-Origin', '*')
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Extension-Version')
    return res
  }

  // Cron / Crawler / Ops API는 자체 인증 사용 — 미들웨어 스킵
  // /api/ads/cron/* 추가 — ft-runtime-hardening에서 발견: Vercel Cron이 CRON_SECRET 검증 전에
  // 세션 쿠키 없음으로 /login redirect되어 핸들러 도달 실패
  if (req.nextUrl.pathname.startsWith('/api/cron/') ||
      req.nextUrl.pathname.startsWith('/api/ads/cron/') ||
      req.nextUrl.pathname.startsWith('/api/crawler/') ||
      req.nextUrl.pathname.startsWith('/api/ops/')) {
    return res
  }

  // 인증 없이 보호 경로 접근 시 로그인으로 리다이렉트
  if (!user && !req.nextUrl.pathname.startsWith('/login') && !req.nextUrl.pathname.startsWith('/api/auth')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // 이미 인증된 상태에서 로그인 페이지 접근 시 대시보드로 리다이렉트
  if (user && req.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
}
