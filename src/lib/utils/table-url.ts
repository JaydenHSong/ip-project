/**
 * Builds a table URL preserving all current query params.
 * Single source of truth — prevents params from being accidentally dropped.
 */
export const buildTableUrl = (
  basePath: string,
  params: Record<string, string | number | undefined>,
): string => {
  const p = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '' && value !== 'all') {
      // Skip default values that don't need to be in URL
      if (key === 'page' && value === 1) continue
      if (key === 'sort_field' && value === 'date') continue
      if (key === 'sort_dir' && value === 'desc') continue
      p.set(key, String(value))
    }
  }

  const qs = p.toString()
  return qs ? `${basePath}?${qs}` : basePath
}
