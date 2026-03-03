export type ReportTemplate = {
  id: string
  title: string
  body: string
  category: string | null
  violation_types: string[]
  marketplace: string[]
  tags: string[]
  is_default: boolean
  usage_count: number
  created_by: string
  created_at: string
  updated_at: string
}

export const TEMPLATE_VARIABLES = [
  '{{ASIN}}',
  '{{TITLE}}',
  '{{SELLER}}',
  '{{BRAND}}',
  '{{MARKETPLACE}}',
  '{{PRICE}}',
  '{{VIOLATION_TYPE}}',
  '{{TODAY}}',
  '{{RATING}}',
  '{{REVIEW_COUNT}}',
] as const

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number]
