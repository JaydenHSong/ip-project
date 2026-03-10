// PD Follow-up 모듈 타입 정의

export type PdFollowupTarget = {
  reportId: string
  listingId: string
  asin: string
  marketplace: string
  url: string | null
  snapshotCount: number
}

export type PdFollowupJobData = {
  targets: PdFollowupTarget[]
}

export type PdFollowupResultData = {
  reportId: string
  screenshotUrl: string | null
  listingData: Record<string, unknown>
  crawledAt: string
  listingRemoved: boolean
}
