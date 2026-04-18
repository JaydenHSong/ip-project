// Shared month window for dashboard aggregations

const getMonthRange = () => {
  const now = new Date()
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const today = now.toISOString().split('T')[0]
  return { start, today, dayOfMonth: now.getDate() }
}

export { getMonthRange }
