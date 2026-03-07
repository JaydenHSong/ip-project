'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { useToast } from '@/hooks/useToast'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ROLES } from '@/types/users'
import type { User, Role } from '@/types/users'

type UserManagementProps = {
  currentUserId: string
}

const ROLE_BADGE: Record<Role, string> = {
  owner: 'bg-purple-500/20 text-purple-400',
  admin: 'bg-red-500/20 text-red-400',
  editor: 'bg-blue-500/20 text-blue-400',
  viewer_plus: 'bg-teal-500/20 text-teal-400',
  viewer: 'bg-gray-500/20 text-gray-400',
}

const ROLE_LABELS: Record<Role, string> = {
  owner: 'roleOwner',
  admin: 'roleAdmin',
  editor: 'roleEditor',
  viewer_plus: 'roleViewerPlus',
  viewer: 'roleViewer',
}

const formatRelativeTime = (dateStr: string | null): string => {
  if (!dateStr) return '-'
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return '<1h'
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  return `${Math.floor(days / 30)}mo`
}

export const UserManagement = ({ currentUserId }: UserManagementProps) => {
  const { t } = useI18n()
  const { addToast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{
    userId: string
    userName: string
    field: 'role' | 'is_active'
    oldValue: string | boolean
    newValue: string | boolean
  } | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => setUsers(data.users ?? []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = users.filter((u) => {
    if (!search) return true
    const q = search.toLowerCase()
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  const handleConfirm = async () => {
    if (!confirmModal) return
    const { userId, field, newValue } = confirmModal

    setUpdating(userId)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: newValue }),
      })
      const data = await res.json()
      if (!res.ok) {
        addToast({ type: 'error', title: t('settings.users.updateError'), message: data.error?.message })
        return
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, [field]: newValue, updated_at: new Date().toISOString() } : u,
        ),
      )
    } catch {
      addToast({ type: 'error', title: t('settings.users.updateError') })
    } finally {
      setUpdating(null)
      setConfirmModal(null)
    }
  }

  const openRoleChange = (user: User, newRole: Role) => {
    if (user.id === currentUserId) {
      addToast({ type: 'warning', title: t('settings.users.selfEditBlocked') })
      return
    }
    setConfirmModal({
      userId: user.id,
      userName: user.name,
      field: 'role',
      oldValue: user.role,
      newValue: newRole,
    })
  }

  const openActiveToggle = (user: User) => {
    if (user.id === currentUserId) {
      addToast({ type: 'warning', title: t('settings.users.selfEditBlocked') })
      return
    }
    setConfirmModal({
      userId: user.id,
      userName: user.name,
      field: 'is_active',
      oldValue: user.is_active,
      newValue: !user.is_active,
    })
  }

  const getConfirmMessage = (): string => {
    if (!confirmModal) return ''
    const { userName, field, oldValue, newValue } = confirmModal
    if (field === 'role') {
      return t('settings.users.confirmRoleChange')
        .replace('{name}', userName)
        .replace('{from}', t(`settings.users.${ROLE_LABELS[oldValue as Role]}`))
        .replace('{to}', t(`settings.users.${ROLE_LABELS[newValue as Role]}`))
    }
    return newValue
      ? t('settings.users.confirmActivate').replace('{name}', userName)
      : t('settings.users.confirmDeactivate').replace('{name}', userName)
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder={t('settings.users.searchPlaceholder')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <p className="py-8 text-center text-sm text-th-text-muted">{t('common.loading')}</p>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-th-text-muted">
          {search ? t('settings.users.noSearchResults') : t('settings.users.noUsers')}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-th-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-th-border bg-th-bg-secondary">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-th-text-muted">
                    {t('settings.users.name')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-th-text-muted">
                    {t('settings.users.email')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-th-text-muted">
                    {t('settings.users.role')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-th-text-muted">
                    {t('settings.users.activeStatus')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-th-text-muted">
                    {t('settings.users.lastLogin')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => {
                  const isSelf = user.id === currentUserId
                  return (
                    <tr
                      key={user.id}
                      className={`border-b border-th-border last:border-b-0 ${
                        !user.is_active ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-th-accent/20 text-xs font-bold text-th-accent">
                            {user.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                          <span className="font-medium text-th-text">
                            {user.name}
                            {isSelf && (
                              <span className="ml-1.5 text-xs text-th-text-muted">(you)</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-th-text-secondary">{user.email}</td>
                      <td className="px-4 py-3">
                        {isSelf ? (
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGE[user.role]}`}
                          >
                            {t(`settings.users.${ROLE_LABELS[user.role]}`)}
                          </span>
                        ) : (
                          <select
                            value={user.role}
                            onChange={(e) => openRoleChange(user, e.target.value as Role)}
                            disabled={updating === user.id}
                            className="rounded-md border border-th-border bg-th-bg-secondary px-2 py-1 text-xs text-th-text focus:border-th-accent focus:outline-none"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {t(`settings.users.${ROLE_LABELS[r]}`)}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isSelf ? (
                          <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
                        ) : (
                          <button
                            onClick={() => openActiveToggle(user)}
                            disabled={updating === user.id}
                            className="inline-block"
                          >
                            <span
                              className={`inline-block h-2.5 w-2.5 rounded-full ${
                                user.is_active ? 'bg-green-500' : 'bg-red-500'
                              }`}
                            />
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-th-text-muted">
                        {user.last_login_at
                          ? formatRelativeTime(user.last_login_at)
                          : t('settings.users.neverLoggedIn')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-th-text-muted">
            {t('settings.users.showingCount').replace('{count}', String(filtered.length))}
          </p>
        </>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="mx-4 w-full max-w-sm rounded-xl border border-th-border bg-th-bg p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-th-text">
              {confirmModal.field === 'role'
                ? t('settings.users.changeRole')
                : confirmModal.newValue
                  ? t('settings.users.active')
                  : t('settings.users.inactive')}
            </h3>
            <p className="mt-2 text-sm text-th-text-secondary">{getConfirmMessage()}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmModal(null)}>
                {t('common.cancel')}
              </Button>
              <Button size="sm" onClick={handleConfirm} disabled={updating !== null}>
                {updating ? t('common.loading') : t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
