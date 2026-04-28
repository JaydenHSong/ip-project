// Design Ref: §11.2 features/mapping/csv-parser.ts (planned split)
// Plan SC: SC-01 (CSV <60s), SC-08 (audit via trigger)
//
// Server-side CSV parsing + dry-run logic. Kept separate from queries.ts so
// mapping/queries.ts stays under NFR-06 (250 lines).

import { createAdminClient } from '@/lib/supabase/admin';
import { CSV_REQUIRED_HEADERS } from '@/modules/products/shared/constants';
import type {
  CsvImportRow,
  CsvDryRunResult,
  CsvDryRunRow,
} from '@/modules/products/shared/types';
import {
  rowToMapping,
  type AsinMappingDbRow,
} from '@/modules/products/shared/row-mappers';
import { csvImportRowSchema } from './validators';

export type DryRunInput = {
  csvText: string;
};

type ParsedRow =
  | { ok: true; row: number; data: CsvImportRow }
  | { ok: false; row: number; message: string; raw: CsvImportRow };

/**
 * Parse CSV + validate each row + detect conflicts against existing mappings.
 * Returns a Runtime Verification Plan that the UI uses to render Step 2 of the
 * import drawer.
 */
export async function dryRunCsv(input: DryRunInput): Promise<CsvDryRunResult> {
  const parsed = parseCsvText(input.csvText);
  const rows: CsvDryRunRow[] = [];
  let valid = 0;
  let conflicts = 0;
  let invalid = 0;

  const pairs = parsed
    .filter((p): p is Extract<ParsedRow, { ok: true }> => p.ok)
    .map((p) => ({ asin: p.data.asin, marketplace: p.data.marketplace }));
  const existingMap = await fetchExistingByAsinMarket(pairs);

  for (const entry of parsed) {
    if (!entry.ok) {
      invalid += 1;
      rows.push({
        row: entry.row,
        status: 'invalid',
        message: entry.message,
        incoming: entry.raw,
      });
      continue;
    }

    const key = `${entry.data.asin}|${entry.data.marketplace}`;
    const existing = existingMap.get(key);
    if (existing) {
      conflicts += 1;
      rows.push({
        row: entry.row,
        status: 'conflict',
        message: 'asin+marketplace 조합이 이미 존재합니다',
        existing: rowToMapping(existing),
        incoming: entry.data,
      });
    } else {
      valid += 1;
      rows.push({ row: entry.row, status: 'ok', incoming: entry.data });
    }
  }

  return {
    summary: { total: parsed.length, valid, conflicts, invalid },
    rows,
  };
}

export function parseCsvText(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const missing = CSV_REQUIRED_HEADERS.filter((h) => !header.includes(h));
  if (missing.length > 0) {
    return lines.slice(1).map((_, i) => ({
      ok: false,
      row: i + 2,
      message: `필수 헤더 누락: ${missing.join(', ')}`,
      raw: { sku: '', asin: '', marketplace: 'US' } as CsvImportRow,
    }));
  }

  const out: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const obj: Record<string, string> = {};
    header.forEach((h, idx) => {
      obj[h] = cells[idx]?.trim() ?? '';
    });

    const parsed = csvImportRowSchema.safeParse(obj);
    if (parsed.success) {
      out.push({ ok: true, row: i + 1, data: parsed.data as CsvImportRow });
    } else {
      out.push({
        ok: false,
        row: i + 1,
        message: parsed.error.issues
          .map((iss) => `${iss.path.join('.')}: ${iss.message}`)
          .join('; '),
        raw: obj as unknown as CsvImportRow,
      });
    }
  }
  return out;
}

/** Minimal CSV splitter handling quoted fields + doubled-quote escapes. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export async function fetchExistingByAsinMarket(
  pairs: Array<{ asin: string; marketplace: string }>
): Promise<Map<string, AsinMappingDbRow>> {
  if (pairs.length === 0) return new Map();

  const db = createAdminClient();
  const asins = Array.from(new Set(pairs.map((p) => p.asin)));
  const { data, error } = await db
    .schema('products')
    .from('asin_mapping')
    .select('*')
    .in('asin', asins);
  if (error) throw error;

  const out = new Map<string, AsinMappingDbRow>();
  for (const row of (data ?? []) as AsinMappingDbRow[]) {
    out.set(`${row.asin}|${row.marketplace}`, row);
  }
  return out;
}
