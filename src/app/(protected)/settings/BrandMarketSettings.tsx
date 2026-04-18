'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Trash2, Globe, Tag, Shield } from 'lucide-react'
import { MARKETPLACES, MARKETPLACE_CODES } from '@/constants/marketplaces'

type BrandMarket = {
  id: string
  brand_id: string
  marketplace: string
  account_name: string | null
  is_active: boolean
}

type Brand = {
  id: string
  name: string
  code: string
  description: string | null
  is_active: boolean
  markets: BrandMarket[]
}

type OrgUnit = {
  id: string
  name: string
  level: string
  parent_id: string | null
  sort_order?: number
}

type Permission = {
  id: string
  org_unit_id: string
  brand_market_id: string
  permission: string
  org_units: { id: string; name: string; level: string } | null
  brand_markets: { id: string; marketplace: string; brand_id: string; brands: { name: string } | null } | null
}

const MARKETPLACE_OPTIONS = MARKETPLACE_CODES.map(code => ({
  value: code,
  label: `${code} (${MARKETPLACES[code].domain})`,
}))

const ORG_LEVEL_LABELS: Record<string, string> = {
  company: '회사',
  division: '부문',
  business_unit: '사업부',
  department: '부서',
  team: '팀',
  unit: '유닛',
}

export const BrandMarketSettings = ({ isOwner }: { isOwner: boolean }) => {
  const [brands, setBrands] = useState<Brand[]>([])
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set())

  // 브랜드 추가 모달
  const [showAddBrand, setShowAddBrand] = useState(false)
  const [brandName, setBrandName] = useState('')
  const [brandCode, setBrandCode] = useState('')
  const [brandDesc, setBrandDesc] = useState('')
  const [saving, setSaving] = useState(false)

  // 마켓 추가
  const [addingMarketFor, setAddingMarketFor] = useState<string | null>(null)
  const [newMarketplace, setNewMarketplace] = useState('')

  // 권한 추가
  const [showAddPerm, setShowAddPerm] = useState(false)
  const [permOrgUnit, setPermOrgUnit] = useState('')
  const [permBrandMarket, setPermBrandMarket] = useState('')
  const [permLevel, setPermLevel] = useState<'edit' | 'view'>('view')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [brandRes, orgRes, permRes] = await Promise.all([
      fetch('/api/settings/brands'),
      fetch('/api/settings/org-units'),
      fetch('/api/settings/brand-market-permissions'),
    ])
    if (brandRes.ok) {
      const data = await brandRes.json() as Brand[]
      setBrands(data)
      setExpandedBrands(new Set(data.map(b => b.id)))
    }
    if (orgRes.ok) setOrgUnits(await orgRes.json())
    if (permRes.ok) setPermissions(await permRes.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const orgOptions = useMemo(() => {
    const children = new Map<string, OrgUnit[]>()
    const byId = new Map(orgUnits.map((org) => [org.id, org]))

    for (const org of orgUnits) {
      const pid = org.parent_id ?? '__root__'
      if (!children.has(pid)) children.set(pid, [])
      children.get(pid)!.push(org)
    }

    for (const arr of children.values()) {
      arr.sort((a, b) => {
        const sortGap = (a.sort_order ?? 0) - (b.sort_order ?? 0)
        if (sortGap !== 0) return sortGap
        return a.name.localeCompare(b.name)
      })
    }

    const buildPath = (id: string): string => {
      const parts: string[] = []
      let cur = byId.get(id)
      while (cur) {
        parts.unshift(cur.name)
        cur = cur.parent_id ? byId.get(cur.parent_id) : undefined
      }
      return parts.join(' / ')
    }

    const out: { id: string; label: string; path: string; depth: number; level: string }[] = []
    const walk = (parentId: string | null, depth: number) => {
      const key = parentId ?? '__root__'
      for (const org of children.get(key) ?? []) {
        const indent = '· '.repeat(Math.max(depth, 0))
        const level = ORG_LEVEL_LABELS[org.level] ?? org.level
        out.push({
          id: org.id,
          label: `${indent}${org.name} (${level})`,
          path: buildPath(org.id),
          depth,
          level,
        })
        walk(org.id, depth + 1)
      }
    }

    walk(null, 0)
    return out
  }, [orgUnits])

  const orgPathById = useMemo(() => {
    return new Map(orgOptions.map((o) => [o.id, o.path]))
  }, [orgOptions])

  const toggleBrand = (id: string) => {
    setExpandedBrands(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAddBrand = async () => {
    if (!brandName.trim() || !brandCode.trim()) return
    setSaving(true)
    await fetch('/api/settings/brands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: brandName.trim(), code: brandCode.trim(), description: brandDesc.trim() || undefined }),
    })
    setSaving(false)
    setShowAddBrand(false)
    setBrandName('')
    setBrandCode('')
    setBrandDesc('')
    fetchAll()
  }

  const handleAddMarket = async (brandId: string) => {
    if (!newMarketplace) return
    setSaving(true)
    const option = MARKETPLACE_OPTIONS.find(o => o.value === newMarketplace)
    await fetch('/api/settings/brand-markets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand_id: brandId, marketplace: newMarketplace, account_name: option?.label.split('(')[1]?.replace(')', '') }),
    })
    setSaving(false)
    setAddingMarketFor(null)
    setNewMarketplace('')
    fetchAll()
  }

  const handleDeleteMarket = async (id: string, label: string) => {
    if (!confirm(`"${label}" 마켓을 삭제합니다.`)) return
    await fetch(`/api/settings/brand-markets?id=${id}`, { method: 'DELETE' })
    fetchAll()
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-sm text-th-text-muted">불러오는 중...</div>
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-th-border bg-surface-card">
        <div className="flex items-center justify-between border-b border-th-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-th-text">브랜드 & 마켓</h2>
            <p className="mt-0.5 text-xs text-th-text-muted">브랜드별 Amazon 마켓플레이스를 관리합니다.</p>
          </div>
          {isOwner && (
            <button
              type="button"
              onClick={() => setShowAddBrand(true)}
              className="flex items-center gap-1 rounded-lg bg-th-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-th-accent-hover"
            >
              <Plus className="h-3.5 w-3.5" /> 브랜드 추가
            </button>
          )}
        </div>

        <div className="divide-y divide-th-border">
          {brands.length === 0 ? (
            <p className="py-8 text-center text-sm text-th-text-muted">등록된 브랜드가 없습니다.</p>
          ) : (
            brands.map(brand => (
              <div key={brand.id}>
                {/* 브랜드 헤더 */}
                <button
                  type="button"
                  onClick={() => toggleBrand(brand.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-th-bg-hover"
                >
                  <Tag className="h-4 w-4 shrink-0 text-th-accent" />
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-th-text">{brand.name}</span>
                    {brand.description && (
                      <span className="ml-2 text-xs text-th-text-muted">{brand.description}</span>
                    )}
                  </div>
                  <span className="rounded bg-th-bg-subtle px-2 py-0.5 text-[10px] font-medium text-th-text-muted">
                    {brand.markets.length} markets
                  </span>
                </button>

                {/* 마켓 목록 */}
                {expandedBrands.has(brand.id) && (
                  <div className="border-t border-th-border/50 bg-th-bg-subtle/30 px-4 py-2">
                    {brand.markets.length === 0 ? (
                      <p className="py-2 text-xs text-th-text-muted">등록된 마켓이 없습니다.</p>
                    ) : (
                      <div className="space-y-1">
                        {brand.markets.map(market => (
                          <div key={market.id} className="group flex items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-th-bg-hover">
                            <Globe className="h-3.5 w-3.5 shrink-0 text-th-text-muted" />
                            <span className="w-8 text-xs font-semibold text-th-text">{market.marketplace}</span>
                            <span className="flex-1 text-xs text-th-text-muted">{market.account_name ?? ''}</span>
                            {isOwner && (
                              <button
                                type="button"
                                onClick={() => handleDeleteMarket(market.id, `${brand.name} ${market.marketplace}`)}
                                className="rounded p-1 opacity-0 transition-opacity hover:bg-red-50 group-hover:opacity-100 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="h-3 w-3 text-red-400" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 마켓 추가 */}
                    {isOwner && (
                      <div className="mt-2 border-t border-th-border/30 pt-2">
                        {addingMarketFor === brand.id ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={newMarketplace}
                              onChange={(e) => setNewMarketplace(e.target.value)}
                              className="flex-1 rounded-lg border border-th-border bg-th-bg px-2 py-1.5 text-xs text-th-text"
                            >
                              <option value="">마켓 선택...</option>
                              {MARKETPLACE_OPTIONS
                                .filter(opt => !brand.markets.some(m => m.marketplace === opt.value))
                                .map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleAddMarket(brand.id)}
                              disabled={!newMarketplace || saving}
                              className="rounded-lg bg-th-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-th-accent-hover disabled:opacity-50"
                            >
                              추가
                            </button>
                            <button
                              type="button"
                              onClick={() => { setAddingMarketFor(null); setNewMarketplace('') }}
                              className="rounded-lg border border-th-border px-3 py-1.5 text-xs text-th-text hover:bg-th-bg-hover"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAddingMarketFor(brand.id)}
                            className="flex items-center gap-1 text-xs text-th-accent-text hover:underline"
                          >
                            <Plus className="h-3 w-3" /> 마켓 추가
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 접근 권한 매핑 */}
      {isOwner && (
        <div className="rounded-xl border border-th-border bg-surface-card">
          <div className="flex items-center justify-between border-b border-th-border px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-th-text">접근 권한 매핑</h2>
              <p className="mt-0.5 text-xs text-th-text-muted">조직별로 브랜드×마켓에 대한 편집/열람 권한을 설정합니다.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddPerm(true)}
              className="flex items-center gap-1 rounded-lg bg-th-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-th-accent-hover"
            >
              <Plus className="h-3.5 w-3.5" /> 권한 추가
            </button>
          </div>

          {permissions.length === 0 ? (
            <p className="py-8 text-center text-sm text-th-text-muted">등록된 권한 매핑이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-th-border text-left text-xs text-th-text-muted">
                    <th className="px-4 py-2.5 font-medium">조직</th>
                    <th className="px-4 py-2.5 font-medium">브랜드</th>
                    <th className="px-4 py-2.5 font-medium">마켓</th>
                    <th className="px-4 py-2.5 font-medium">권한</th>
                    <th className="w-10 px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-th-border">
                  {permissions.map(perm => (
                    <tr key={perm.id} className="hover:bg-th-bg-hover">
                      <td className="px-4 py-2.5 text-th-text">
                        <div className="space-y-0.5">
                          <p>{perm.org_units?.name ?? '—'}</p>
                          <p className="text-[11px] text-th-text-muted">
                            {orgPathById.get(perm.org_unit_id) ?? '경로 정보 없음'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-th-text">{perm.brand_markets?.brands?.name ?? '—'}</td>
                      <td className="px-4 py-2.5 font-mono text-th-text">{perm.brand_markets?.marketplace ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <select
                          value={perm.permission}
                          onChange={async (e) => {
                            await fetch('/api/settings/brand-market-permissions', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ org_unit_id: perm.org_unit_id, brand_market_id: perm.brand_market_id, permission: e.target.value }),
                            })
                            fetchAll()
                          }}
                          className="rounded border border-th-border bg-th-bg px-2 py-1 text-xs text-th-text"
                        >
                          <option value="edit">Edit (편집)</option>
                          <option value="view">View (열람)</option>
                        </select>
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm('이 권한을 삭제합니다.')) return
                            await fetch(`/api/settings/brand-market-permissions?id=${perm.id}`, { method: 'DELETE' })
                            fetchAll()
                          }}
                          className="rounded p-1 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-3 w-3 text-red-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 권한 추가 모달 */}
      {showAddPerm && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowAddPerm(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-th-border bg-surface-card p-6 shadow-xl">
            <h3 className="flex items-center gap-2 text-base font-semibold text-th-text">
              <Shield className="h-4 w-4 text-th-accent" /> 접근 권한 추가
            </h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-th-text-muted">조직</label>
                <select
                  value={permOrgUnit}
                  onChange={(e) => setPermOrgUnit(e.target.value)}
                  className="w-full rounded-lg border border-th-border bg-th-bg px-3 py-2 text-sm text-th-text"
                >
                  <option value="">조직 선택...</option>
                  {orgOptions.map(org => (
                    <option key={org.id} value={org.id} title={org.path}>
                      {org.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-th-text-muted">브랜드 × 마켓</label>
                <select
                  value={permBrandMarket}
                  onChange={(e) => setPermBrandMarket(e.target.value)}
                  className="w-full rounded-lg border border-th-border bg-th-bg px-3 py-2 text-sm text-th-text"
                >
                  <option value="">선택...</option>
                  {brands.flatMap(b => b.markets.map(m => (
                    <option key={m.id} value={m.id}>{b.name} × {m.marketplace}</option>
                  )))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-th-text-muted">권한</label>
                <select
                  value={permLevel}
                  onChange={(e) => setPermLevel(e.target.value as 'edit' | 'view')}
                  className="w-full rounded-lg border border-th-border bg-th-bg px-3 py-2 text-sm text-th-text"
                >
                  <option value="edit">Edit (편집)</option>
                  <option value="view">View (열람)</option>
                </select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddPerm(false)}
                className="rounded-lg border border-th-border px-4 py-2 text-sm text-th-text hover:bg-th-bg-hover"
              >
                취소
              </button>
              <button
                type="button"
                disabled={!permOrgUnit || !permBrandMarket || saving}
                onClick={async () => {
                  setSaving(true)
                  await fetch('/api/settings/brand-market-permissions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ org_unit_id: permOrgUnit, brand_market_id: permBrandMarket, permission: permLevel }),
                  })
                  setSaving(false)
                  setShowAddPerm(false)
                  setPermOrgUnit('')
                  setPermBrandMarket('')
                  setPermLevel('view')
                  fetchAll()
                }}
                className="rounded-lg bg-th-accent px-4 py-2 text-sm font-medium text-white hover:bg-th-accent-hover disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* 브랜드 추가 모달 */}
      {showAddBrand && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowAddBrand(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-th-border bg-surface-card p-6 shadow-xl">
            <h3 className="text-base font-semibold text-th-text">브랜드 추가</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-th-text-muted">브랜드명</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full rounded-lg border border-th-border bg-th-bg px-3 py-2 text-sm text-th-text focus:border-th-accent focus:outline-none"
                  placeholder="Spigen"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-th-text-muted">코드 (영문 소문자)</label>
                <input
                  type="text"
                  value={brandCode}
                  onChange={(e) => setBrandCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full rounded-lg border border-th-border bg-th-bg px-3 py-2 text-sm font-mono text-th-text focus:border-th-accent focus:outline-none"
                  placeholder="spigen"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-th-text-muted">설명 (선택)</label>
                <input
                  type="text"
                  value={brandDesc}
                  onChange={(e) => setBrandDesc(e.target.value)}
                  className="w-full rounded-lg border border-th-border bg-th-bg px-3 py-2 text-sm text-th-text focus:border-th-accent focus:outline-none"
                  placeholder="폰케이스/보호필름"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddBrand(false)}
                className="rounded-lg border border-th-border px-4 py-2 text-sm text-th-text hover:bg-th-bg-hover"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleAddBrand}
                disabled={saving || !brandName.trim() || !brandCode.trim()}
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
