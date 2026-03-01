import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { DEMO_REPORTS } from '@/lib/demo/data'
import { ReportDetailContent } from './ReportDetailContent'

type ReportData = {
  id: string
  listing_id: string
  status: string
  user_violation_type: string
  ai_violation_type: string | null
  ai_confidence_score: number | null
  confirmed_violation_type: string | null
  disagreement_flag: boolean
  draft_title: string | null
  draft_body: string | null
  rejection_reason: string | null
  sc_case_id: string | null
  created_at: string
  approved_at: string | null
  rejected_at: string | null
}

type ListingInfo = {
  asin: string
  title: string
  marketplace: string
  seller_name: string | null
}

const ReportDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { id } = await params

  let report: ReportData | null = null
  let listing: ListingInfo | null = null
  let creator: { name: string; email: string } | null = null

  if (isDemoMode()) {
    const found = DEMO_REPORTS.find((r) => r.id === id)
    if (!found) notFound()
    report = found as unknown as ReportData
    listing = found.listings as ListingInfo
    creator = found.users
  } else {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('reports')
      .select(
        '*, listings!reports_listing_id_fkey(asin, title, marketplace, seller_name), users!reports_created_by_fkey(name, email)',
      )
      .eq('id', id)
      .single()

    if (error || !data) notFound()
    report = data as unknown as ReportData
    listing = data.listings as unknown as ListingInfo | null
    creator = data.users as unknown as { name: string; email: string } | null
  }

  if (!report) notFound()

  return (
    <ReportDetailContent
      report={report}
      listing={listing}
      creatorName={creator?.name ?? null}
    />
  )
}

export default ReportDetailPage
