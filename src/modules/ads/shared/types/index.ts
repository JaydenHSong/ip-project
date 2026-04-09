// Design Ref: §3.2 P1 — Barrel re-export (기존 import 경로 호환)
// Plan SC: SC4 — barrel export로 기존 import 100% 유지

export type {
  // Enums
  CampaignType, CampaignMode, CampaignStatus, AmazonState,
  MatchType, KeywordState, Region, Channel, ReportLevel,
  TrendSignal, AlertType, Severity, ActionType, ActionSource, GoalMode,
  RecommendationType, RecommendationStatus, ImpactLevel,
  RuleTemplate, RunFrequency, DiagnosisType, TrendDirection,
} from './enums'

export type {
  MarketplaceProfile, Campaign, AdGroup, Keyword,
} from './campaigns'

export type {
  ReportSnapshot, KpiMetrics, SearchTermReport, KeywordRanking,
} from './reporting'

export type {
  Rule, AutomationLogEntry, KeywordRecommendation,
} from './automation'

export type {
  DaypartingSchedule, HourlyWeight, SpendDiagnostic, SpendTrend,
} from './optimization'

export type {
  ApiToken, Budget, Alert, BudgetChangeLog, ChangeLog,
  OrdersDailyCache, NotificationLog, CacheAutopilotSummary,
} from './infrastructure'
