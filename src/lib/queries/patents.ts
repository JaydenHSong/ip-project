import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo'
import { DEMO_IP_ASSETS } from '@/lib/demo/patents'
import { sanitizeSearchTerm } from '@/lib/utils/sanitize'

export type PatentQueryParams = {
  page?: string
  type?: string
  status?: string
  country?: string
  search?: string
}

type TypeCounts = { all: number; patent: number; design_patent: number; trademark: number; copyright: number }

type FetchPatentsResult = {
  assets: typeof DEMO_IP_ASSETS | null
  totalPages: number
  typeCounts: TypeCounts
}

const PAGE_SIZE = 20

export async function fetchPatents(params: PatentQueryParams): Promise<FetchPatentsResult> {
  if (isDemoMode()) {
    let filtered = [...DEMO_IP_ASSETS]
    if (params.type) filtered = filtered.filter((a) => a.ip_type === params.type)
    if (params.status) filtered = filtered.filter((a) => a.status === params.status)
    if (params.country) filtered = filtered.filter((a) => a.country === params.country)
    if (params.search) {
      const q = params.search.toLowerCase()
      filtered = filtered.filter(
        (a) =>
          a.management_number.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          a.keywords.some((k) => k.toLowerCase().includes(q)),
      )
    }
    return {
      assets: filtered,
      totalPages: 1,
      typeCounts: {
        all: DEMO_IP_ASSETS.length,
        patent: DEMO_IP_ASSETS.filter((a) => a.ip_type === 'patent').length,
        design_patent: DEMO_IP_ASSETS.filter((a) => a.ip_type === 'design_patent').length,
        trademark: DEMO_IP_ASSETS.filter((a) => a.ip_type === 'trademark').length,
        copyright: DEMO_IP_ASSETS.filter((a) => a.ip_type === 'copyright').length,
      },
    }
  }

  const offset = (Number(params.page) || 1 - 1) * PAGE_SIZE
  const supabase = await createClient()

  let query = supabase
    .from('ip_assets')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (params.type) query = query.eq('ip_type', params.type)
  if (params.status) query = query.eq('status', params.status)
  if (params.country) query = query.eq('country', params.country)
  if (params.search) {
    const safe = sanitizeSearchTerm(params.search)
    query = query.or(`management_number.ilike.%${safe}%,name.ilike.%${safe}%`)
  }

  const { data, error, count } = await query
  const assets = (error ? [] : data) as typeof DEMO_IP_ASSETS | null
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  // Type counts
  const { count: allCount } = await supabase.from('ip_assets').select('*', { count: 'exact', head: true })
  const { count: patentCount } = await supabase.from('ip_assets').select('*', { count: 'exact', head: true }).eq('ip_type', 'patent')
  const { count: designCount } = await supabase.from('ip_assets').select('*', { count: 'exact', head: true }).eq('ip_type', 'design_patent')
  const { count: trademarkCount } = await supabase.from('ip_assets').select('*', { count: 'exact', head: true }).eq('ip_type', 'trademark')
  const { count: copyrightCount } = await supabase.from('ip_assets').select('*', { count: 'exact', head: true }).eq('ip_type', 'copyright')

  return {
    assets,
    totalPages,
    typeCounts: {
      all: allCount ?? 0,
      patent: patentCount ?? 0,
      design_patent: designCount ?? 0,
      trademark: trademarkCount ?? 0,
      copyright: copyrightCount ?? 0,
    },
  }
}
