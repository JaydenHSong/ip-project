// Monday.com 특허 데이터 동기화
// GraphQL API → patents 테이블 upsert (단방향)

import type { MondaySyncResult } from '@/types/ai'

type MondayColumnValue = {
  id: string
  text: string
  value: string | null
}

type MondayItem = {
  id: string
  name: string
  column_values: MondayColumnValue[]
}

type MondayResponse = {
  data: {
    boards: {
      items_page: {
        items: MondayItem[]
      }
    }[]
  }
}

// Monday.com 컬럼 ID → 필드 매핑 (보드 구조에 따라 조정 필요)
const COLUMN_MAP = {
  patent_number: 'text', // 특허번호 컬럼 ID
  country: 'text0',      // 국가 컬럼 ID
  status: 'status',      // 상태 컬럼 ID
  expiry_date: 'date',   // 만료일 컬럼 ID
  keywords: 'long_text', // 키워드 컬럼 ID
} as const

const getColumnValue = (item: MondayItem, columnId: string): string => {
  const col = item.column_values.find(c => c.id === columnId)
  return col?.text ?? ''
}

const parseKeywords = (raw: string): string[] => {
  if (!raw) return []
  return raw.split(',').map(k => k.trim()).filter(Boolean)
}

const fetchMondayPatents = async (
  apiKey: string,
  boardId: string,
): Promise<MondayItem[]> => {
  const query = `
    query ($boardId: [ID!]) {
      boards(ids: $boardId) {
        items_page(limit: 500) {
          items {
            id
            name
            column_values {
              id
              text
              value
            }
          }
        }
      }
    }
  `

  const response = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey,
      'API-Version': '2024-01',
    },
    body: JSON.stringify({
      query,
      variables: { boardId: [boardId] },
    }),
  })

  if (!response.ok) {
    throw new Error(`Monday.com API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json() as MondayResponse
  return data.data.boards[0]?.items_page.items ?? []
}

// 특허 데이터를 Supabase patents 테이블에 upsert
const syncToDatabase = async (
  items: MondayItem[],
  supabaseUrl: string,
  supabaseKey: string,
): Promise<MondaySyncResult> => {
  const result: MondaySyncResult = {
    total: items.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    errors: [],
    syncedAt: new Date().toISOString(),
  }

  for (const item of items) {
    try {
      const patentData = {
        monday_item_id: item.id,
        patent_name: item.name,
        patent_number: getColumnValue(item, COLUMN_MAP.patent_number),
        country: getColumnValue(item, COLUMN_MAP.country) || 'US',
        status: getColumnValue(item, COLUMN_MAP.status).toLowerCase() || 'active',
        expiry_date: getColumnValue(item, COLUMN_MAP.expiry_date) || null,
        keywords: parseKeywords(getColumnValue(item, COLUMN_MAP.keywords)),
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Supabase REST API를 통한 upsert
      const upsertResponse = await fetch(`${supabaseUrl}/rest/v1/patents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify(patentData),
      })

      if (upsertResponse.ok) {
        const status = upsertResponse.status
        if (status === 201) {
          result.created++
        } else {
          result.updated++
        }
      } else {
        result.errors.push({
          itemId: item.id,
          error: `HTTP ${upsertResponse.status}`,
        })
      }
    } catch (error: unknown) {
      result.errors.push({
        itemId: item.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  result.unchanged = result.total - result.created - result.updated - result.errors.length

  return result
}

const runMondaySync = async (): Promise<MondaySyncResult> => {
  const apiKey = process.env.MONDAY_API_KEY
  const boardId = process.env.MONDAY_BOARD_ID
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!apiKey || !boardId) {
    return {
      total: 0,
      created: 0,
      updated: 0,
      unchanged: 0,
      errors: [{ itemId: '', error: 'MONDAY_API_KEY or MONDAY_BOARD_ID not configured' }],
      syncedAt: new Date().toISOString(),
    }
  }

  if (!supabaseUrl || !supabaseKey) {
    return {
      total: 0,
      created: 0,
      updated: 0,
      unchanged: 0,
      errors: [{ itemId: '', error: 'Supabase credentials not configured' }],
      syncedAt: new Date().toISOString(),
    }
  }

  const items = await fetchMondayPatents(apiKey, boardId)
  return syncToDatabase(items, supabaseUrl, supabaseKey)
}

export { runMondaySync, fetchMondayPatents }
