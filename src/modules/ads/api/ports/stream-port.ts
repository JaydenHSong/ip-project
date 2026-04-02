// Design Ref: §3.3 — Marketing Stream interface (Port)

export type StreamMetric = {
  campaign_id: string
  ad_group_id?: string
  keyword_id?: string
  date: string
  hour: number
  impressions: number
  clicks: number
  cost: number
  sales: number
  orders: number
}

export type StreamMetricBatch = {
  profile_id: string
  dataset_id: string
  metrics: StreamMetric[]
}

export type ProcessResult = {
  processed: number
  alerts_triggered: number
  errors: number
}

export type StreamPort = {
  validateSignature(payload: string, signature: string): boolean
  parseMetrics(payload: unknown): StreamMetricBatch
  processMetrics(batch: StreamMetricBatch): Promise<ProcessResult>
}
