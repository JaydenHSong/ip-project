import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Service Role 클라이언트 (API Route 전용)
// RLS를 우회하여 관리 작업 수행
export const createAdminClient = () =>
  createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

// ads 스키마 전용 Admin 클라이언트
export const createAdsAdminClient = () =>
  createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'ads' } },
  )
