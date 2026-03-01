export const PATENT_STATUSES = ['active', 'expired', 'pending'] as const
export type PatentStatus = (typeof PATENT_STATUSES)[number]

export type Patent = {
  id: string
  monday_item_id: string | null
  patent_number: string
  patent_name: string
  keywords: string[]
  image_urls: string[]
  country: string
  expiry_date: string | null
  status: PatentStatus
  synced_at: string | null
  created_at: string
  updated_at: string
}

export type ReportPatent = {
  report_id: string
  patent_id: string
  similarity_score: number | null
  ai_reasoning: string | null
  created_at: string
}
