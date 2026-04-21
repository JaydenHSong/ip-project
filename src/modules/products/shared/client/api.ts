// Design Ref: §4.3 State Management — fetch wrapper for client components
// Plan SC: SC-07 (Provider v1 shapes consumed type-safely)
//
// Minimal fetch helper. Intentionally avoids a data-fetching library per
// Option C decision (no React Query / SWR). Caller is responsible for
// manual refresh via router.refresh() after mutations.

import type {
  BulkUpsertResponse,
  ByAsinResponse,
  CsvDryRunResult,
  MappingListResponse,
  AsinMapping,
  AuditEntry,
  CsvImportRow,
  ConflictStrategy,
  MappingStatus,
} from '@/modules/products/shared/types';

export type ApiError = {
  status: number;
  error: string;
  fieldErrors?: Record<string, string[]>;
  details?: unknown;
};

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  if (res.ok) return (await res.json()) as T;

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = { error: res.statusText };
  }

  const shaped = body as { error?: string; fieldErrors?: Record<string, string[]>; details?: unknown };
  const err: ApiError = {
    status: res.status,
    error: shaped.error ?? `HTTP ${res.status}`,
    fieldErrors: shaped.fieldErrors,
    details: shaped.details,
  };
  throw err;
}

// =============================================================================
// Mapping API
// =============================================================================

export async function apiDryRun(csvText: string): Promise<CsvDryRunResult> {
  const res = await fetch('/api/products/mapping/dry-run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csvText }),
  });
  return handle<CsvDryRunResult>(res);
}

export async function apiBulkUpsert(
  rows: CsvImportRow[],
  onConflict: ConflictStrategy
): Promise<BulkUpsertResponse> {
  const res = await fetch('/api/products/mapping', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows, onConflict }),
  });
  return handle<BulkUpsertResponse>(res);
}

export async function apiListMapping(params: URLSearchParams): Promise<MappingListResponse> {
  const res = await fetch(`/api/products/mapping?${params.toString()}`);
  return handle<MappingListResponse>(res);
}

export async function apiPatchMapping(
  id: string,
  patch: { isPrimary?: boolean; status?: MappingStatus; brandMarketId?: string | null }
): Promise<AsinMapping> {
  const res = await fetch(`/api/products/mapping/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return handle<AsinMapping>(res);
}

export async function apiDeleteMapping(id: string): Promise<void> {
  const res = await fetch(`/api/products/mapping/${id}`, { method: 'DELETE' });
  return handle<void>(res);
}

// =============================================================================
// By-ASIN (Provider v1)
// =============================================================================

export async function apiGetByAsin(
  asin: string,
  marketplace: string
): Promise<ByAsinResponse | null> {
  const res = await fetch(
    `/api/products/by-asin/${encodeURIComponent(asin)}?marketplace=${marketplace}`
  );
  if (res.status === 404) return null;
  return handle<ByAsinResponse>(res);
}

export async function apiEnrich(
  asin: string,
  marketplace: string
): Promise<{ enriched: { productName: string; brand: string; imageUrl?: string } }> {
  const res = await fetch(
    `/api/products/by-asin/${encodeURIComponent(asin)}/enrich?marketplace=${marketplace}`,
    { method: 'POST' }
  );
  return handle<{ enriched: { productName: string; brand: string; imageUrl?: string } }>(res);
}

// =============================================================================
// Audit
// =============================================================================

export async function apiListAudit(params: {
  mappingId?: string;
  userId?: string;
  action?: 'CREATE' | 'UPDATE' | 'DELETE';
  limit?: number;
}): Promise<{ data: AuditEntry[]; meta: { limit: number; returned: number } }> {
  const sp = new URLSearchParams();
  if (params.mappingId) sp.set('mappingId', params.mappingId);
  if (params.userId) sp.set('userId', params.userId);
  if (params.action) sp.set('action', params.action);
  if (params.limit) sp.set('limit', String(params.limit));

  const res = await fetch(`/api/products/audit?${sp.toString()}`);
  return handle<{ data: AuditEntry[]; meta: { limit: number; returned: number } }>(res);
}

export function formatApiError(err: unknown): string {
  if (err && typeof err === 'object' && 'error' in err) {
    const e = err as ApiError;
    if (e.fieldErrors) {
      const flat = Object.entries(e.fieldErrors)
        .map(([k, v]) => `${k}: ${v.join(', ')}`)
        .join(' / ');
      return `${e.error}${flat ? ` (${flat})` : ''}`;
    }
    return e.error;
  }
  return err instanceof Error ? err.message : String(err);
}
