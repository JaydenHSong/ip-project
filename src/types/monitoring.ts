export type ReportSnapshot = {
  id: string
  report_id: string
  snapshot_type: 'initial' | 'followup'
  screenshot_url: string | null
  listing_data: Record<string, unknown>
  diff_from_initial: SnapshotDiff | null
  change_detected: boolean
  change_type: 'listing_removed' | 'content_modified' | 'seller_changed' | 'no_change' | null
  ai_remark: string | null
  ai_marking_data: AiMarking[]
  ai_resolution_suggestion: 'resolved' | 'unresolved' | 'continue' | null
  crawled_at: string
  created_at: string
}

export type SnapshotDiff = {
  title_changed: boolean
  description_changed: boolean
  images_changed: boolean
  price_changed: boolean
  seller_changed: boolean
  listing_removed: boolean
  changes: DiffEntry[]
}

export type DiffEntry = {
  field: string
  before: string | null
  after: string | null
}

export type AiMarking = {
  x: number
  y: number
  width: number
  height: number
  label: string
  severity: 'high' | 'medium' | 'low'
}

export type MonitoringSettings = {
  monitoring_interval_days: number
  monitoring_max_days: number
}

export type MonitoringCallbackPayload = {
  report_id: string
  screenshot_url: string | null
  listing_data: Record<string, unknown>
  crawled_at: string
  listing_removed: boolean
}
