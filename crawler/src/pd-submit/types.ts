export type PdSubmitJobData = {
  reportId: string
  asin: string
  marketplace: string
  violationTypeSc: string
  description: string
  evidenceUrls: string[]
  scRavUrl: string
}

export type PdSubmitResult = {
  reportId: string
  success: boolean
  pdCaseId: string | null
  error: string | null
}
