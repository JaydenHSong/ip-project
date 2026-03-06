import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { DEMO_NOTICES } from '@/lib/demo/data'
import { NoticesContent } from './NoticesContent'

const NoticesPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>
}) => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const page = Number(params.page) || 1
  const limit = 20

  let notices: typeof DEMO_NOTICES | null = null
  let totalPages = 1

  if (isDemoMode()) {
    let filtered = [...DEMO_NOTICES]
    if (params.category) filtered = filtered.filter((n) => n.category === params.category)
    // Sort: pinned first, then by date
    filtered.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    notices = filtered
    totalPages = 1
  } else {
    const offset = (page - 1) * limit
    const supabase = createAdminClient()

    let query = supabase
      .from('notices')
      .select('*, users!notices_created_by_fkey(name, email)', { count: 'exact' })
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (params.category) {
      query = query.eq('category', params.category)
    }

    const { data, error, count } = await query
    if (error) {
      notices = []
    } else {
      notices = data as typeof DEMO_NOTICES
    }
    totalPages = Math.ceil((count ?? 0) / limit)
  }

  return (
    <NoticesContent
      notices={notices ?? []}
      totalPages={totalPages}
      page={page}
      categoryFilter={params.category ?? ''}
      userRole={user.role}
    />
  )
}

export default NoticesPage
