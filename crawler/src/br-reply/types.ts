// BR Reply Worker Types

export type BrReplyAttachment = {
  name: string
  storage_path: string
  size: number
}

export type BrReplyJobData = {
  reportId: string
  brCaseId: string
  text: string
  attachments: BrReplyAttachment[]
}

export type BrReplyResult = {
  reportId: string
  brCaseId: string
  success: boolean
  error: string | null
  sentAt: string | null
}

export type BrReplyPendingReport = {
  report_id: string
  br_case_id: string
  text: string
  attachments: BrReplyAttachment[]
}
