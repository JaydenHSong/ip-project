import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { fetchReports } from '@/lib/queries/reports'
import type { ReportQueryParams } from '@/lib/queries/reports'
import { ReportsContent } from './ReportsContent'

const ReportsPage = async ({
  searchParams,
}: {
  searchParams: Promise<ReportQueryParams>
}) => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const params = await searchParams

  const { reports, totalPages, totalCount, effectiveOwner, cloneThresholdDays, maxMonitoringDays } = await fetchReports(params, user)

  return (
    <ReportsContent
      reports={reports as Parameters<typeof ReportsContent>[0]['reports']}
      totalPages={totalPages}
      totalCount={totalCount}
      page={Number(params.page) || 1}
      statusFilter={params.status ?? ''}
      brFormTypeFilter={params.br_form_type ?? ''}
      userRole={user.role}
      ownerFilter={effectiveOwner}
      searchQuery={params.search ?? ''}
      dateFrom={params.date_from ?? ''}
      dateTo={params.date_to ?? ''}
      sortField={params.sort_field ?? 'date'}
      sortDir={(params.sort_dir ?? 'desc') as 'asc' | 'desc'}
      cloneThresholdDays={cloneThresholdDays}
      maxMonitoringDays={maxMonitoringDays}
    />
  )
}

export default ReportsPage
