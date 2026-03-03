import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo'
import { getDemoDashboardStats } from '@/lib/demo/dashboard'
import { VIOLATION_TYPES } from '@/constants/violations'
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

  if (isDemoMode()) {
    return NextResponse.json(getDemoDashboardStats(period))
  }

  const supabase = await createClient()
  const days = periodToDays(period)
  const periodStart = new Date()
  periodStart.setDate(periodStart.getDate() - days)
  const periodStartISO = periodStart.toISOString()

  // Fetch all reports in period for aggregation
  const { data: reports } = await supabase
    .from('reports')
    .select('status, violation_type, ai_confidence_score, disagreement_flag, created_at')
    .gte('created_at', periodStartISO)

  const allReports = reports ?? []

  // Summary counts
  const { count: activeCampaigns } = await supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  const { count: totalListings } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })

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

  // Violation distribution by category
  const categoryMap = new Map<string, number>()
  for (const r of allReports) {
    if (!r.violation_type) continue
    const vt = VIOLATION_TYPES[r.violation_type as keyof typeof VIOLATION_TYPES]
    const cat = vt?.category ?? 'unknown'
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1)
  }
  const CATEGORY_LABELS: Record<string, string> = {
    intellectual_property: 'IP Infringement',
    listing_content: 'Listing Content',
    review_manipulation: 'Review Manipulation',
    selling_practice: 'Selling Practice',
    regulatory_safety: 'Regulatory/Safety',
  }
  const violationDist = Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, categoryLabel: CATEGORY_LABELS[category] ?? category, count }))
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

  // Top violations
  const vtMap = new Map<string, number>()
  for (const r of allReports) {
    if (!r.violation_type) continue
    vtMap.set(r.violation_type, (vtMap.get(r.violation_type) ?? 0) + 1)
  }
  const topViolations = Array.from(vtMap.entries())
    .map(([code, count]) => ({
      code,
      name: VIOLATION_TYPES[code as keyof typeof VIOLATION_TYPES]?.name ?? code,
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

  const stats: DashboardStats = {
    summary: {
      activeCampaigns: activeCampaigns ?? 0,
      pendingReports,
      totalListings: totalListings ?? 0,
      resolvedRate,
      aiAccuracy: avgConfidence,
      monitoringCount,
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
