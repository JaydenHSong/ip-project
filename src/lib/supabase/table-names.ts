// Compile-time table-name typo guard.
//
// Use these helpers to wrap table names in `.from()` calls so TypeScript
// catches typos like `automation_logs` (plural) → real table is `automation_log`.
//
// Usage:
//   import { adsTable, publicTable } from '@/lib/supabase/table-names'
//   supabase.from(adsTable('automation_log'))      // ✅ ok
//   supabase.from(adsTable('automation_logs'))     // ❌ TS error
//
// We don't apply Database<...> generics to the supabase client globally
// because cross-schema joins and dynamic queries break under strict typing.
// These helpers give targeted typo-safety without rewriting the codebase.
//
// Source of truth: pulled from `mcp__supabase__list_tables(['public', 'ads'])`.
// Regenerate when adding/renaming tables. (No automatic generation —
// `generate_typescript_types` only emits the `public` schema.)

export type AdsTableName =
  | 'marketplace_profiles'
  | 'api_tokens'
  | 'campaigns'
  | 'ad_groups'
  | 'keywords'
  | 'report_snapshots'
  | 'keyword_rankings'
  | 'search_term_reports'
  | 'orders_daily_cache'
  | 'spend_diagnostics'
  | 'spend_trends'
  | 'rules'
  | 'automation_log' // singular — `automation_logs` (plural) does NOT exist
  | 'keyword_recommendations'
  | 'change_log'
  | 'budgets'
  | 'budget_change_log'
  | 'dayparting_schedules'
  | 'dayparting_hourly_weights'
  | 'alerts'
  | 'notifications_log'
  | 'cache_autopilot_summary'
  | 'ai_reviews'

export type PublicTableName =
  | 'users'
  | 'campaigns'
  | 'listings'
  | 'campaign_listings'
  | 'reports'
  | 'report_snapshots'
  | 'patents'
  | 'report_patents'
  | 'notifications'
  | 'audit_logs'
  | 'trademarks'
  | 'product_categories'
  | 'changelog_entries'
  | 'system_configs'
  | 'sc_credentials'
  | 'report_templates'
  | 'ip_assets'
  | 'crawler_logs'
  | 'notices'
  | 'extension_fetch_queue'
  | 'ai_learning_records'
  | 'extension_releases'
  | 'user_preferences'
  | 'ai_prompts'
  | 'ai_accuracy_logs'
  | 'br_case_messages'
  | 'br_case_notes'
  | 'br_case_events'
  | 'notification_rules'
  | 'br_templates'
  | 'notice_reads'
  | 'report_read_status'
  | 'org_units'
  | 'user_org_units'
  | 'module_access_configs'
  | 'brands'
  | 'brand_markets'
  | 'brand_market_permissions'

export const adsTable = <T extends AdsTableName>(name: T): T => name
export const publicTable = <T extends PublicTableName>(name: T): T => name
