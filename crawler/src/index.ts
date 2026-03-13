// ─── Service Router ──────────────────────────────────────────
// SENTINEL_SERVICE=crawl → Crawl only
// SENTINEL_SERVICE=br    → BR Submit + Monitor + Reply
// SENTINEL_SERVICE=all   → All workers (default, local dev & rollback)
const SENTINEL_SERVICE = process.env['SENTINEL_SERVICE'] ?? 'all'

if (SENTINEL_SERVICE === 'crawl') {
  await import('./entry-crawl.js')
} else if (SENTINEL_SERVICE === 'br') {
  await import('./entry-br.js')
} else {
  await import('./entry-all.js')
}
