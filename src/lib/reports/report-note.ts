type ReportNoteData = Record<string, unknown>

type ParsedReportNote = {
  contextText: string | null
  data: ReportNoteData | null
}

const parseObject = (value: string): ReportNoteData | null => {
  try {
    const parsed = JSON.parse(value) as unknown
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as ReportNoteData
    }
  } catch {
    // ignore parse failures
  }

  return null
}

const parseEmbeddedObject = (value: string): ReportNoteData | null => {
  const firstBrace = value.indexOf('{')
  const lastBrace = value.lastIndexOf('}')
  if (firstBrace < 0 || lastBrace <= firstBrace) return null

  const candidate = value.slice(firstBrace, lastBrace + 1)
  const directObject = parseObject(candidate)
  if (directObject) return directObject

  return parseObject(candidate.replace(/\\"/g, '"'))
}

const normalizeContextText = (value: string): string | null => {
  const trimmed = value.trim()
  if (!trimmed) return null

  const bracketOnly = trimmed.match(/^\[(.+)\]$/)
  return bracketOnly ? bracketOnly[1]?.trim() ?? null : trimmed
}

export const parseReportNote = (note: string | null | undefined): ParsedReportNote => {
  const trimmed = note?.trim()
  if (!trimmed) {
    return { contextText: null, data: null }
  }

  const wholeObject = parseObject(trimmed)
  if (wholeObject) {
    return { contextText: null, data: wholeObject }
  }

  const firstBrace = trimmed.indexOf('{')
  const candidateObject = parseEmbeddedObject(trimmed)
  if (candidateObject) {
    return {
      contextText: firstBrace > 0 ? normalizeContextText(trimmed.slice(0, firstBrace)) : null,
      data: candidateObject,
    }
  }

  return {
    contextText: normalizeContextText(trimmed),
    data: null,
  }
}
