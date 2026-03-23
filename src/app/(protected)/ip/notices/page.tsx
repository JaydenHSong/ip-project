import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { fetchNotices } from '@/lib/queries/notices'
import type { NoticeQueryParams } from '@/lib/queries/notices'
import { NoticesContent } from './NoticesContent'

const NoticesPage = async ({
  searchParams,
}: {
  searchParams: Promise<NoticeQueryParams>
}) => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const { notices, totalPages, totalCount, readNoticeIds } = await fetchNotices(params, user)

  return (
    <NoticesContent
      notices={notices}
      totalPages={totalPages}
      totalCount={totalCount}
      page={Number(params.page) || 1}
      categoryFilter={params.category ?? ''}
      userRole={user.role}
      readNoticeIds={readNoticeIds}
      searchQuery={params.search ?? ''}
      sortOrder={params.sort ?? 'desc'}
      dateFrom={params.from ?? ''}
      dateTo={params.to ?? ''}
    />
  )
}

export default NoticesPage
