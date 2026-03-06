import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Bearer 토큰 기반 Supabase 클라이언트 (Extension API 전용)
// 쿠키가 없는 Extension 요청에서 access_token으로 직접 인증
export const createClientFromToken = (accessToken: string) =>
  createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    },
  )
