// Design Ref: §3.3 P2 — SyncService orchestrator (barrel export)
// Plan SC: SC3, SC4 — 250줄 이하 + barrel export 호환

import type { SupabaseClient } from '@supabase/supabase-js'
import type { SpApiPort } from '../../ports/sp-api-port'
import type { AdsPort } from '../../ports/ads-port'
import { syncCampaignsImpl } from './sync-campaigns'
import { syncReportsImpl } from './sync-reports'
import { syncBrandAnalyticsImpl, syncOrderPatternsImpl } from './sync-brand-analytics'
import { analyzeKeywordsImpl } from './keyword-analysis'

export type SyncResult = {
  synced: number
  created: number
  updated: number
  errors: number
}

export type AnalysisResult = {
  campaigns_analyzed: number
  recommendations_created: number
  negative_keywords_found: number
  errors: number
}

export class SyncService {
  constructor(
    private adsPort: AdsPort,
    private spApiPort: SpApiPort,
    private db: SupabaseClient<any, any>,
    private publicDb: SupabaseClient<any, any>,
  ) {}

  async syncBrandAnalytics(profileId: string, reportDate: string): Promise<SyncResult> {
    return syncBrandAnalyticsImpl(this.spApiPort, this.db, profileId, reportDate)
  }

  async syncOrderPatterns(profileId: string): Promise<SyncResult> {
    return syncOrderPatternsImpl(this.spApiPort, this.db, profileId)
  }

  async syncCampaigns(profileId: string): Promise<SyncResult> {
    return syncCampaignsImpl(this.adsPort, this.db, this.publicDb, profileId)
  }

  async syncReports(profileId: string, date: string): Promise<SyncResult> {
    return syncReportsImpl(this.adsPort, this.db, profileId, date)
  }

  async analyzeKeywords(profileId: string): Promise<AnalysisResult> {
    return analyzeKeywordsImpl(this.adsPort, this.db, profileId)
  }
}
