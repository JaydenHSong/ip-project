// BR Template Excel/CSV parser
// Supports two formats:
//   1. Original Spigen xlsx: multi-sheet, headers [코드, Title, 템플릿, (빈), Instruction]
//      - Sheet name = category, br_form_type extracted from Instruction
//   2. Generic format: single-sheet with columns [code, category, title, body, br_form_type, ...]

import * as XLSX from 'xlsx'

type ParsedBrTemplate = {
  code: string
  category: string
  title: string
  body: string
  br_form_type: string
  instruction: string | null
  violation_codes: string[]
  placeholders: string[]
}

type ParseResult = {
  templates: ParsedBrTemplate[]
  errors: string[]
}

// Spigen xlsx의 Instruction 필드에서 BR form type 추출
// 예: "브랜드레지스트리 > Report a store policy violation > Other Policy Violation"
// 유효한 br_form_type: 'other_policy' | 'incorrect_variation' | 'product_review'
const extractBrFormType = (instruction: string | null | undefined): string => {
  if (!instruction) return 'other_policy'

  const lower = instruction.toLowerCase()

  if (lower.includes('incorrect variation')) return 'incorrect_variation'
  if (lower.includes('product review violation')) return 'product_review'
  if (lower.includes('product review')) return 'product_review'

  return 'other_policy'
}

// 템플릿 body에서 [bracket] 플레이스홀더 추출
const extractPlaceholders = (body: string): string[] => {
  const matches = body.match(/\[([^\]]+)\]/g)
  if (!matches) return []
  // 중복 제거
  return [...new Set(matches.map((m) => m.slice(1, -1).trim()))].filter(Boolean)
}

const parseDelimited = (value: string | undefined): string[] => {
  if (!value) return []
  return value
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

const normalizeHeader = (header: string): string =>
  header.toLowerCase().replace(/\s+/g, '_').trim()

// Spigen 원본 형식인지 감지 (헤더에 '코드' 또는 '템플릿' 포함)
const isSpigenFormat = (headers: string[]): boolean => {
  const joined = headers.join(',').toLowerCase()
  return joined.includes('코드') || joined.includes('템플릿')
}

// Format 1: Spigen 원본 xlsx (multi-sheet)
const parseSpigenFormat = (workbook: XLSX.WorkBook): ParseResult => {
  const errors: string[] = []
  const templates: ParsedBrTemplate[] = []

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      raw: false,
      defval: '',
    })

    if (rows.length < 2) {
      errors.push(`Sheet "${sheetName}": no data rows`)
      continue
    }

    // 첫 행은 헤더 — 스킵
    const category = sheetName.trim()

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || !row.some((cell) => cell && String(cell).trim())) continue

      const code = String(row[0] ?? '').trim()
      const title = String(row[1] ?? '').trim()
      const body = String(row[2] ?? '').trim()
      // row[3] 은 빈 열
      const instruction = String(row[4] ?? '').trim() || null

      if (!code || !title || !body) {
        errors.push(`Sheet "${sheetName}" row ${i + 1}: missing code, title, or body`)
        continue
      }

      templates.push({
        code,
        category,
        title,
        body,
        br_form_type: extractBrFormType(instruction),
        instruction,
        violation_codes: [],
        placeholders: extractPlaceholders(body),
      })
    }
  }

  return { templates, errors }
}

// Format 2: Generic format (single-sheet with named columns)
const parseGenericFormat = (workbook: XLSX.WorkBook): ParseResult => {
  const errors: string[] = []
  const templates: ParsedBrTemplate[] = []

  const REQUIRED_COLUMNS = ['code', 'category', 'title', 'body', 'br_form_type'] as const

  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return { templates: [], errors: ['No sheets found in the file'] }
  }

  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    raw: false,
    defval: '',
  })

  if (rows.length === 0) {
    return { templates: [], errors: ['No data rows found in the file'] }
  }

  const normalizedRows = rows.map((row) => {
    const normalized: Record<string, string> = {}
    for (const [key, value] of Object.entries(row)) {
      normalized[normalizeHeader(key)] = String(value ?? '').trim()
    }
    return normalized
  })

  const firstRow = normalizedRows[0]
  const missingCols = REQUIRED_COLUMNS.filter((col) => !(col in firstRow))
  if (missingCols.length > 0) {
    return {
      templates: [],
      errors: [`Missing required columns: ${missingCols.join(', ')}. Found: ${Object.keys(firstRow).join(', ')}`],
    }
  }

  for (let i = 0; i < normalizedRows.length; i++) {
    const row = normalizedRows[i]
    const rowNum = i + 2

    if (!row.code && !row.title && !row.body) continue

    const missing = REQUIRED_COLUMNS.filter((col) => !row[col])
    if (missing.length > 0) {
      errors.push(`Row ${rowNum}: missing required fields: ${missing.join(', ')}`)
      continue
    }

    templates.push({
      code: row.code,
      category: row.category,
      title: row.title,
      body: row.body,
      br_form_type: row.br_form_type,
      instruction: row.instruction || null,
      violation_codes: parseDelimited(row.violation_codes),
      placeholders: parseDelimited(row.placeholders),
    })
  }

  return { templates, errors }
}

const parseBuffer = (buffer: Buffer | ArrayBuffer, filename: string): ParseResult => {
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(buffer, { type: 'buffer' })
  } catch {
    return { templates: [], errors: [`Failed to parse file: ${filename}`] }
  }

  if (workbook.SheetNames.length === 0) {
    return { templates: [], errors: ['No sheets found in the file'] }
  }

  // 형식 자동 감지: 첫 시트의 첫 행 헤더 확인
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  const firstRow = XLSX.utils.sheet_to_json<string[]>(firstSheet, {
    header: 1,
    raw: false,
  })[0] ?? []

  const headers = firstRow.map((h) => String(h ?? ''))

  if (isSpigenFormat(headers)) {
    return parseSpigenFormat(workbook)
  }

  return parseGenericFormat(workbook)
}

export { parseBuffer }
export type { ParsedBrTemplate, ParseResult }
