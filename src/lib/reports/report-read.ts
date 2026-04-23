const READABLE_REPORT_STATUSES = new Set(['monitoring', 'br_submitting'])

type ReadableReport = {
  status?: string | null
  br_last_amazon_reply_at?: string | null
}

export const REPORT_READ_UPDATED_EVENT = 'report-read-updated'

export const shouldMarkReportAsRead = (report: ReadableReport): boolean =>
  READABLE_REPORT_STATUSES.has(report.status ?? '') && Boolean(report.br_last_amazon_reply_at)
