export type BrFormType =
  | 'other_policy'
  | 'incorrect_variation'
  | 'product_review'

export type BrSubmitJobData = {
  reportId: string
  formType: BrFormType
  subject?: string
  description: string
  productUrls: string[]
  sellerStorefrontUrl?: string
  policyUrl?: string
  asins?: string[]
  reviewUrls?: string[]
  orderId?: string
  dryRun?: boolean
}

export type BrSubmitResult = {
  reportId: string
  success: boolean
  brCaseId: string | null
  error: string | null
}
