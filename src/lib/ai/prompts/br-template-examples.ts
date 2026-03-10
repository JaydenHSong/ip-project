// Fetches BR templates from DB and formats them as few-shot examples for the draft prompt

import { createClient } from '@/lib/supabase/server'

type BrTemplateRow = {
  code: string
  title: string
  body: string
  br_form_type: string
  instruction: string | null
  violation_codes: string[]
}

const MAX_EXAMPLES = 3

const fetchBrTemplateExamples = async (
  violationCodes: string[],
): Promise<string> => {
  if (violationCodes.length === 0) return ''

  try {
    const supabase = await createClient()

    // First: exact match on violation_codes overlap
    const { data: matched } = await supabase
      .from('br_templates')
      .select('code, title, body, br_form_type, instruction, violation_codes')
      .eq('active', true)
      .overlaps('violation_codes', violationCodes)
      .limit(MAX_EXAMPLES)

    let examples: BrTemplateRow[] = matched ?? []

    // Fill remaining slots with general templates if not enough matches
    if (examples.length < MAX_EXAMPLES) {
      const { data: general } = await supabase
        .from('br_templates')
        .select('code, title, body, br_form_type, instruction, violation_codes')
        .eq('active', true)
        .limit(MAX_EXAMPLES - examples.length)

      const existing = new Set(examples.map((e) => e.code))
      const extras = (general ?? []).filter((g) => !existing.has(g.code))
      examples = [...examples, ...extras]
    }

    if (examples.length === 0) return ''

    const formatted = examples
      .map((tmpl, idx) => {
        const lines = [
          `### Example ${idx + 1}: ${tmpl.title} [${tmpl.code}]`,
          `Form Type: ${tmpl.br_form_type}`,
          tmpl.instruction ? `Instruction: ${tmpl.instruction}` : null,
          `Body:`,
          tmpl.body,
        ]
          .filter(Boolean)
          .join('\n')
        return lines
      })
      .join('\n\n')

    return `## BR Template Examples (Few-Shot Reference)\nUse these approved templates as style and format references:\n\n${formatted}`
  } catch {
    return ''
  }
}

export { fetchBrTemplateExamples }
