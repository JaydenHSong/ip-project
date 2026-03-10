export type BrTemplate = {
  id: string
  code: string
  category: string
  title: string
  body: string
  br_form_type: 'other_policy' | 'incorrect_variation' | 'product_review' | 'product_not_as_described'
  instruction: string | null
  violation_codes: string[]
  placeholders: string[]
  active: boolean
  created_at: string
  updated_at: string
}
