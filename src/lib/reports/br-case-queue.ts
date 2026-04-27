type BrCaseQueueRow = {
  br_case_status?: string | null
  br_last_amazon_reply_at?: string | null
  br_last_our_reply_at?: string | null
  br_submitted_at?: string | null
  created_at?: string | null
}

const toTimestamp = (value: string | null | undefined): number => {
  if (!value) return 0

  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

export const hasUnreadAmazonReply = (
  row: BrCaseQueueRow,
  readAt: string | null | undefined,
): boolean => {
  if (row.br_case_status === 'closed') return false

  const amazonReplyAt = toTimestamp(row.br_last_amazon_reply_at)
  if (amazonReplyAt === 0) return false

  const ourReplyAt = toTimestamp(row.br_last_our_reply_at)
  const readAtTimestamp = toTimestamp(readAt)

  return amazonReplyAt > ourReplyAt && amazonReplyAt > readAtTimestamp
}

export const getLastBrActivityAt = (row: BrCaseQueueRow): number =>
  Math.max(
    toTimestamp(row.br_last_amazon_reply_at),
    toTimestamp(row.br_last_our_reply_at),
    toTimestamp(row.br_submitted_at),
    toTimestamp(row.created_at),
  )
