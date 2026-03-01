// 신고서 드래프트 생성 프롬프트 — Sonnet 전용

import type { AiAnalyzeResponse } from '@/types/api'
import type { Listing } from '@/types/listings'

const DRAFT_PROMPT_TEMPLATE = `Generate a formal violation report draft for Amazon Seller Central based on the analysis below.

## Analysis Result
{{analysisResult}}

## Listing Information
- ASIN: {{asin}}
- Title: {{title}}
- Seller: {{seller}}
- URL: https://www.amazon.com/dp/{{asin}}

{{TEMPLATE_SECTION}}

## Draft Guidelines
1. Use professional, formal English
2. Be specific — cite exact text/images that violate policy
3. Include Amazon policy references
4. Keep the title concise (under 100 chars)
5. Structure the body with clear sections:
   - Violation Summary
   - Evidence Description
   - Policy Reference
   - Requested Action

## Response Format (JSON only)
{
  "draft_title": "Trademark Infringement - [ASIN] - Unauthorized Spigen Branding",
  "draft_body": "Dear Amazon Seller Support,\n\nWe are writing to report...",
  "draft_evidence": [
    {
      "type": "screenshot",
      "url": "",
      "description": "Listing title contains unauthorized Spigen trademark"
    }
  ],
  "draft_policy_references": [
    {
      "code": "Amazon Anti-Counterfeiting Policy",
      "url": "https://sellercentral.amazon.com/help/hub/reference/G201165970",
      "section": "Intellectual Property Violations"
    }
  ]
}`

const buildDraftPrompt = (
  analysis: AiAnalyzeResponse,
  listing: Listing,
  template: string | null,
): string => {
  const analysisStr = JSON.stringify(analysis, null, 2)

  const templateSection = template
    ? `## Reference Template\n${template}`
    : ''

  return DRAFT_PROMPT_TEMPLATE
    .replace('{{analysisResult}}', analysisStr)
    .replace('{{asin}}', listing.asin)
    .replace('{{title}}', listing.title ?? '(unknown)')
    .replace('{{seller}}', listing.seller_name ?? '(unknown)')
    .replace('{{TEMPLATE_SECTION}}', templateSection)
}

export { buildDraftPrompt }
