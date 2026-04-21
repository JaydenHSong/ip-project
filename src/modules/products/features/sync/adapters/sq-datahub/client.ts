// Design Ref: products-sync.design.md §2 (Layer 3 — Adapters) + §9.2 (Security)
// Plan SC: NFR-09 (service_role key Vercel env only, 90-day rotation)
//
// Cross-project Supabase client factory. SQ DataHub is a SEPARATE Supabase project
// (prlyigqnzzcxzpdidgbv) from IP Project (njbhqrrdnmiarjjpgqwd). This client reads
// Spigen ERP and channel listing master data. READ-ONLY usage — never writes.

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

export const createSqDataHubClient = (): SupabaseClient => {
  const url = process.env.SQ_DATAHUB_SUPABASE_URL;
  const key = process.env.SQ_DATAHUB_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[sq-datahub] Missing env vars: SQ_DATAHUB_SUPABASE_URL and/or SQ_DATAHUB_SERVICE_ROLE_KEY. ' +
      'Add them in Vercel project settings (Preview + Production).'
    );
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'public' },
  });
};
