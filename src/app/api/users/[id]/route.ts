import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDemoMode } from '@/lib/demo'
import { DEMO_USERS } from '@/lib/demo/data'
import { ROLES } from '@/types/users'
import type { Role } from '@/types/users'

// PATCH /api/users/[id] — 역할/상태 변경 (Admin only)
export const PATCH = withAuth(async (req, { user: currentUser }) => {
  const url = new URL(req.url)
  const targetId = url.pathname.split('/').pop()!

  const body = (await req.json()) as { role?: string; is_active?: boolean }

  // Validation: role value
  if (body.role !== undefined && !ROLES.includes(body.role as Role)) {
    return NextResponse.json(
      { error: { code: 'INVALID_ROLE', message: 'Invalid role value.' } },
      { status: 400 },
    )
  }

  // Validation: self-update prevention
  if (currentUser.id === targetId) {
    return NextResponse.json(
      { error: { code: 'SELF_UPDATE', message: 'Cannot modify your own account.' } },
      { status: 403 },
    )
  }

  if (isDemoMode()) {
    const target = DEMO_USERS.find((u) => u.id === targetId)
    if (!target) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User not found.' } },
        { status: 404 },
      )
    }

    // Last owner protection
    if (target.role === 'owner') {
      const ownerCount = DEMO_USERS.filter((u) => u.role === 'owner' && u.is_active).length
      if (ownerCount <= 1 && (body.role !== 'owner' || body.is_active === false)) {
        return NextResponse.json(
          { error: { code: 'LAST_ADMIN', message: 'Cannot modify the last owner.' } },
          { status: 403 },
        )
      }
    }

    const updated = {
      ...target,
      ...(body.role !== undefined ? { role: body.role as Role } : {}),
      ...(body.is_active !== undefined ? { is_active: body.is_active } : {}),
      updated_at: new Date().toISOString(),
    }
    return NextResponse.json({ user: updated, message: 'User updated successfully.' })
  }

  const supabase = createAdminClient()

  // Check target user exists
  const { data: target, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', targetId)
    .single()

  if (fetchError || !target) {
    return NextResponse.json(
      { error: { code: 'USER_NOT_FOUND', message: 'User not found.' } },
      { status: 404 },
    )
  }

  // Last owner protection
  if (target.role === 'owner') {
    const { count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'owner')
      .eq('is_active', true)

    if ((count ?? 0) <= 1 && (body.role !== 'owner' || body.is_active === false)) {
      return NextResponse.json(
        { error: { code: 'LAST_ADMIN', message: 'Cannot modify the last owner.' } },
        { status: 403 },
      )
    }
  }

  // Build update payload
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (body.role !== undefined) updatePayload.role = body.role
  if (body.is_active !== undefined) updatePayload.is_active = body.is_active

  const { data: updated, error: updateError } = await supabase
    .from('users')
    .update(updatePayload)
    .eq('id', targetId)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: updateError.message } },
      { status: 500 },
    )
  }

  // Audit log
  const details: Record<string, unknown> = {}
  if (body.role !== undefined) {
    details.field = 'role'
    details.from = target.role
    details.to = body.role
  }
  if (body.is_active !== undefined) {
    details.field = details.field ? 'role,is_active' : 'is_active'
    details.is_active_from = target.is_active
    details.is_active_to = body.is_active
  }

  await supabase.from('audit_logs').insert({
    action: 'update',
    resource_type: 'user',
    resource_id: targetId,
    details,
    user_id: currentUser.id,
  })

  return NextResponse.json({ user: updated, message: 'User updated successfully.' })
}, ['owner'])
