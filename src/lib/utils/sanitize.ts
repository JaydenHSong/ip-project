/**
 * Supabase PostgREST ilike 쿼리에 사용되는 검색어를 이스케이프.
 * PostgreSQL LIKE 특수문자를 처리하여 Injection을 방지.
 *
 * 이스케이프 대상:
 * - \ (LIKE 이스케이프 문자 — 반드시 최우선 처리)
 * - % (LIKE 와일드카드)
 * - _ (LIKE 단일문자 와일드카드)
 */
export const sanitizeSearchTerm = (input: string): string => {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
}
