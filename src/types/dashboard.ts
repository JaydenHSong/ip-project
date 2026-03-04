export type PeriodFilter = '7d' | '30d' | '90d'

export type ScopeFilter = 'my' | 'all'

export type MySummary = {
  totalReports: number
  resolvedReports: number
  pendingReports: number
  monitoringReports: number
  totalCampaigns: number
  activeCampaigns: number
}

export type WelcomeNotice = {
  notice_id: string
  title: string
  body: string
  enabled: boolean
}

export type PreviousPeriod = {
  activeCampaigns: number
  pendingReports: number
  totalListings: number
  resolvedRate: number
  aiAccuracy: number
  monitoringCount: number
}

export type DashboardStats = {
  summary: {
    activeCampaigns: number
    pendingReports: number
    totalListings: number
    resolvedRate: number
    aiAccuracy: number
    monitoringCount: number
  }
  previousPeriod?: PreviousPeriod
  reportTrend: {
    date: string
    newReports: number
    resolved: number
  }[]
  violationDist: {
    category: string
    categoryLabel: string
    count: number
  }[]
  statusPipeline: {
    status: string
    statusLabel: string
    count: number
  }[]
  topViolations: {
    code: string
    name: string
    count: number
  }[]
  aiPerformance: {
    avgConfidence: number
    disagreementRate: number
    approveRate: number
    rewriteRate: number
    rejectRate: number
  }
}
