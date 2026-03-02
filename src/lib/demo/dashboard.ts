import type { DashboardStats, PeriodFilter } from '@/types/dashboard'

const seedRandom = (seed: number): number => {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

const periodToDays = (period: PeriodFilter): number => {
  switch (period) {
    case '7d': return 7
    case '30d': return 30
    case '90d': return 90
  }
}

export const getDemoDashboardStats = (period: PeriodFilter): DashboardStats => {
  const days = periodToDays(period)

  // Report Trend — deterministic daily data
  const reportTrend = Array.from({ length: days }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (days - 1 - i))
    const dateStr = date.toISOString().split('T')[0]
    const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
    return {
      date: dateStr,
      newReports: Math.floor(seedRandom(seed) * 6),
      resolved: Math.floor(seedRandom(seed + 1) * 4),
    }
  })

  return {
    summary: {
      activeCampaigns: 2,
      pendingReports: 2,
      totalListings: 5,
      resolvedRate: 25,
      aiAccuracy: 82,
      monitoringCount: 2,
    },
    reportTrend,
    violationDist: [
      { category: 'intellectual_property', categoryLabel: 'IP Infringement', count: 8 },
      { category: 'listing_content', categoryLabel: 'Listing Content', count: 5 },
      { category: 'review_manipulation', categoryLabel: 'Review Manipulation', count: 3 },
      { category: 'selling_practice', categoryLabel: 'Selling Practice', count: 2 },
      { category: 'regulatory_safety', categoryLabel: 'Regulatory/Safety', count: 1 },
    ],
    statusPipeline: [
      { status: 'draft', statusLabel: 'Draft', count: 3 },
      { status: 'pending_review', statusLabel: 'Pending', count: 5 },
      { status: 'approved', statusLabel: 'Approved', count: 4 },
      { status: 'submitted', statusLabel: 'Submitted', count: 3 },
      { status: 'monitoring', statusLabel: 'Monitoring', count: 2 },
      { status: 'resolved', statusLabel: 'Resolved', count: 2 },
      { status: 'rejected', statusLabel: 'Rejected', count: 1 },
    ],
    topViolations: [
      { code: 'V01', name: 'Trademark Infringement', count: 8 },
      { code: 'V04', name: 'Counterfeit Sales', count: 5 },
      { code: 'V02', name: 'Copyright Infringement', count: 4 },
      { code: 'V06', name: 'Prohibited Keywords', count: 3 },
      { code: 'V11', name: 'Review Manipulation', count: 3 },
      { code: 'V03', name: 'Patent Infringement', count: 2 },
      { code: 'V05', name: 'False Advertising', count: 2 },
      { code: 'V08', name: 'Image Policy Violation', count: 2 },
      { code: 'V07', name: 'Inaccurate Product Info', count: 1 },
      { code: 'V16', name: 'Price Manipulation', count: 1 },
    ],
    aiPerformance: {
      avgConfidence: 82,
      disagreementRate: 12,
      approveRate: 72,
      rewriteRate: 18,
      rejectRate: 10,
    },
  }
}
