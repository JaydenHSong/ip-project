// BR Monitor Worker Types

export type BrMonitorJobData = {
  reports: BrMonitorTarget[]
}

export type BrMonitorTarget = {
  reportId: string
  brCaseId: string
  brCaseStatus: string | null
  lastScrapedAt: string | null
}

export type ScrapedMessage = {
  direction: 'inbound' | 'outbound'
  sender: string
  body: string
  sentAt: string // ISO timestamp
}

export type BrMonitorResult = {
  reportId: string
  brCaseId: string
  brCaseStatus: string
  newMessages: ScrapedMessage[]
  lastAmazonReplyAt: string | null
}

export type CaseDetailScraped = {
  caseId: string
  status: string
  messages: ScrapedMessage[]
}
