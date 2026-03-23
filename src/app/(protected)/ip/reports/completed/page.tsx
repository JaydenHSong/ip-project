import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { fetchCompletedReports, COMPLETED_PAGE_SIZE } from '@/lib/queries/completed-reports'
import type { CompletedReportQueryParams } from '@/lib/queries/completed-reports'
import { CompletedReportsContent } from './CompletedReportsContent'

const CompletedReportsPage = async ({
  searchParams,
}: {
  searchParams: Promise<CompletedReportQueryParams>
}) => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)

  const { reports, totalCount, effectiveOwner } = await fetchCompletedReports(params, user)
  const totalPages = Math.ceil(totalCount / COMPLETED_PAGE_SIZE)

  return (
    <CompletedReportsContent
      reports={reports as Parameters<typeof CompletedReportsContent>[0]['reports']}
      statusFilter={params.status ?? ''}
      userRole={user.role}
      ownerFilter={effectiveOwner}
      page={page}
      totalPages={totalPages}
      totalCount={totalCount}
      pageSize={COMPLETED_PAGE_SIZE}
      searchQuery={params.search ?? ''}
      sortField={params.sort_field ?? 'date'}
      sortDir={(params.sort_dir ?? 'desc') as 'asc' | 'desc'}
    />
  )
}

export default CompletedReportsPage
