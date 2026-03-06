/**
 * TASK-09: OMS Legacy Data Migration (27,086건 → ~27,000건 US/CA only)
 *
 * Usage:
 *   npx tsx scripts/migrate-legacy-reports.ts --dry-run   # 검증만
 *   npx tsx scripts/migrate-legacy-reports.ts              # 실제 실행
 *
 * Prerequisites:
 *   1. Supabase에서 017_legacy_migration_schema.sql 실행 완료
 *   2. .env.local에 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 설정
 */

import { createClient } from '@supabase/supabase-js'
import { parse } from 'csv-parse/sync'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ─── Config ───────────────────────────────────────────────
const SUPABASE_URL = process.env['SUPABASE_URL'] ?? process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? ''
const SUPABASE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
const DRY_RUN = process.argv.includes('--dry-run')
const BATCH_SIZE = 100
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001'
const CSV_PATH = resolve(__dirname, '../docs/archive/spg_amazon_violation_report.csv')

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── Types ────────────────────────────────────────────────
type CsvRow = {
  amazon_violation_report_id: string
  status: string
  asin_list: string
  violation_detail_name: string
  violation_detail_template: string
  violation_seller_name: string
  violation_listing_url: string
  violation_note: string
  violation_reporter_comment: string
  reported_history: string
  violation_case_acct_email: string
  reporter_cancelled_reason: string
  violation_images: string
  reporter_requested_at: string
  reporter_closed_at: string
  created_at: string
  updated_at: string
}

type AsinEntry = {
  value: string
  url: string
}

type FailedRow = {
  row_id: string
  reason: string
  asin: string
}

// ─── Violation Mapping ────────────────────────────────────
const VIOLATION_MAP: Record<string, string> = {
  // V10 - Variation Policy Violation
  'Size variation': 'V10',
  'Size variation 1': 'V10',
  'Size variation 2': 'V10',
  'Size variation 3 - dropdown': 'V10',
  'Size variation 4': 'V10',
  'Size variation / style variation': 'V10',
  'Style variation': 'V10',
  'Style variation 2': 'V10',
  'Color variation': 'V10',
  'Color variation - Different type of products': 'V10',
  'Color variation - Different number of packs': 'V10',
  'Color variation - Different material': 'V10',
  'Color variation - Different sizes of products': 'V10',
  'Color variation - different car model': 'V10',
  'Model variation': 'V10',
  'Different size Apple watch cases': 'V10',
  'Different size Apple watch cases - dropdown': 'V10',
  'Different number of packs': 'V10',
  'Different type of products': 'V10',
  'Different products': 'V10',
  'Different ASIN, same product (Same seller)': 'V10',
  'Reviews for different products': 'V10',

  // V08 - Image Policy Violation
  "Person's hand": 'V08',
  "Person's hand & non-pure white background": 'V08',
  'Non-pure white background': 'V08',
  'Non-product image & background': 'V08',
  'Mannequins & non-pure white background': 'V08',
  'Mannequins': 'V08',
  'Text': 'V08',
  'Text on the product': 'V08',
  'Text + Image': 'V08',
  'Props': 'V08',
  'Best Seller tagged #1': 'V08',
  'Multiple views of a single product': 'V08',
  'Multiple images of the same product': 'V08',
  'Zoomed image': 'V08',
  'Wearable- Main Image Contains Additional Product Images': 'V08',
  'promotional text': 'V08',
  'Graphics on the device': 'V08',
  'a doll popping out of the device': 'V08',
  'Prop-Car': 'V08',
  'Device combined': 'V08',

  // V07 - Inaccurate Product Info
  'Listing before device announcement': 'V07',
  'Wrong category': 'V07',
  'Incorrect title information': 'V07',

  // V11 - Review Manipulation
  'Review before announcement 2': 'V11',
  'Review before device announcement': 'V11',
  'Revised - Review before announcement': 'V11',
  'Review trade-1': 'V11',
  'Suspicious fake review': 'V11',
  'Compensation for reviews': 'V11',

  // V01 - Trademark Infringement
  'A product detail page is unlawfully using my trademark.': 'V01',
  'Others (ex: Samsung logo on the brand page)': 'V01',

  // V02 - Copyright Infringement
  'The image is used without authorization on the Product Detail Page': 'V02',
  'The physical product or its packaging includes unauthorized copyrighted content or images without being pirated': 'V02',

  // V05 - False Advertising
  'Spigen Beauty': 'V05',
}

const V_CODE_TO_CATEGORY: Record<string, string> = {
  V01: 'intellectual_property',
  V02: 'intellectual_property',
  V03: 'intellectual_property',
  V04: 'intellectual_property',
  V05: 'listing_content',
  V06: 'listing_content',
  V07: 'listing_content',
  V08: 'listing_content',
  V09: 'listing_content',
  V10: 'listing_content',
  V11: 'review_manipulation',
  V12: 'review_manipulation',
  V13: 'selling_practice',
  V14: 'selling_practice',
  V15: 'selling_practice',
  V16: 'regulatory_safety',
  V17: 'regulatory_safety',
  V18: 'regulatory_safety',
  V19: 'regulatory_safety',
}

const STATUS_MAP: Record<string, string> = {
  Closed: 'resolved',
  Submitted: 'submitted',
  Cancelled: 'cancelled',
  Requested: 'pending_review',
}

// ─── Helpers ──────────────────────────────────────────────
const extractMarketplace = (url: string): string | null => {
  if (url.includes('amazon.com.au')) return 'AU'
  if (url.includes('amazon.co.uk')) return 'UK'
  if (url.includes('amazon.co.jp')) return 'JP'
  if (url.includes('amazon.de')) return 'DE'
  if (url.includes('amazon.fr')) return 'FR'
  if (url.includes('amazon.it')) return 'IT'
  if (url.includes('amazon.es')) return 'ES'
  if (url.includes('amazon.ca')) return 'CA'
  if (url.includes('amazon.com')) return 'US'
  return null
}

const parseAsins = (asinListStr: string): AsinEntry[] => {
  try {
    const parsed = JSON.parse(asinListStr) as AsinEntry[]
    return Array.isArray(parsed) ? parsed.filter((a) => a.value && a.url) : []
  } catch {
    return []
  }
}

const parseScCaseId = (reportedHistory: string): string | null => {
  try {
    const history = JSON.parse(reportedHistory) as { case_id?: string }[]
    if (Array.isArray(history) && history.length > 0) {
      return history[0]?.case_id ?? null
    }
  } catch {
    // ignore
  }
  return null
}

const parseImages = (imagesStr: string): { type: string; url: string; description: string }[] => {
  try {
    const images = JSON.parse(imagesStr) as { name?: string; url?: string }[]
    if (Array.isArray(images)) {
      return images
        .filter((img) => img.url || img.name)
        .map((img, i) => ({
          type: 'image',
          url: img.url ?? '',
          description: img.name ?? `Evidence image ${i + 1}`,
        }))
    }
  } catch {
    // ignore
  }
  return []
}

const toTimestamp = (dateStr: string): string | null => {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

// ─── Main ─────────────────────────────────────────────────
const main = async (): Promise<void> => {
  console.log(`\n=== OMS Legacy Migration ${DRY_RUN ? '(DRY RUN)' : ''} ===\n`)

  // Read CSV
  const csvContent = readFileSync(CSV_PATH, 'utf-8')
  const rows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as CsvRow[]

  console.log(`Total CSV rows: ${rows.length}`)

  // Filter US/CA only
  const filteredRows: { row: CsvRow; asins: AsinEntry[]; marketplace: string }[] = []

  for (const row of rows) {
    const asins = parseAsins(row.asin_list)
    if (asins.length === 0) continue

    const mp = extractMarketplace(asins[0]!.url)
    if (mp !== 'US' && mp !== 'CA') continue

    filteredRows.push({ row, asins, marketplace: mp })
  }

  console.log(`Filtered (US/CA only): ${filteredRows.length}`)

  // Stats
  let listingsCreated = 0
  let listingsReused = 0
  let reportsCreated = 0
  let skipped = 0
  const failed: FailedRow[] = []
  const vCodeDist: Record<string, number> = {}
  const statusDist: Record<string, number> = {}

  // Process in batches
  for (let i = 0; i < filteredRows.length; i += BATCH_SIZE) {
    const batch = filteredRows.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(filteredRows.length / BATCH_SIZE)

    if (batchNum % 10 === 1 || batchNum === totalBatches) {
      console.log(`Processing batch ${batchNum}/${totalBatches} (${i}/${filteredRows.length})`)
    }

    for (const { row, asins, marketplace } of batch) {
      const vCode = VIOLATION_MAP[row.violation_detail_name] ?? 'V05'
      const category = V_CODE_TO_CATEGORY[vCode] ?? 'listing_content'
      const reportStatus = STATUS_MAP[row.status] ?? 'draft'
      const scCaseId = parseScCaseId(row.reported_history)
      const evidence = parseImages(row.violation_images)
      const createdAt = toTimestamp(row.reporter_requested_at) ?? toTimestamp(row.created_at) ?? new Date().toISOString()
      const updatedAt = toTimestamp(row.updated_at) ?? createdAt

      vCodeDist[vCode] = (vCodeDist[vCode] ?? 0) + 1
      statusDist[reportStatus] = (statusDist[reportStatus] ?? 0) + 1

      // First ASIN = main listing, rest = related_asins
      const mainAsin = asins[0]!.value.trim()
      const relatedAsins = asins.slice(1)
        .map((a) => ({ asin: a.value.trim(), marketplace, url: a.url }))
        .filter((a) => a.asin.length >= 5)

      if (!mainAsin || mainAsin.length < 5) {
        failed.push({ row_id: row.amazon_violation_report_id, reason: 'Invalid main ASIN', asin: mainAsin })
        continue
      }

      if (DRY_RUN) {
        listingsCreated++
        reportsCreated++
        continue
      }

      try {
        // Upsert listing for main ASIN
        let listingId: string | null = null

        const { data: existing } = await supabase
          .from('listings')
          .select('id')
          .eq('asin', mainAsin)
          .eq('marketplace', marketplace)
          .eq('source', 'OMS')
          .limit(1)
          .single()

        if (existing) {
          listingId = existing.id
          listingsReused++
        } else {
          const { data: newListing, error: listingError } = await supabase
            .from('listings')
            .insert({
              asin: mainAsin,
              marketplace,
              title: null,
              seller_name: row.violation_seller_name || null,
              source: 'OMS',
              source_campaign_id: null,
              source_user_id: SYSTEM_USER_ID,
              is_suspect: true,
              suspect_reasons: ['OMS legacy violation report'],
              crawled_at: createdAt,
              created_at: createdAt,
              updated_at: updatedAt,
            })
            .select('id')
            .single()

          if (listingError) {
            if (listingError.code === '23505') {
              const { data: found } = await supabase
                .from('listings')
                .select('id')
                .eq('asin', mainAsin)
                .eq('marketplace', marketplace)
                .limit(1)
                .single()

              if (found) {
                listingId = found.id
                listingsReused++
              } else {
                failed.push({ row_id: row.amazon_violation_report_id, reason: `Listing conflict but not found: ${listingError.message}`, asin: mainAsin })
                continue
              }
            } else {
              failed.push({ row_id: row.amazon_violation_report_id, reason: `Listing insert error: ${listingError.message}`, asin: mainAsin })
              continue
            }
          } else if (newListing) {
            listingId = newListing.id
            listingsCreated++
          }
        }

        if (!listingId) {
          failed.push({ row_id: row.amazon_violation_report_id, reason: 'No listing ID', asin: mainAsin })
          continue
        }

        // Create report with related_asins
        const reportData: Record<string, unknown> = {
          listing_id: listingId,
          user_violation_type: vCode,
          violation_category: category,
          status: reportStatus,
          source: 'OMS',
          related_asins: relatedAsins,
          draft_title: row.violation_detail_name || null,
          draft_body: row.violation_detail_template || null,
          draft_evidence: evidence,
          draft_policy_references: [],
          ai_analysis: {
            legacy: true,
            legacy_id: row.amazon_violation_report_id,
            legacy_note: row.violation_note || null,
            legacy_comment: row.violation_reporter_comment || null,
            legacy_history: row.reported_history || null,
            legacy_email: row.violation_case_acct_email || null,
          },
          sc_case_id: scCaseId,
          created_by: SYSTEM_USER_ID,
          created_at: createdAt,
          updated_at: updatedAt,
        }

        // Status-specific fields
        if (reportStatus === 'resolved') {
          reportData.resolved_at = toTimestamp(row.reporter_closed_at)
          reportData.sc_submitted_at = toTimestamp(row.reporter_requested_at)
          reportData.resolution_type = 'listing_removed'
        } else if (reportStatus === 'submitted') {
          reportData.sc_submitted_at = toTimestamp(row.reporter_requested_at)
        } else if (reportStatus === 'cancelled') {
          reportData.cancelled_by = SYSTEM_USER_ID
          reportData.cancelled_at = updatedAt
          reportData.cancellation_reason = row.reporter_cancelled_reason || 'Legacy cancellation'
        }

        const { error: reportError } = await supabase
          .from('reports')
          .insert(reportData)

        if (reportError) {
          failed.push({ row_id: row.amazon_violation_report_id, reason: `Report insert error: ${reportError.message}`, asin: mainAsin })
          continue
        }

        reportsCreated++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        failed.push({ row_id: row.amazon_violation_report_id, reason: msg, asin: mainAsin })
      }
    }
  }

  // Summary
  console.log('\n=== Migration Summary ===')
  console.log(`Listings created: ${listingsCreated}`)
  console.log(`Listings reused: ${listingsReused}`)
  console.log(`Reports created: ${reportsCreated}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Failed: ${failed.length}`)

  console.log('\n--- V-Code Distribution ---')
  for (const [code, count] of Object.entries(vCodeDist).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${code}: ${count}`)
  }

  console.log('\n--- Status Distribution ---')
  for (const [status, count] of Object.entries(statusDist).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${status}: ${count}`)
  }

  // Save failed rows
  if (failed.length > 0) {
    const failedPath = resolve(__dirname, '../docs/archive/migration-failed.json')
    writeFileSync(failedPath, JSON.stringify(failed, null, 2))
    console.log(`\nFailed rows saved to: ${failedPath}`)
  }

  console.log(`\n=== ${DRY_RUN ? 'DRY RUN COMPLETE' : 'MIGRATION COMPLETE'} ===\n`)
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
