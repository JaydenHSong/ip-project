// 톤/매너 제안 프롬프트 — v2: AI는 제안자 역할
// 기존 buildDraftPrompt는 레거시 호환용으로 유지

import type { AiAnalyzeResponse } from '@/types/api'
import type { Listing } from '@/types/listings'
import { promptManager } from '@/lib/ai/prompt-manager'
import { fetchBrTemplateExamples } from '@/lib/ai/prompts/br-template-examples'

// === v2: Tone Suggest Prompt ===

const TONE_SUGGEST_TEMPLATE = `Refine the tone and manner of this Amazon Brand Registry violation report text.
Do NOT rewrite — only improve word choice, grammar, and professional tone.

## Original Template Text
{{templateText}}

## Listing Context
- ASIN: {{asin}}
- Title: {{title}}
- Seller: {{seller}}
- BR Form Type: {{brFormType}}

## Format Rules (CRITICAL)
1. Preserve ALL line breaks from the original exactly as they are
2. Preserve ALL spacing and indentation
3. Preserve ALL paragraph structure and blank lines
4. Do NOT modify bracket variables: [ASIN], [SELLER], [BRAND], [TITLE], or any [VARIABLE] format
5. Do NOT add or remove lines — output must have the SAME number of lines as input
6. Only modify: word choice, tone, grammar, phrasing clarity
7. Keep a professional, assertive tone suitable for Amazon Brand Registry submissions

## What to Improve
- Fix grammar and spelling errors
- Make phrasing more professional and direct
- Strengthen evidence language where appropriate
- Ensure policy references are clear and specific
- Remove filler words or redundant phrases

## Response Format (JSON only)
{
  "suggested_text": "The refined text preserving exact same formatting...",
  "changes": [
    { "original": "phrase before", "suggested": "phrase after", "reason": "brief reason" }
  ]
}`

const buildToneSuggestPrompt = async (
  templateText: string,
  listing: { asin: string; title?: string | null; seller_name?: string | null },
  brFormType: string,
): Promise<string> => {
  const dbPrompt = await promptManager.getActive('tone-suggest')
  const template = dbPrompt?.content ?? TONE_SUGGEST_TEMPLATE

  return template
    .replace('{{templateText}}', templateText)
    .replace('{{asin}}', listing.asin)
    .replace('{{title}}', listing.title ?? '(unknown)')
    .replace('{{seller}}', listing.seller_name ?? '(unknown)')
    .replace('{{brFormType}}', brFormType)
}

// === Legacy: Draft Prompt (v1 호환) ===

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
  brFormContext: string | null = null,
): Promise<string> => {
  const analysisStr = JSON.stringify(analysis, null, 2)

  const templateSection = template
    ? `## Reference Template\n${template}`
    : ''

  // Fetch matching BR templates as few-shot examples
  const violationCodes = (analysis.violations ?? []).map((v) => v.type).filter(Boolean)
  const brExamples = await fetchBrTemplateExamples(violationCodes)

  const dbPrompt = await promptManager.getActive('tone-suggest')
  const promptTemplate = dbPrompt?.content ?? DRAFT_PROMPT_TEMPLATE

  let prompt = promptTemplate
    .replace('{{analysisResult}}', analysisStr)
    .replace('{{asin}}', listing.asin)
    .replace('{{title}}', listing.title ?? '(unknown)')
    .replace('{{seller}}', listing.seller_name ?? '(unknown)')
    .replace('{{TEMPLATE_SECTION}}', templateSection)

  // Inject BR template examples before Draft Guidelines
  const injectBefore = '## Draft Guidelines'
  const injections = [brExamples, brFormContext].filter(Boolean).join('\n\n')
  if (injections) {
    prompt = prompt.replace(injectBefore, `${injections}\n\n${injectBefore}`)
  }

  return prompt
}

export { buildDraftPrompt, buildToneSuggestPrompt }
