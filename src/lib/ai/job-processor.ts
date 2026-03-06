// AI 분석 파이프라인 오케스트레이터
// 리스팅 도착 → 스크린샷 검증 → 의심 필터 → AI 분석 → 드래프트 생성

import type { AiAnalysisJobResult } from '@/types/ai'
import type { Listing } from '@/types/listings'
import type { Patent } from '@/types/patents'
import type { ClaudeClient } from '@/types/ai'
import { verifyScreenshot } from './verify-screenshot'
import { checkSuspectListing } from './suspect-filter'
import { analyzeListingViolation } from './analyze'
import { generateDraft } from './draft'
import { checkPatentSimilarity } from './patent-similarity'
import { loadRelevantSkills } from './skills/loader'
import { notifyDraftReady } from '@/lib/notifications/google-chat'

type ProcessDependencies = {
  client: ClaudeClient
  listing: Listing
  trademarks: string[]
  patents: Patent[]
  template: string | null
  screenshotUrl: string | null
  supabaseInsertReport: (data: Record<string, unknown>) => Promise<string>
  supabaseInsertReportPatent: (data: Record<string, unknown>) => Promise<void>
}

const processAiAnalysis = async (
  deps: ProcessDependencies,
): Promise<AiAnalysisJobResult> => {
  const startTime = Date.now()
  const { client, listing } = deps

  const result: AiAnalysisJobResult = {
    listingId: listing.id,
    reportId: null,
    violationDetected: false,
    screenshotVerification: null,
    analysisResult: null,
    draftGenerated: false,
    duration: 0,
  }

  // [Step 0] 스크린샷 검증 (있으면)
  if (deps.screenshotUrl) {
    try {
      const verification = await verifyScreenshot(client, deps.screenshotUrl, {
        title: listing.title ?? '',
        price: listing.price_amount ? `${listing.price_currency ?? '$'}${listing.price_amount}` : '',
        seller: listing.seller_name ?? '',
        rating: listing.rating ? String(listing.rating) : null,
      })

      result.screenshotVerification = verification

      // 불일치 시 보정 (corrections 있으면)
      // 실제 DB 업데이트는 API 라우트에서 처리
    } catch {
      // 스크린샷 검증 실패해도 계속 진행
    }
  }

  // [Step 1] 의심 필터
  const suspectCheck = checkSuspectListing({
    title: listing.title ?? '',
    description: listing.description ?? '',
    bullet_points: listing.bullet_points,
    seller_name: listing.seller_name ?? '',
    brand: listing.brand ?? '',
  })

  if (!suspectCheck.isSuspect) {
    result.duration = Date.now() - startTime
    return result // AI 미호출, 비용 절약
  }

  // [Step 2] Skill 로드
  const skillContent = await loadRelevantSkills(suspectCheck.reasons)

  // [Step 2.5] 스크린샷 이미지 준비 (있으면 다운로드해서 base64 변환)
  let analysisImages: { base64: string; mediaType: string }[] | undefined
  if (deps.screenshotUrl) {
    try {
      const imgResponse = await fetch(deps.screenshotUrl)
      if (imgResponse.ok) {
        const buffer = Buffer.from(await imgResponse.arrayBuffer())
        const contentType = imgResponse.headers.get('content-type') ?? 'image/jpeg'
        const mediaType = contentType.startsWith('image/') ? contentType : 'image/jpeg'
        analysisImages = [{
          base64: buffer.toString('base64'),
          mediaType,
        }]
      }
    } catch {
      // 이미지 다운로드 실패해도 텍스트만으로 분석 계속
    }
  }

  // [Step 3] AI 위반 분석 (Sonnet) — 스크린샷 포함 멀티모달
  const analysisResult = await analyzeListingViolation(client, listing, {
    skillContent,
    trademarks: deps.trademarks,
    patents: deps.patents,
    images: analysisImages,
  })

  result.analysisResult = {
    violation_detected: analysisResult.violation_detected,
    confidence: analysisResult.violations[0]?.confidence ?? 0,
    reasons: analysisResult.violations.flatMap(v => v.reasons),
    evidence: analysisResult.violations.flatMap(v =>
      v.evidence.map(e => ({
        type: e.type as 'text' | 'image' | 'keyword',
        location: e.url ?? '',
        description: e.description,
      })),
    ),
  }

  if (!analysisResult.violation_detected) {
    result.duration = Date.now() - startTime
    return result
  }

  result.violationDetected = true

  // [Step 4] 드래프트 생성 (Sonnet)
  const draft = await generateDraft(client, analysisResult, listing, {
    skillContent,
    trademarks: deps.trademarks,
    template: deps.template,
  })

  // [Step 5] reports INSERT
  const primaryViolation = analysisResult.violations[0]
  const reportData: Record<string, unknown> = {
    listing_id: listing.id,
    status: 'draft',
    ai_violation_type: primaryViolation.type,
    ai_analysis: result.analysisResult,
    ai_severity: primaryViolation.severity,
    ai_confidence_score: primaryViolation.confidence,
    draft_title: draft.draft_title,
    draft_body: draft.draft_body,
    draft_evidence: draft.draft_evidence,
    draft_policy_references: draft.draft_policy_references,
    original_draft_body: draft.draft_body,
    user_violation_type: listing.source === 'extension'
      ? primaryViolation.type // Extension은 이미 사용자 지정 가능
      : primaryViolation.type,
    created_by: 'system',
  }

  const reportId = await deps.supabaseInsertReport(reportData)
  result.reportId = reportId
  result.draftGenerated = true

  // [Step 6] 특허 유사도 체크 (V03 관련)
  if (deps.patents.length > 0) {
    try {
      const patentResults = await checkPatentSimilarity(client, listing, deps.patents)

      for (const pr of patentResults) {
        if (pr.similarityScore >= 30) {
          await deps.supabaseInsertReportPatent({
            report_id: reportId,
            patent_id: pr.patentId,
            similarity_score: pr.similarityScore,
            ai_reasoning: pr.reasoning,
          })
        }
      }
    } catch {
      // 특허 체크 실패해도 계속 진행
    }
  }

  // [Step 7] Google Chat 알림
  try {
    await notifyDraftReady(reportId, listing.asin, primaryViolation.type)
  } catch {
    // 알림 실패는 무시
  }

  result.duration = Date.now() - startTime
  return result
}

export { processAiAnalysis }
