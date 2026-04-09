// Design Ref: §3.2 P1 — Enum union types (도메인 전체에서 사용)

/** @group Campaign */
export type CampaignType = 'sp' | 'sb' | 'sd'
export type CampaignMode = 'autopilot' | 'manual'
export type CampaignStatus = 'active' | 'paused' | 'learning' | 'archived'
export type AmazonState = 'enabled' | 'paused' | 'archived'
export type GoalMode = 'launch' | 'growth' | 'profit' | 'defend'

/** @group Keyword */
export type MatchType = 'broad' | 'phrase' | 'exact' | 'negative' | 'negative_phrase'
export type KeywordState = 'enabled' | 'paused' | 'archived'

/** @group Geography & Channel */
export type Region = 'NA' | 'EU' | 'FE'
export type Channel = 'sp' | 'sb' | 'sd'

/** @group Reporting */
export type ReportLevel = 'campaign' | 'ad_group' | 'keyword' | 'search_term'
export type TrendSignal = 'rising' | 'emerging' | 'stable' | 'declining'

/** @group Alert */
export type AlertType = 'budget_runout' | 'spend_spike' | 'acos_spike' | 'zero_sales' | 'buybox_lost' | 'stock_low' | 'cpc_surge' | 'cvr_drop'
export type Severity = 'critical' | 'warning' | 'info'

/** @group Automation */
export type ActionType = 'bid_adjust' | 'keyword_add' | 'keyword_negate' | 'keyword_promote' | 'budget_adjust' | 'campaign_pause' | 'campaign_resume' | 'dayparting_apply'
export type ActionSource = 'rule_engine' | 'algorithm' | 'ml' | 'manual' | 'autopilot_formula' | 'autopilot_ai'
export type RecommendationType = 'bid_adjust' | 'promote' | 'negate' | 'new_keyword' | 'trend_alert'
export type RecommendationStatus = 'pending' | 'approved' | 'skipped' | 'expired'
export type ImpactLevel = 'high' | 'medium' | 'low'
export type RuleTemplate = 'high_acos_pause' | 'winner_promote' | 'low_ctr_negate' | 'budget_guard' | 'custom'
export type RunFrequency = 'hourly' | 'daily' | 'weekly'

/** @group Spend Intelligence */
export type DiagnosisType = 'underspend' | 'overspend' | 'waste' | 'trend_decline'
export type TrendDirection = 'improving' | 'stable' | 'worsening'
