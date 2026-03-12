import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo'
import { getDemoDashboardStats } from '@/lib/demo/dashboard'
import { getBrFormTypeLabel } from '@/constants/br-form-types'
import type { PeriodFilter, DashboardStats } from '@/types/dashboard'

const VALID_PERIODS: PeriodFilter[] = ['7d', '30d', '90d']

const periodToDays = (period: PeriodFilter): number => {
  switch (period) {
    case '7d': return 7
    case '30d': return 30
    case '90d': return 90
  }
}

export const GET = async (request: Request): Promise<NextResponse> => {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const periodParam = searchParams.get('period') ?? '30d'
  const period = VALID_PERIODS.includes(periodParam as PeriodFilter)
    ? (periodParam as PeriodFilter)
    : '30d'
  const scope = searchParams.get('scope') ?? 'all'
  const marketplace = searchParams.get('marketplace') ?? null
  const userId = scope === 'my' ? user.id : null

  if (isDemoMode()) {
    return NextResponse.json(getDemoDashboardStats(period))
  }

  const supabase = await createClient()
  const days = periodToDays(period)
  const periodStart = new Date()
  periodStart.setDate(periodStart.getDate() - days)
  const periodStartISO = periodStart.toISOString()

  const prevPeriodEnd = new Date(periodStart)
  const prevPeriodStart = new Date(prevPeriodEnd)
  prevPeriodStart.setDate(prevPeriodStart.getDate() - days)
  const prevPeriodStartISO = prevPeriodStart.toISOString()
  const prevPeriodEndISO = prevPeriodEnd.toISOString()

  // Fetch all reports in period for aggregation
  let reportQuery = supabase
    .from('reports')
    .select('status, violation_type, br_form_type, ai_confidence_score, disagreement_flag, created_at, listings!inner(marketplace)')
    .gte('created_at', periodStartISO)

  if (userId) {
    reportQuery = reportQuery.eq('created_by', userId)
  }
  if (marketplace) {
    reportQuery = reportQuery.eq('listings.marketplace', marketplace)
  }

  const { data: reports } = await reportQuery

  // Fetch previous period reports for comparison
  let prevReportQuery = supabase
    .from('reports')
    .select('status, ai_confidence_score, created_at')
    .gte('created_at', prevPeriodStartISO)
    .lt('created_at', prevPeriodEndISO)

  if (userId) {
    prevReportQuery = prevReportQuery.eq('created_by', userId)
  }

  const { data: prevReports } = await prevReportQuery
  const prevAllReports = prevReports ?? []

  const allReports = reports ?? []

  // Summary counts
  let campaignCountQuery = supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  if (userId) {
    campaignCountQuery = campaignCountQuery.eq('created_by', userId)
  }

  const { count: activeCampaigns } = await campaignCountQuery

  let listingsCount = 0
  if (userId) {
    const { count } = await supabase
      .from('listings')
      .select('*, campaigns!inner(created_by)', { count: 'exact', head: true })
      .eq('campaigns.created_by', userId)
      .in('source', ['crawler', 'extension', 'extension_passive'])
    listingsCount = count ?? 0
  } else {
    const { count } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .in('source', ['crawler', 'extension', 'extension_passive'])
    listingsCount = count ?? 0
  }

  let suspectCount = 0
  if (userId) {
    const { count } = await supabase
      .from('listings')
      .select('*, campaigns!inner(created_by)', { count: 'exact', head: true })
      .eq('campaigns.created_by', userId)
      .in('source', ['crawler', 'extension', 'extension_passive'])
      .eq('is_suspect', true)
    suspectCount = count ?? 0
  } else {
    const { count } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .in('source', ['crawler', 'extension', 'extension_passive'])
      .eq('is_suspect', true)
    suspectCount = count ?? 0
  }

  const pendingReports = allReports.filter((r) => ['draft', 'pending_review'].includes(r.status)).length
  const resolvedCount = allReports.filter((r) => r.status === 'resolved').length
  const monitoringCount = allReports.filter((r) => r.status === 'monitoring').length
  const resolvedRate = allReports.length > 0 ? Math.round((resolvedCount / allReports.length) * 100) : 0

  const withAiScore = allReports.filter((r) => r.ai_confidence_score !== null)
  const avgConfidence = withAiScore.length > 0
    ? Math.round(withAiScore.reduce((sum, r) => sum + (r.ai_confidence_score ?? 0), 0) / withAiScore.length)
    : 0

  const disagreementCount = allReports.filter((r) => r.disagreement_flag).length
  const disagreementRate = allReports.length > 0 ? Math.round((disagreementCount / allReports.length) * 100) : 0

  // Report trend (daily)
  const trendMap = new Map<string, { newReports: number; resolved: number }>()
  for (let i = 0; i < days; i++) {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    const dateStr = d.toISOString().split('T')[0]
    trendMap.set(dateStr, { newReports: 0, resolved: 0 })
  }
  for (const r of allReports) {
    const dateStr = r.created_at.split('T')[0]
    const entry = trendMap.get(dateStr)
    if (entry) {
      entry.newReports++
      if (r.status === 'resolved') entry.resolved++
    }
  }
  const reportTrend = Array.from(trendMap.entries()).map(([date, val]) => ({ date, ...val }))

  // Violation distribution by BR form type
  const categoryMap = new Map<string, number>()
  for (const r of allReports) {
    const brType = r.br_form_type ?? r.violation_type ?? 'unknown'
    categoryMap.set(brType, (categoryMap.get(brType) ?? 0) + 1)
  }
  const violationDist = Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, categoryLabel: getBrFormTypeLabel(category), count }))
    .sort((a, b) => b.count - a.count)

  // Status pipeline
  const statusMap = new Map<string, number>()
  for (const r of allReports) {
    statusMap.set(r.status, (statusMap.get(r.status) ?? 0) + 1)
  }
  const STATUS_LABELS: Record<string, string> = {
    draft: 'Draft', pending_review: 'Pending', approved: 'Approved',
    submitted: 'Submitted', monitoring: 'Monitoring', resolved: 'Resolved', rejected: 'Rejected',
  }
  const statusPipeline = ['draft', 'pending_review', 'approved', 'submitted', 'monitoring', 'resolved', 'rejected']
    .filter((s) => statusMap.has(s))
    .map((status) => ({ status, statusLabel: STATUS_LABELS[status] ?? status, count: statusMap.get(status) ?? 0 }))

  // Top violations (by BR form type)
  const vtMap = new Map<string, number>()
  for (const r of allReports) {
    const brType = r.br_form_type ?? r.violation_type
    if (!brType) continue
    vtMap.set(brType, (vtMap.get(brType) ?? 0) + 1)
  }
  const topViolations = Array.from(vtMap.entries())
    .map(([code, count]) => ({
      code,
      name: getBrFormTypeLabel(code),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // AI performance
  const approvedCount = allReports.filter((r) => r.status === 'approved' || r.status === 'submitted').length
  const rejectedCount = allReports.filter((r) => r.status === 'rejected').length
  const totalDecided = approvedCount + rejectedCount
  const approveRate = totalDecided > 0 ? Math.round((approvedCount / totalDecided) * 100) : 0
  const rejectRate = totalDecided > 0 ? Math.round((rejectedCount / totalDecided) * 100) : 0

  // Previous period summary for comparison
  const prevPending = prevAllReports.filter((r) => ['draft', 'pending_review'].includes(r.status)).length
  const prevResolved = prevAllReports.filter((r) => r.status === 'resolved').length
  const prevMonitoring = prevAllReports.filter((r) => r.status === 'monitoring').length
  const prevResolvedRate = prevAllReports.length > 0 ? Math.round((prevResolved / prevAllReports.length) * 100) : 0
  const prevWithAi = prevAllReports.filter((r) => r.ai_confidence_score !== null)
  const prevAiAccuracy = prevWithAi.length > 0
    ? Math.round(prevWithAi.reduce((sum, r) => sum + (r.ai_confidence_score ?? 0), 0) / prevWithAi.length)
    : 0

  const stats: DashboardStats = {
    summary: {
      activeCampaigns: activeCampaigns ?? 0,
      pendingReports,
      totalListings: listingsCount,
      suspectListings: suspectCount,
      resolvedRate,
      aiAccuracy: avgConfidence,
      monitoringCount,
    },
    previousPeriod: {
      activeCampaigns: activeCampaigns ?? 0,
      pendingReports: prevPending,
      totalListings: listingsCount,
      suspectListings: suspectCount,
      resolvedRate: prevResolvedRate,
      aiAccuracy: prevAiAccuracy,
      monitoringCount: prevMonitoring,
    },
    reportTrend,
    violationDist,
    statusPipeline,
    topViolations,
    aiPerformance: {
      avgConfidence,
      disagreementRate,
      approveRate,
      rewriteRate: 100 - approveRate - rejectRate,
      rejectRate,
    },
  }

  return NextResponse.json(stats)
}
