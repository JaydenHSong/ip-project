import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

type PeriodDays = 7 | 30 | 90

const PERIOD_MAP: Record<string, PeriodDays> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
}

type ConfidenceRange = '90-100' | '70-89' | '50-69' | '0-49'

const getConfidenceRange = (score: number): ConfidenceRange => {
  if (score >= 90) return '90-100'
  if (score >= 70) return '70-89'
  if (score >= 50) return '50-69'
  return '0-49'
}

type ReportRow = {
  id: string
  ai_violation_type: string | null
  confirmed_violation_type: string | null
  user_violation_type: string | null
  ai_confidence_score: number | null
  disagreement_flag: boolean | null
}

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role !== 'owner' && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const periodParam = request.nextUrl.searchParams.get('period') ?? '30d'
  const days = PERIOD_MAP[periodParam] ?? 30

  const supabase = await createClient()

  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('reports')
    .select('id, ai_violation_type, confirmed_violation_type, user_violation_type, ai_confidence_score, disagreement_flag')
    .not('ai_violation_type', 'is', null)
    .gte('created_at', since.toISOString())
    .neq('status', 'archived')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const reports = (data ?? []) as ReportRow[]

  // Only use reports where human confirmed the violation type
  const confirmed = reports.filter(
    (r) => r.confirmed_violation_type !== null || r.user_violation_type !== null
  )

  // Build per-violation-type stats
  const byType: Record<string, { total: number; correct: number; misclass: Record<string, number> }> = {}

  // Confidence calibration buckets
  const calibration: Record<ConfidenceRange, { correct: number; total: number }> = {
    '90-100': { correct: 0, total: 0 },
    '70-89': { correct: 0, total: 0 },
    '50-69': { correct: 0, total: 0 },
    '0-49': { correct: 0, total: 0 },
  }

  // Confusion matrix: predicted -> actual -> count
  const confusionMatrix: Record<string, Record<string, number>> = {}

  let totalCorrect = 0

  for (const r of confirmed) {
    const predicted = r.ai_violation_type!
    const actual = r.confirmed_violation_type ?? r.user_violation_type!
    const isCorrect = predicted === actual

    // Per-type stats
    if (!byType[predicted]) {
      byType[predicted] = { total: 0, correct: 0, misclass: {} }
    }
    byType[predicted].total++
    if (isCorrect) {
      byType[predicted].correct++
      totalCorrect++
    } else {
      byType[predicted].misclass[actual] = (byType[predicted].misclass[actual] ?? 0) + 1
    }

    // Confidence calibration
    if (r.ai_confidence_score !== null) {
      const range = getConfidenceRange(r.ai_confidence_score)
      calibration[range].total++
      if (isCorrect) calibration[range].correct++
    }

    // Confusion matrix
    if (!confusionMatrix[predicted]) confusionMatrix[predicted] = {}
    confusionMatrix[predicted][actual] = (confusionMatrix[predicted][actual] ?? 0) + 1
  }

  // Build by_violation_type response
  const byViolationType: Record<string, { accuracy: number; total: number; correct: number; common_misclass: string | null }> = {}
  for (const [type, stats] of Object.entries(byType)) {
    const commonMisclass = Object.entries(stats.misclass).sort((a, b) => b[1] - a[1])[0]
    byViolationType[type] = {
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 1000) / 10 : 0,
      total: stats.total,
      correct: stats.correct,
      common_misclass: commonMisclass ? commonMisclass[0] : null,
    }
  }

  // Build confidence calibration response
  const confidenceCalibration = (Object.entries(calibration) as [ConfidenceRange, { correct: number; total: number }][])
    .map(([range, data]) => ({
      range,
      accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 1000) / 10 : 0,
      count: data.total,
    }))

  // Top errors
  const errorPairs: { predicted: string; actual: string; count: number }[] = []
  for (const [predicted, actuals] of Object.entries(confusionMatrix)) {
    for (const [actual, count] of Object.entries(actuals)) {
      if (predicted !== actual) {
        errorPairs.push({ predicted, actual, count })
      }
    }
  }
  errorPairs.sort((a, b) => b.count - a.count)
  const topErrors = errorPairs.slice(0, 5)

  const overallAccuracy = confirmed.length > 0
    ? Math.round((totalCorrect / confirmed.length) * 1000) / 10
    : 0

  return NextResponse.json({
    overall_accuracy: overallAccuracy,
    total_analyzed: reports.length,
    total_confirmed: confirmed.length,
    by_violation_type: byViolationType,
    confidence_calibration: confidenceCalibration,
    top_errors: topErrors,
    period: periodParam,
  })
}
