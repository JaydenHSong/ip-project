'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronRight, Plus, Pencil, Trash2, Building2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { ORG_LEVEL_LABELS, ORG_LEVEL_ORDER } from '@/lib/org-units'
import type { OrgLevel } from '@/lib/org-units'

type OrgUnit = {
  id: string
  name: string
  level: string
  parent_id: string | null
  sort_order: number
  is_active: boolean
}

type ModuleAccess = {
  id: string
  module_key: string
  access_level: string
  description: string | null
}

type TreeNode = OrgUnit & { children: TreeNode[] }

function buildTree(units: OrgUnit[]): TreeNode[] {
  const map = new Map<string, TreeNode>()
  for (const u of units) map.set(u.id, { ...u, children: [] })

  const roots: TreeNode[] = []
  for (const u of units) {
    const node = map.get(u.id)!
    if (u.parent_id && map.has(u.parent_id)) {
      map.get(u.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

// ── 트리 노드 렌더러 ──
function TreeNodeItem({
  node, depth, isOwner, onEdit, onAdd, onDelete,
}: {
  node: TreeNode
  depth: number
  isOwner: boolean
  onEdit: (node: OrgUnit) => void
  onAdd: (parentId: string, parentLevel: string) => void
  onDelete: (id: string, name: string) => void
}) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = node.children.length > 0
  const levelLabel = ORG_LEVEL_LABELS[node.level as OrgLevel] ?? node.level

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1.5 rounded-lg px-2 py-1.5 hover:bg-th-bg-hover',
          depth === 0 && 'font-semibold',
        )}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={cn('shrink-0 p-0.5', !hasChildren && 'invisible')}
        >
          {expanded
            ? <ChevronDown className="h-3.5 w-3.5 text-th-text-muted" />
            : <ChevronRight className="h-3.5 w-3.5 text-th-text-muted" />}
        </button>

        <Building2 className="h-3.5 w-3.5 shrink-0 text-th-text-muted" />

        <span className="flex-1 truncate text-sm text-th-text">{node.name}</span>

        <span className="shrink-0 rounded bg-th-bg-subtle px-1.5 py-0.5 text-[10px] text-th-text-muted">
          {levelLabel}
        </span>

        {isOwner && (
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => onAdd(node.id, node.level)}
              className="rounded p-1 hover:bg-th-accent-soft"
              title="하위 조직 추가"
            >
              <Plus className="h-3 w-3 text-th-accent" />
            </button>
            <button
              type="button"
              onClick={() => onEdit(node)}
              className="rounded p-1 hover:bg-th-bg-hover"
              title="수정"
            >
              <Pencil className="h-3 w-3 text-th-text-muted" />
            </button>
            {depth > 0 && (
              <button
                type="button"
                onClick={() => onDelete(node.id, node.name)}
                className="rounded p-1 hover:bg-red-50 dark:hover:bg-red-900/20"
                title="삭제"
              >
                <Trash2 className="h-3 w-3 text-red-400" />
              </button>
            )}
          </div>
        )}
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children
            .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
            .map((child) => (
              <TreeNodeItem
                key={child.id}
                node={child}
                depth={depth + 1}
                isOwner={isOwner}
                onEdit={onEdit}
                onAdd={onAdd}
                onDelete={onDelete}
              />
            ))}
        </div>
      )}
    </div>
  )
}

// ── 메인 컴포넌트 ──
export const OrganizationSettings = ({ isOwner }: { isOwner: boolean }) => {
  const [units, setUnits] = useState<OrgUnit[]>([])
  const [moduleAccess, setModuleAccess] = useState<ModuleAccess[]>([])
  const [loading, setLoading] = useState(true)

  // 모달 상태
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<OrgUnit | null>(null)
  const [formName, setFormName] = useState('')
  const [formLevel, setFormLevel] = useState<string>('division')
  const [formParentId, setFormParentId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [orgRes, modRes] = await Promise.all([
      fetch('/api/settings/org-units'),
      fetch('/api/settings/module-access'),
    ])
    if (orgRes.ok) setUnits(await orgRes.json())
    if (modRes.ok) setModuleAccess(await modRes.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const tree = buildTree(units)

  // 하위 추가
  const handleAdd = (parentId: string, parentLevel: string) => {
    const parentIdx = ORG_LEVEL_ORDER.indexOf(parentLevel as OrgLevel)
    const childLevel = ORG_LEVEL_ORDER[parentIdx + 1] ?? 'unit'

    setModalMode('add')
    setEditTarget(null)
    setFormName('')
    setFormLevel(childLevel)
    setFormParentId(parentId)
  }

  // 수정
  const handleEdit = (node: OrgUnit) => {
    setModalMode('edit')
    setEditTarget(node)
    setFormName(node.name)
    setFormLevel(node.level)
    setFormParentId(node.parent_id)
  }

  // 삭제
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 및 하위 조직을 모두 삭제합니다. 계속하시겠습니까?`)) return

    await fetch(`/api/settings/org-units?id=${id}`, { method: 'DELETE' })
    fetchData()
  }

  // 저장
  const handleSave = async () => {
    if (!formName.trim()) return
    setSaving(true)

    if (modalMode === 'add') {
      await fetch('/api/settings/org-units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName.trim(), level: formLevel, parent_id: formParentId }),
      })
    } else if (modalMode === 'edit' && editTarget) {
      await fetch('/api/settings/org-units', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editTarget.id, name: formName.trim(), level: formLevel }),
      })
    }

    setSaving(false)
    setModalMode(null)
    fetchData()
  }

  // 모듈 접근 레벨 변경
  const handleModuleAccessChange = async (moduleKey: string, accessLevel: string) => {
    await fetch('/api/settings/module-access', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module_key: moduleKey, access_level: accessLevel }),
    })
    fetchData()
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-sm text-th-text-muted">불러오는 중...</div>
  }

  return (
    <div className="space-y-6">
      {/* 조직 트리 */}
      <div className="rounded-xl border border-th-border bg-surface-card">
        <div className="flex items-center justify-between border-b border-th-border px-4 py-3">
          <h2 className="text-sm font-semibold text-th-text">조직 구조</h2>
          {isOwner && tree.length === 0 && (
            <button
              type="button"
              onClick={() => { setModalMode('add'); setFormName(''); setFormLevel('company'); setFormParentId(null) }}
              className="flex items-center gap-1 rounded-lg bg-th-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-th-accent-hover"
            >
              <Plus className="h-3.5 w-3.5" /> 루트 추가
            </button>
          )}
        </div>
        <div className="p-2">
          {tree.length === 0 ? (
            <p className="py-8 text-center text-sm text-th-text-muted">조직이 없습니다. 루트 조직을 추가하세요.</p>
          ) : (
            tree.map((root) => (
              <TreeNodeItem
                key={root.id}
                node={root}
                depth={0}
                isOwner={isOwner}
                onEdit={handleEdit}
                onAdd={handleAdd}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>

      {/* 모듈별 접근 설정 */}
      {isOwner && (
        <div className="rounded-xl border border-th-border bg-surface-card">
          <div className="border-b border-th-border px-4 py-3">
            <h2 className="text-sm font-semibold text-th-text">모듈별 데이터 접근 레벨</h2>
            <p className="mt-0.5 text-xs text-th-text-muted">
              각 모듈이 어느 조직 레벨까지 데이터를 공유하는지 설정합니다.
            </p>
          </div>
          <div className="divide-y divide-th-border">
            {moduleAccess.map((mod) => (
              <div key={mod.module_key} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-sm font-medium text-th-text">{mod.module_key.toUpperCase()}</span>
                  {mod.description && (
                    <p className="text-xs text-th-text-muted">{mod.description}</p>
                  )}
                </div>
                <select
                  value={mod.access_level}
                  onChange={(e) => handleModuleAccessChange(mod.module_key, e.target.value)}
                  className="rounded-lg border border-th-border bg-th-bg px-3 py-1.5 text-sm text-th-text"
                >
                  {ORG_LEVEL_ORDER.map((level) => (
                    <option key={level} value={level}>
                      {ORG_LEVEL_LABELS[level]}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 추가/수정 모달 */}
      {modalMode && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setModalMode(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-th-border bg-surface-card p-6 shadow-xl">
            <h3 className="text-base font-semibold text-th-text">
              {modalMode === 'add' ? '조직 추가' : '조직 수정'}
            </h3>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-th-text-muted">이름</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-lg border border-th-border bg-th-bg px-3 py-2 text-sm text-th-text focus:border-th-accent focus:outline-none"
                  placeholder="조직 이름"
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-th-text-muted">레벨</label>
                <select
                  value={formLevel}
                  onChange={(e) => setFormLevel(e.target.value)}
                  className="w-full rounded-lg border border-th-border bg-th-bg px-3 py-2 text-sm text-th-text"
                  disabled={modalMode === 'edit'}
                >
                  {ORG_LEVEL_ORDER.map((level) => (
                    <option key={level} value={level}>{ORG_LEVEL_LABELS[level]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="rounded-lg border border-th-border px-4 py-2 text-sm text-th-text hover:bg-th-bg-hover"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !formName.trim()}
                className="rounded-lg bg-th-accent px-4 py-2 text-sm font-medium text-white hover:bg-th-accent-hover disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
