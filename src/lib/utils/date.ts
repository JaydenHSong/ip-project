const TZ = 'America/Los_Angeles'

/** Format date as YYYY-MM-DD in LA timezone */
export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-CA', { timeZone: TZ })
}

/** Format date as YYYY-MM-DD HH:mm in LA timezone */
export const formatDateTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const date = d.toLocaleDateString('en-CA', { timeZone: TZ })
  const time = d.toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
  return `${date} ${time}`
}

/** Format time only as HH:mm in LA timezone */
export const formatTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
}

/** Format relative date label (MM/DD HH:mm) in LA timezone */
export const formatShortDateTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const m = (d.toLocaleDateString('en-US', { timeZone: TZ, month: '2-digit' }))
  const day = (d.toLocaleDateString('en-US', { timeZone: TZ, day: '2-digit' }))
  const time = d.toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
  return `${m}/${day} ${time}`
}
