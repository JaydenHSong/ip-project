import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env['SUPABASE_URL'] ?? process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? ''
const SUPABASE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const main = async (): Promise<void> => {
  const { data, error } = await sb.rpc('exec_sql', {
    query: `
      SELECT conname, pg_get_constraintdef(oid) as def
      FROM pg_constraint
      WHERE conrelid = 'public.reports'::regclass
        AND conname LIKE '%source%'
    `,
  })

  if (error) {
    // Try alternative: direct query on information_schema
    const { data: d2, error: e2 } = await sb
      .from('reports')
      .insert({
        listing_id: '00000000-0000-0000-0000-000000000000',
        user_violation_type: 'V01',
        violation_category: 'intellectual_property',
        status: 'draft',
        source: 'OMS',
        created_by: '00000000-0000-0000-0000-000000000001',
      })

    console.log('Test insert error:', e2?.message ?? 'No error')
    console.log('RPC error (expected):', error.message)
  } else {
    console.log('Constraints:', JSON.stringify(data, null, 2))
  }
}

main().catch(console.error)
