// 신고서 드래프트 생성 프롬프트 — Sonnet 전용

import type { AiAnalyzeResponse } from '@/types/api'
import type { Listing } from '@/types/listings'
import { promptManager } from '@/lib/ai/prompt-manager'

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
1. Be CONCISE — keep the entire draft_body under 200 words. Amazon reviewers prefer short, direct reports.
2. Use professional, formal English. No filler phrases or unnecessary context.
3. Cite only the most critical evidence — 1-2 specific examples, not exhaustive lists.
4. Keep the title concise (under 80 chars): "[Violation Type] - [ASIN]"
5. Structure the body as a single brief message:
   - 1 sentence: what the violation is
   - 1-2 sentences: key evidence (exact text/image reference)
   - 1 sentence: policy reference
   - 1 sentence: requested action
6. Do NOT include greetings like "Dear Amazon Seller Support" or closing pleasantries.
7. Go straight to the point — state the violation, evidence, and request.

## Response Format (JSON only)
{
  "draft_title": "Trademark Infringement - [ASIN]",
  "draft_body": "ASIN [ASIN] by seller [name] uses unauthorized Spigen branding in the title and images...",
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

const buildDraftPrompt = async (
  analysis: AiAnalyzeResponse,
  listing: Listing,
  template: string | null,
): Promise<string> => {
  const analysisStr = JSON.stringify(analysis, null, 2)

  const templateSection = template
    ? `## Reference Template\n${template}`
    : ''

  const dbPrompt = await promptManager.getActive('draft')
  const promptTemplate = dbPrompt?.content ?? DRAFT_PROMPT_TEMPLATE

  return promptTemplate
    .replace('{{analysisResult}}', analysisStr)
    .replace('{{asin}}', listing.asin)
    .replace('{{title}}', listing.title ?? '(unknown)')
    .replace('{{seller}}', listing.seller_name ?? '(unknown)')
    .replace('{{TEMPLATE_SECTION}}', templateSection)
}

export { buildDraftPrompt }
