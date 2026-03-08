export type BrFormType =
  | 'other_policy'
  | 'incorrect_variation'
  | 'product_review'
  | 'product_not_as_described'

export type BrSubmitJobData = {
  reportId: string
  formType: BrFormType
  subject: string
  description: string
  productUrls: string[]
  sellerStorefrontUrl?: string
  policyUrl?: string
}

export type BrSubmitResult = {
  reportId: string
  success: boolean
  brCaseId: string | null
  error: string | null
}
