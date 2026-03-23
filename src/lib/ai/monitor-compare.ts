// 모니터링 스크린샷 비교 — Haiku Vision
// 이전 vs 현재 스크린샷을 비교하여 변화 감지 + 리마크 생성

import { MODEL_ROLES, type ClaudeClient } from '@/types/ai'
import type { SnapshotDiff, AiMarking } from '@/types/monitoring'

type MonitorCompareInput = {
  initialScreenshotUrl: string | null
  currentScreenshotUrl: string | null
  diff: SnapshotDiff
  violationType: string
}

type MonitorCompareResult = {
  remark: string
  marking_data: AiMarking[]
  resolution_suggestion: 'resolved' | 'unresolved' | 'continue'
  change_summary: string
}

const MONITOR_COMPARE_SYSTEM = `You are A.R.C. Monitor AI for Spigen brand protection.
Compare two Amazon listing screenshots: INITIAL (when violation was reported) vs CURRENT (latest check).

Determine:
1. Has the violation been addressed? (listing removed, content changed, seller removed)
2. What specific visual elements changed? (title, images, price, seller info, bullet points)
3. Are there any NEW violations introduced?

Respond ONLY in JSON format.`

const buildMonitorUserPrompt = (diff: SnapshotDiff, violationType: string): string => {
  const diffSummary = diff.listing_removed
    ? 'Listing completely removed from Amazon.'
    : diff.changes.length > 0
      ? diff.changes.map(c => `- ${c.field}: "${c.before}" → "${c.after}"`).join('\n')
      : 'No data-level changes detected.'

  return `## Context
Image 1 (first): INITIAL screenshot — when violation ${violationType} was first reported
Image 2 (second): CURRENT screenshot — latest monitoring check

## Known Data Changes
${diffSummary}

## Response Format (JSON only)
{
  "remark": "Detailed analysis of what changed visually between screenshots...",
  "marking_data": [
    { "x": 0, "y": 0, "width": 100, "height": 30, "label": "Changed area", "severity": "high" }
  ],
  "resolution_suggestion": "resolved|unresolved|continue",
  "change_summary": "Brief one-line summary"
}`
}

const fetchImageAsBase64 = async (url: string): Promise<{
  base64: string
  mediaType: string
} | null> => {
  try {
    const response = await fetch(url)
    if (!response.ok) return null

    const contentType = response.headers.get('content-type') ?? 'image/jpeg'
    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    return { base64, mediaType: contentType }
  } catch {
    return null
  }
}

const parseMonitorResponse = (raw: string): MonitorCompareResult => {
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return {
      remark: raw,
      marking_data: [],
      resolution_suggestion: 'continue',
      change_summary: 'Failed to parse AI response',
    }
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      remark?: string
      marking_data?: AiMarking[]
      resolution_suggestion?: string
      change_summary?: string
    }

    const suggestion = parsed.resolution_suggestion
    const validSuggestion = suggestion === 'resolved' || suggestion === 'unresolved' || suggestion === 'continue'
      ? suggestion
      : 'continue'

    return {
      remark: parsed.remark ?? '',
      marking_data: parsed.marking_data ?? [],
      resolution_suggestion: validSuggestion,
      change_summary: parsed.change_summary ?? '',
    }
  } catch {
    return {
      remark: raw,
      marking_data: [],
      resolution_suggestion: 'continue',
      change_summary: 'JSON parse error',
    }
  }
}

const fallbackDiffAnalysis = (diff: SnapshotDiff): MonitorCompareResult => {
  if (diff.listing_removed) {
    return {
      remark: 'The listing has been completely removed from Amazon. This indicates the violation report was effective and the seller or Amazon took action to remove the infringing product.',
      marking_data: [],
      resolution_suggestion: 'resolved',
      change_summary: 'Listing removed',
    }
  }

  if (diff.changes.length > 0) {
    const changedFields = diff.changes.map(c => c.field).join(', ')
    const markingData: AiMarking[] = diff.changes.map((change, i) => ({
      x: 50,
      y: 40 + i * 60,
      width: 400,
      height: 25,
      label: `${change.field}: changed`,
      severity: 'high' as const,
    }))

    return {
      remark: `Changes detected in the following fields: ${changedFields}. Review the changes to determine if the violation has been adequately addressed.`,
      marking_data: markingData,
      resolution_suggestion: 'resolved',
      change_summary: `Modified: ${changedFields}`,
    }
  }

  return {
    remark: 'No changes detected in the listing since the initial snapshot. The violation content remains unchanged. Continued monitoring is recommended.',
    marking_data: [],
    resolution_suggestion: 'continue',
    change_summary: 'No changes',
  }
}

const compareScreenshots = async (
  client: ClaudeClient,
  input: MonitorCompareInput,
): Promise<MonitorCompareResult> => {
  // 스크린샷 둘 다 없으면 기존 diff 로직 fallback
  if (!input.initialScreenshotUrl || !input.currentScreenshotUrl) {
    return fallbackDiffAnalysis(input.diff)
  }

  // 이미지 fetch → base64 변환
  const [initialImage, currentImage] = await Promise.all([
    fetchImageAsBase64(input.initialScreenshotUrl),
    fetchImageAsBase64(input.currentScreenshotUrl),
  ])

  // fetch 실패 시 fallback
  if (!initialImage || !currentImage) {
    return fallbackDiffAnalysis(input.diff)
  }

  // Haiku Vision 호출
  const response = await client.callWithImages({
    model: MODEL_ROLES.monitor,
    systemPrompt: MONITOR_COMPARE_SYSTEM,
    messages: [{
      role: 'user',
      content: buildMonitorUserPrompt(input.diff, input.violationType),
    }],
    maxTokens: 1024,
    temperature: 0.1,
    images: [initialImage, currentImage],
  })

  return parseMonitorResponse(response.content)
}

export { compareScreenshots, fallbackDiffAnalysis }
export type { MonitorCompareInput, MonitorCompareResult }
