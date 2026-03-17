import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { DEMO_IP_ASSETS } from '@/lib/demo/patents'
import { createClient } from '@/lib/supabase/server'
import { sanitizeSearchTerm } from '@/lib/utils/sanitize'
import { PatentsContent } from './PatentsContent'
import type { IpType } from '@/types/ip-assets'

const PatentsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string; status?: string; country?: string; search?: string }>
}) => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const page = Number(params.page) || 1
  const limit = 20

  let assets: typeof DEMO_IP_ASSETS | null = null
  let totalPages = 1

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
    assets = filtered
    totalPages = 1
  } else {
    const offset = (page - 1) * limit
    const supabase = await createClient()

    let query = supabase
      .from('ip_assets')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (params.type) {
      query = query.eq('ip_type', params.type)
    }
    if (params.status) {
      query = query.eq('status', params.status)
    }
    if (params.country) {
      query = query.eq('country', params.country)
    }
    if (params.search) {
      const safe = sanitizeSearchTerm(params.search)
      query = query.or(
        `management_number.ilike.%${safe}%,name.ilike.%${safe}%`,
      )
    }

    const { data, error, count } = await query
    if (error) {
      assets = []
    } else {
      assets = data as typeof DEMO_IP_ASSETS | null
    }
    totalPages = Math.ceil((count ?? 0) / limit)
  }

  // 타입별 카운트
  let typeCounts = { all: 0, patent: 0, design_patent: 0, trademark: 0, copyright: 0 }
  if (isDemoMode()) {
    typeCounts = {
      all: DEMO_IP_ASSETS.length,
      patent: DEMO_IP_ASSETS.filter((a) => a.ip_type === 'patent').length,
      design_patent: DEMO_IP_ASSETS.filter((a) => a.ip_type === 'design_patent').length,
      trademark: DEMO_IP_ASSETS.filter((a) => a.ip_type === 'trademark').length,
      copyright: DEMO_IP_ASSETS.filter((a) => a.ip_type === 'copyright').length,
    }
  } else {
    const supabase2 = await createClient()
    const { count: allCount } = await supabase2.from('ip_assets').select('*', { count: 'exact', head: true })
    const { count: patentCount } = await supabase2.from('ip_assets').select('*', { count: 'exact', head: true }).eq('ip_type', 'patent')
    const { count: designCount } = await supabase2.from('ip_assets').select('*', { count: 'exact', head: true }).eq('ip_type', 'design_patent')
    const { count: trademarkCount } = await supabase2.from('ip_assets').select('*', { count: 'exact', head: true }).eq('ip_type', 'trademark')
    const { count: copyrightCount } = await supabase2.from('ip_assets').select('*', { count: 'exact', head: true }).eq('ip_type', 'copyright')
    typeCounts = {
      all: allCount ?? 0,
      patent: patentCount ?? 0,
      design_patent: designCount ?? 0,
      trademark: trademarkCount ?? 0,
      copyright: copyrightCount ?? 0,
    }
  }

  return (
    <PatentsContent
      assets={assets}
      totalPages={totalPages}
      page={page}
      typeFilter={(params.type as IpType) ?? ''}
      statusFilter={params.status ?? ''}
      countryFilter={params.country ?? ''}
      searchQuery={params.search ?? ''}
      isAdmin={user.role === 'owner' || user.role === 'admin'}
      typeCounts={typeCounts}
    />
  )
}

export default PatentsPage
