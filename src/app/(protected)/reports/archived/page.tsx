import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { createClient } from '@/lib/supabase/server'
import { DEMO_REPORTS } from '@/lib/demo/data'
import { ArchivedReportsContent } from './ArchivedReportsContent'

type ReportRow = {
  id: string
  br_form_type: string
  violation_type: string
  violation_category: string | null
  status: string
  created_at: string
  archived_at: string | null
  archive_reason: string | null
  listings: { asin: string; title: string; marketplace: string; seller_name: string | null } | null
}

export default async function ArchivedReportsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  let reports: ReportRow[] | null = null

  if (isDemoMode()) {
    reports = DEMO_REPORTS.filter((r) => r.status === 'archived').map((r) => ({
      id: r.id,
      br_form_type: r.br_form_type ?? 'other_policy',
      violation_type: r.violation_type,
      violation_category: (r as Record<string, unknown>).violation_category as string | null ?? null,
      status: r.status,
      created_at: r.created_at,
      archived_at: (r as Record<string, unknown>).archived_at as string | null ?? null,
      archive_reason: (r as Record<string, unknown>).archive_reason as string | null ?? null,
      listings: r.listings,
    }))
  } else {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('reports')
      .select('id, br_form_type, violation_type, violation_category, status, created_at, archived_at, archive_reason, listing_snapshot, listings!reports_listing_id_fkey(asin, title, marketplace, seller_name)')
      .eq('status', 'archived')
      .order('archived_at', { ascending: false, nullsFirst: false })

    if (error) console.error('Archived reports query error:', error.message)

    if (data) {
      reports = data.map((r) => ({
        ...r,
        listings: (Array.isArray(r.listings) ? r.listings[0] : r.listings) ?? r.listing_snapshot,
      })) as ReportRow[]
    }
  }

  return <ArchivedReportsContent reports={reports} userRole={user.role} />
}
