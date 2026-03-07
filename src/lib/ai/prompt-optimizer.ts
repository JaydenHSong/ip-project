// Prompt Optimizer — 주간 자동 프롬프트 최적화
// Opus가 정확도 데이터를 분석하고 프롬프트를 개선

import { createClient } from '@/lib/supabase/server'
import { promptManager, type PromptType } from './prompt-manager'

const SAFETY_RULES = {
  MIN_SAMPLES: 50,
  ROLLBACK_THRESHOLD: -5,
  MAX_CHANGE_RATIO: 0.3,
  MAX_WEEKLY_UPDATES: 1,
} as const

type AccuracyData = {
  overall_accuracy: number
  total_confirmed: number
  by_violation_type: Record<string, {
    accuracy: number
    total: number
    correct: number
    common_misclass: string | null
  }>
  top_errors: { predicted: string; actual: string; count: number }[]
  confusion_matrix: Record<string, Record<string, number>>
}

type OptimizerResult = {
  status: 'skipped' | 'optimized' | 'needs_approval' | 'error'
  message: string
  promptType?: PromptType
  newVersion?: number
  changes?: string[]
}

const computeAccuracy = async (days: number): Promise<AccuracyData | null> => {
  const supabase = await createClient()

  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('reports')
    .select('ai_violation_type, confirmed_violation_type, user_violation_type, ai_confidence_score')
    .not('ai_violation_type', 'is', null)
    .gte('created_at', since.toISOString())
    .neq('status', 'archived')

  if (error || !data) return null

  const confirmed = data.filter(
    (r: { confirmed_violation_type: string | null; user_violation_type: string | null }) =>
      r.confirmed_violation_type !== null || r.user_violation_type !== null
  )

  if (confirmed.length < SAFETY_RULES.MIN_SAMPLES) return null

  const byType: Record<string, { total: number; correct: number; misclass: Record<string, number> }> = {}
  const confusionMatrix: Record<string, Record<string, number>> = {}
  let totalCorrect = 0

  for (const r of confirmed) {
    const predicted = r.ai_violation_type as string
    const actual = (r.confirmed_violation_type ?? r.user_violation_type) as string
    const isCorrect = predicted === actual

    if (!byType[predicted]) byType[predicted] = { total: 0, correct: 0, misclass: {} }
    byType[predicted].total++
    if (isCorrect) {
      byType[predicted].correct++
      totalCorrect++
    } else {
      byType[predicted].misclass[actual] = (byType[predicted].misclass[actual] ?? 0) + 1
    }

    if (!confusionMatrix[predicted]) confusionMatrix[predicted] = {}
    confusionMatrix[predicted][actual] = (confusionMatrix[predicted][actual] ?? 0) + 1
  }

  const byViolationType: AccuracyData['by_violation_type'] = {}
  for (const [type, stats] of Object.entries(byType)) {
    const commonMisclass = Object.entries(stats.misclass).sort((a, b) => b[1] - a[1])[0]
    byViolationType[type] = {
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 1000) / 10 : 0,
      total: stats.total,
      correct: stats.correct,
      common_misclass: commonMisclass ? commonMisclass[0] : null,
    }
  }

  const errorPairs: AccuracyData['top_errors'] = []
  for (const [predicted, actuals] of Object.entries(confusionMatrix)) {
    for (const [actual, count] of Object.entries(actuals)) {
      if (predicted !== actual) errorPairs.push({ predicted, actual, count })
    }
  }
  errorPairs.sort((a, b) => b.count - a.count)

  return {
    overall_accuracy: confirmed.length > 0 ? Math.round((totalCorrect / confirmed.length) * 1000) / 10 : 0,
    total_confirmed: confirmed.length,
    by_violation_type: byViolationType,
    top_errors: errorPairs.slice(0, 10),
    confusion_matrix: confusionMatrix,
  }
}

const computeChangeDiff = (oldContent: string, newContent: string): number => {
  const oldLen = oldContent.length
  const newLen = newContent.length
  const maxLen = Math.max(oldLen, newLen)
  if (maxLen === 0) return 0

  // Simple character-level diff ratio
  let diffChars = Math.abs(oldLen - newLen)
  const minLen = Math.min(oldLen, newLen)
  for (let i = 0; i < minLen; i++) {
    if (oldContent[i] !== newContent[i]) diffChars++
  }
  return diffChars / maxLen
}

const optimizePrompt = async (promptType: PromptType): Promise<OptimizerResult> => {
  // 1. Check weekly update limit
  const supabase = await createClient()
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { count: recentUpdates } = await supabase
    .from('ai_prompts')
    .select('id', { count: 'exact', head: true })
    .eq('prompt_type', promptType)
    .eq('created_by', 'opus-auto')
    .gte('created_at', weekAgo.toISOString())

  if ((recentUpdates ?? 0) >= SAFETY_RULES.MAX_WEEKLY_UPDATES) {
    return { status: 'skipped', message: 'Weekly update limit reached' }
  }

  // 2. Get accuracy data
  const accuracy = await computeAccuracy(7)
  if (!accuracy) {
    return { status: 'skipped', message: `Insufficient samples (need ${SAFETY_RULES.MIN_SAMPLES})` }
  }

  // 3. Get current active prompt
  const current = await promptManager.getActive(promptType)
  if (!current) {
    return { status: 'skipped', message: 'No active prompt found' }
  }

  // 4. Call Opus for optimization
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const anthropic = new Anthropic()

  const optimizerPrompt = `You are the Prompt Optimizer for Sentinel AI.

## Current Prompt (version ${current.version}):
${current.content}

## Accuracy Report (last 7 days):
- Overall: ${accuracy.overall_accuracy}%
- Total confirmed: ${accuracy.total_confirmed}
- Confusion Matrix: ${JSON.stringify(accuracy.confusion_matrix, null, 2)}
- Top Errors: ${JSON.stringify(accuracy.top_errors, null, 2)}

## Per-Type Accuracy:
${Object.entries(accuracy.by_violation_type)
  .map(([type, s]) => `- ${type}: ${s.accuracy}% (${s.correct}/${s.total})${s.common_misclass ? ` — often confused with ${s.common_misclass}` : ''}`)
  .join('\n')}

## Task:
Analyze the error patterns and improve the prompt to reduce misclassifications.
Focus on the top error patterns first.
Keep the same template variables ({{...}}) and JSON output format — only improve instructions and guidelines.

Respond with ONLY a JSON object:
{
  "improved_prompt": "the full improved prompt text",
  "changes": ["change 1", "change 2"],
  "expected_improvement": "which error patterns this should fix"
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 8192,
      messages: [{ role: 'user', content: optimizerPrompt }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return { status: 'error', message: 'No text response from Opus' }
    }

    const result = JSON.parse(textBlock.text) as {
      improved_prompt: string
      changes: string[]
      expected_improvement: string
    }

    // 5. Safety check: diff size
    const changeRatio = computeChangeDiff(current.content, result.improved_prompt)
    if (changeRatio > SAFETY_RULES.MAX_CHANGE_RATIO) {
      // Save but don't activate — needs admin approval
      const { version } = await promptManager.save(promptType, result.improved_prompt, 'opus-auto', {
        changes: result.changes,
        expected_improvement: result.expected_improvement,
        change_ratio: changeRatio,
        accuracy_at_time: accuracy.overall_accuracy,
        needs_approval: true,
      })
      return {
        status: 'needs_approval',
        message: `Change too large (${Math.round(changeRatio * 100)}%). Saved as v${version}, awaiting admin approval.`,
        promptType,
        newVersion: version,
        changes: result.changes,
      }
    }

    // 6. Save and activate
    const { version } = await promptManager.save(promptType, result.improved_prompt, 'opus-auto', {
      changes: result.changes,
      expected_improvement: result.expected_improvement,
      change_ratio: changeRatio,
      accuracy_at_time: accuracy.overall_accuracy,
    })
    await promptManager.activate(promptType, version)

    // 7. Log accuracy snapshot
    const now = new Date()
    const periodStart = new Date(now)
    periodStart.setDate(periodStart.getDate() - 7)

    await supabase.from('ai_accuracy_logs').insert({
      period_start: periodStart.toISOString().split('T')[0],
      period_end: now.toISOString().split('T')[0],
      prompt_type: promptType,
      prompt_version: version,
      total_analyzed: accuracy.total_confirmed,
      total_confirmed: accuracy.total_confirmed,
      correct_count: Math.round(accuracy.total_confirmed * accuracy.overall_accuracy / 100),
      wrong_count: Math.round(accuracy.total_confirmed * (100 - accuracy.overall_accuracy) / 100),
      accuracy_pct: accuracy.overall_accuracy,
      confusion_matrix: accuracy.confusion_matrix,
      top_errors: accuracy.top_errors,
    })

    return {
      status: 'optimized',
      message: `Prompt optimized to v${version}. Changes: ${result.changes.join('; ')}`,
      promptType,
      newVersion: version,
      changes: result.changes,
    }
  } catch (e) {
    return {
      status: 'error',
      message: e instanceof Error ? e.message : 'Unknown error during optimization',
    }
  }
}

const checkAndRollback = async (promptType: PromptType): Promise<OptimizerResult> => {
  const accuracy = await computeAccuracy(7)
  if (!accuracy) {
    return { status: 'skipped', message: 'Insufficient data for rollback check' }
  }

  // Check previous accuracy log
  const supabase = await createClient()
  const { data: previousLog } = await supabase
    .from('ai_accuracy_logs')
    .select('accuracy_pct')
    .eq('prompt_type', promptType)
    .order('created_at', { ascending: false })
    .limit(2)

  if (!previousLog || previousLog.length < 2) {
    return { status: 'skipped', message: 'Not enough history for comparison' }
  }

  const currentAccuracy = accuracy.overall_accuracy
  const previousAccuracy = Number(previousLog[1].accuracy_pct)
  const delta = currentAccuracy - previousAccuracy

  if (delta < SAFETY_RULES.ROLLBACK_THRESHOLD) {
    const { version } = await promptManager.rollback(promptType)
    return {
      status: 'optimized',
      message: `Rolled back to v${version} due to accuracy drop (${delta.toFixed(1)}%p)`,
      promptType,
      newVersion: version,
    }
  }

  return { status: 'skipped', message: `Accuracy stable (delta: ${delta.toFixed(1)}%p)` }
}

export { optimizePrompt, checkAndRollback, computeAccuracy, SAFETY_RULES }
export type { OptimizerResult, AccuracyData }
