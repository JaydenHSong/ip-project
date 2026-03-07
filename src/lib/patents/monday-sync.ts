// Monday.com IP 자산 멀티보드 동기화
// GraphQL API → ip_assets 테이블 upsert (단방향, Monday = SSOT)

import { createAdminClient } from '@/lib/supabase/admin'
import { ALL_BOARDS, type BoardConfig } from './board-config'
import type { IpAssetStatus } from '@/types/ip-assets'
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

type MondayItemsPage = {
  cursor: string | null
  items: MondayItem[]
}

type MondayResponse = {
  data?: {
    boards: {
      items_page: MondayItemsPage
    }[]
  }
  errors?: { message: string }[]
}

const MONDAY_API_URL = 'https://api.monday.com/v2'
const PAGE_LIMIT = 500

const getColumnValue = (item: MondayItem, columnId: string | null): string => {
  if (!columnId) return ''
  const col = item.column_values.find((c) => c.id === columnId)
  return col?.text ?? ''
}

const parseDateValue = (raw: string): string | null => {
  if (!raw) return null
  // Monday.com date format: "YYYY-MM-DD" or sometimes with time
  const match = raw.match(/\d{4}-\d{2}-\d{2}/)
  return match ? match[0] : null
}

const fetchBoardItems = async (
  apiKey: string,
  boardId: string,
): Promise<MondayItem[]> => {
  const allItems: MondayItem[] = []
  let cursor: string | null = null
  let isFirstPage = true

  while (isFirstPage || cursor) {
    isFirstPage = false

    const query = cursor
      ? `query ($boardId: [ID!], $cursor: String!) {
          boards(ids: $boardId) {
            items_page(limit: ${PAGE_LIMIT}, cursor: $cursor) {
              cursor
              items { id name column_values { id text value } }
            }
          }
        }`
      : `query ($boardId: [ID!]) {
          boards(ids: $boardId) {
            items_page(limit: ${PAGE_LIMIT}) {
              cursor
              items { id name column_values { id text value } }
            }
          }
        }`

    const variables: Record<string, unknown> = { boardId: [boardId] }
    if (cursor) variables.cursor = cursor

    const response = await fetch(MONDAY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
        'API-Version': '2024-01',
      },
      body: JSON.stringify({ query, variables }),
    })

    if (!response.ok) {
      throw new Error(`Monday.com API error: ${response.status} ${response.statusText}`)
    }

    const data = (await response.json()) as MondayResponse

    if (data.errors?.length) {
      throw new Error(`Monday.com GraphQL error: ${data.errors[0].message}`)
    }

    const page = data.data?.boards[0]?.items_page
    if (!page) break

    allItems.push(...page.items)
    cursor = page.cursor
  }

  return allItems
}

const transformItem = (
  item: MondayItem,
  boardConfig: BoardConfig,
  boardId: string,
): Record<string, unknown> => {
  const cols = boardConfig.columns
  const rawStatus = getColumnValue(item, cols.status)
  const mappedStatus: IpAssetStatus = boardConfig.statusMap[rawStatus] ?? 'filed'

  return {
    ip_type: boardConfig.ipType,
    management_number: item.name.trim(),
    name: getColumnValue(item, cols.name) || item.name.trim(),
    description: getColumnValue(item, cols.description) || null,
    country: getColumnValue(item, cols.country) || (boardConfig.ipType === 'copyright' ? 'KR' : 'US'),
    status: mappedStatus,
    application_number: getColumnValue(item, cols.applicationNumber) || null,
    application_date: parseDateValue(getColumnValue(item, cols.applicationDate)),
    registration_number: getColumnValue(item, cols.registrationNumber) || null,
    registration_date: parseDateValue(getColumnValue(item, cols.registrationDate)),
    expiry_date: parseDateValue(getColumnValue(item, cols.expiryDate)),
    assignee: getColumnValue(item, cols.assignee) || null,
    notes: getColumnValue(item, cols.notes) || null,
    report_url: getColumnValue(item, cols.reportUrl) || null,
    monday_item_id: item.id,
    monday_board_id: boardId,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

const syncBoardToDatabase = async (
  apiKey: string,
  boardId: string,
  boardConfig: BoardConfig,
  result: MondaySyncResult,
): Promise<void> => {
  const items = await fetchBoardItems(apiKey, boardId)
  const supabase = createAdminClient()

  for (const item of items) {
    try {
      const row = transformItem(item, boardConfig, boardId)

      // monday_item_id 기준 기존 행 확인
      const { data: existing } = await supabase
        .from('ip_assets')
        .select('id, updated_at')
        .eq('monday_item_id', item.id)
        .single()

      if (existing) {
        // 업데이트
        const { error } = await supabase
          .from('ip_assets')
          .update(row)
          .eq('id', existing.id)

        if (error) {
          result.errors.push({ itemId: item.id, error: error.message })
        } else {
          result.updated++
        }
      } else {
        // 새로 생성
        const { data: inserted, error } = await supabase
          .from('ip_assets')
          .insert(row)
          .select('id')
          .single()

        if (error) {
          result.errors.push({ itemId: item.id, error: error.message })
        } else {
          result.created++
          if (inserted?.id) result.created_ids.push(inserted.id as string)
        }
      }
    } catch (error: unknown) {
      result.errors.push({
        itemId: item.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  result.total += items.length
}

const runMondaySync = async (): Promise<MondaySyncResult> => {
  const apiKey = process.env.MONDAY_API_KEY
  if (!apiKey) {
    return {
      total: 0,
      created: 0,
      created_ids: [],
      updated: 0,
      unchanged: 0,
      errors: [{ itemId: '', error: 'MONDAY_API_KEY not configured' }],
      syncedAt: new Date().toISOString(),
    }
  }

  const result: MondaySyncResult = {
    total: 0,
    created: 0,
    created_ids: [],
    updated: 0,
    unchanged: 0,
    errors: [],
    syncedAt: new Date().toISOString(),
  }

  for (const boardConfig of ALL_BOARDS) {
    const boardId = process.env[boardConfig.envKey]
    if (!boardId) {
      result.errors.push({
        itemId: '',
        error: `${boardConfig.envKey} not configured (${boardConfig.ipType} board skipped)`,
      })
      continue
    }

    try {
      await syncBoardToDatabase(apiKey, boardId, boardConfig, result)
    } catch (error: unknown) {
      result.errors.push({
        itemId: '',
        error: `${boardConfig.ipType} board sync failed: ${error instanceof Error ? error.message : 'Unknown'}`,
      })
    }
  }

  result.unchanged = result.total - result.created - result.updated - result.errors.length

  return result
}

export { runMondaySync, fetchBoardItems }
