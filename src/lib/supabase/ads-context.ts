// Design Ref: ft-runtime-hardening §2.2.1 — AdsAdminContext 단일 진입점
//
// Purpose: ads 모듈에서 DB 접근할 때 반드시 이 컨텍스트를 사용하도록 타입 레벨 강제.
// 과거 버그 패턴(`.from('ads.xxx')` + createAdminClient()) 재발 방지.
//
// Usage:
//   const ctx = createAdsAdminContext()
//   await ctx.ads.from(ctx.adsTable('campaigns')).select()
//   await ctx.public.from(ctx.publicTable('brand_markets')).select()
//
// Security: 두 클라이언트 모두 service-role 사용 → RLS 우회. tenant isolation은
// 호출자 책임 (brand_market_id / org_unit_id 필터를 query에 명시적으로 붙일 것).

import { createAdminClient, createAdsAdminClient } from './admin'
import { adsTable, publicTable } from './table-names'

/**
 * Schema-agnostic Supabase client type.
 * Use this in helper/query functions that can accept either ads or public schema client.
 * Design Ref: ft-runtime-hardening §7.1 — cross-schema helper signatures
 */
export type AnyAdsDb = ReturnType<typeof createAdsAdminClient> | ReturnType<typeof createAdminClient>

export type AdsAdminContext = {
  /** ads 스키마 전용 클라이언트 (campaigns, keywords, automation_log, report_snapshots, ...) */
  ads: ReturnType<typeof createAdsAdminClient>
  /** public 스키마 전용 클라이언트 (brand_markets, org_units, system_configs, users, ...) */
  public: ReturnType<typeof createAdminClient>
  /** 컴파일 타임 ads 테이블명 typo 가드 */
  adsTable: typeof adsTable
  /** 컴파일 타임 public 테이블명 typo 가드 */
  publicTable: typeof publicTable
}

export function createAdsAdminContext(): AdsAdminContext {
  return {
    ads: createAdsAdminClient(),
    public: createAdminClient(),
    adsTable,
    publicTable,
  }
}
