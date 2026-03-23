import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { fetchPatents } from '@/lib/queries/patents'
import type { PatentQueryParams } from '@/lib/queries/patents'
import { PatentsContent } from './PatentsContent'
import type { IpType } from '@/types/ip-assets'

const PatentsPage = async ({
  searchParams,
}: {
  searchParams: Promise<PatentQueryParams>
}) => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const { assets, totalPages, totalCount, typeCounts } = await fetchPatents(params)

  return (
    <PatentsContent
      assets={assets}
      totalPages={totalPages}
      totalCount={totalCount}
      page={Number(params.page) || 1}
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
