// Design Ref: §2.4 Auth context resolution
// Plan SC: SC-08 (audit via trigger — needs userId), Module Isolation (NFR-05)
//
// Resolves { userId, orgUnitId } for API routes from withAuth's User object.
// Matches ads module pattern (user_org_units lookup with user.id fallback).

import { createAdminClient } from '@/lib/supabase/admin';
import type { User } from '@/types/users';

export type ProductsCtx = {
  userId: string;
  orgUnitId: string;
  role: User['role'];
};

export async function resolveProductsCtx(user: User): Promise<ProductsCtx> {
  const supabase = createAdminClient();
  const { data: orgLink } = await supabase
    .from('user_org_units')
    .select('org_unit_id')
    .eq('user_id', user.id)
    .limit(1)
    .single();
  const orgUnitId = orgLink?.org_unit_id ?? user.id;
  return { userId: user.id, orgUnitId, role: user.role };
}
