import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env['SUPABASE_URL'] ?? process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? ''
const SUPABASE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const main = async (): Promise<void> => {
  // OMS listings count
  const { count: omsListings } = await sb
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'OMS')
  console.log('OMS listings:', omsListings)

  // OMS reports count
  const { count: omsReports, error: repErr } = await sb
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'OMS')
  if (repErr) {
    console.log('OMS reports error:', repErr.message)
  } else {
    console.log('OMS reports:', omsReports)
  }

  // Total reports
  const { count: totalReports } = await sb
    .from('reports')
    .select('*', { count: 'exact', head: true })
  console.log('Total reports:', totalReports)

  // Check source column on reports
  const { data: sample, error: colErr } = await sb
    .from('reports')
    .select('id, source, status')
    .limit(3)
  if (colErr) {
    console.log('Source column error:', colErr.message)
  } else {
    console.log('Sample reports:', JSON.stringify(sample, null, 2))
  }

  // Check related_asins column
  const { error: relErr } = await sb
    .from('reports')
    .select('related_asins')
    .limit(1)
  if (relErr) {
    console.log('related_asins column error:', relErr.message)
  } else {
    console.log('related_asins column: OK')
  }

  // System user exists?
  const { data: sysUser } = await sb
    .from('users')
    .select('id, email, name')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single()
  console.log('System user:', sysUser ? `${sysUser.name} (${sysUser.email})` : 'NOT FOUND')
}

main().catch((err) => {
  console.error('Check failed:', err)
  process.exit(1)
})
