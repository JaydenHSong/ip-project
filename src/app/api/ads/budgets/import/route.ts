// POST /api/ads/budgets/import — Excel/CSV budget import (S13)
// Design Ref: §4.2

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { saveBudgets } from '@/modules/ads/features/budget-planning/queries'
import type { BudgetEntry } from '@/modules/ads/features/budget-planning/types'
import type { Channel } from '@/modules/ads/shared/types'

const VALID_CHANNELS = new Set(['sp', 'sb', 'sd'])

export const POST = withAuth(async (req, { user }) => {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const brandMarketId = formData.get('brand_market_id') as string | null
    const year = formData.get('year') as string | null

    if (!file || !brandMarketId || !year) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'file, brand_market_id, and year are required' } },
        { status: 400 },
      )
    }

    // Parse CSV
    const text = await file.text()
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

    const entries: BudgetEntry[] = []
    const errors: { row: number; message: string }[] = []
    const skipped = 0

    // Skip header if present
    const startRow = lines[0]?.toLowerCase().includes('channel') ? 1 : 0

    for (let i = startRow; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim())
      if (cols.length < 3) {
        errors.push({ row: i + 1, message: 'Expected 3 columns: channel, month, amount' })
        continue
      }

      const channel = cols[0].toLowerCase()
      const month = parseInt(cols[1], 10)
      const amount = parseFloat(cols[2])

      if (!VALID_CHANNELS.has(channel)) {
        errors.push({ row: i + 1, message: `Invalid channel: ${cols[0]}` })
        continue
      }
      if (isNaN(month) || month < 1 || month > 12) {
        errors.push({ row: i + 1, message: `Invalid month: ${cols[1]}` })
        continue
      }
      if (isNaN(amount) || amount < 0) {
        errors.push({ row: i + 1, message: `Invalid amount: ${cols[2]}` })
        continue
      }

      entries.push({ channel: channel as Channel, month, amount })
    }

    if (entries.length > 0) {
      await saveBudgets(brandMarketId, Number(year), entries, user.id)
    }

    return NextResponse.json({
      data: {
        imported_count: entries.length,
        skipped_count: skipped,
        errors,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'IMPORT_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['admin', 'owner'])
