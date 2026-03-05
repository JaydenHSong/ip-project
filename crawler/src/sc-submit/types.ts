export type ScSubmitJobData = {
  reportId: string
  asin: string
  marketplace: string
  violationTypeSc: string
  description: string
  evidenceUrls: string[]
  scRavUrl: string
}

export type ScSubmitResult = {
  reportId: string
  success: boolean
  scCaseId: string | null
  error: string | null
}
