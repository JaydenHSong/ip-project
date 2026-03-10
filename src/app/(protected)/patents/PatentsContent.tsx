'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RefreshCw, Search, X, Pencil, Trash2, Shield, PenTool, Tag, Copyright, ExternalLink } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/ui/Button'
import { ScrollTabs } from '@/components/ui/ScrollTabs'
import { SlidePanel } from '@/components/ui/SlidePanel'
import type { IpAsset, IpAssetStatus, IpType } from '@/types/ip-assets'
import { IP_ASSET_STATUSES } from '@/types/ip-assets'

const COUNTRY_OPTIONS = [
  { code: 'US', name: 'United States' },
  { code: 'KR', name: 'South Korea' },
  { code: 'JP', name: 'Japan' },
  { code: 'DE', name: 'Germany' },
  { code: 'CN', name: 'China' },
  { code: 'EU', name: 'European Union' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'TH', name: 'Thailand' },
  { code: 'IN', name: 'India' },
] as const

const STATUS_COLORS: Record<IpAssetStatus, string> = {
  preparing: 'bg-st-default-bg text-st-default-text',
  filed: 'bg-st-info-bg text-st-info-text',
  oa: 'bg-st-warning-bg text-st-warning-text',
  registered: 'bg-st-success-bg text-st-success-text',
  transferred: 'bg-st-violet-bg text-st-violet-text',
  disputed: 'bg-st-danger-bg text-st-danger-text',
  expired: 'bg-st-danger-bg text-st-danger-text',
  abandoned: 'bg-st-default-bg text-st-default-text',
}

const IP_TYPE_CONFIG: Record<IpType, { icon: typeof Shield; color: string }> = {
  patent: {
    icon: Shield,
    color: 'bg-st-info-bg text-st-info-text',
  },
  design_patent: {
    icon: PenTool,
    color: 'bg-st-success-bg text-st-success-text',
  },
  trademark: {
    icon: Tag,
    color: 'bg-st-violet-bg text-st-violet-text',
  },
  copyright: {
    icon: Copyright,
    color: 'bg-st-warning-bg text-st-warning-text',
  },
}

type PatentsContentProps = {
  assets: IpAsset[] | null
  totalPages: number
  page: number
  typeFilter: string
  statusFilter: string
  countryFilter: string
  searchQuery: string
  isAdmin: boolean
  typeCounts: { all: number; patent: number; design_patent: number; trademark: number; copyright: number }
}

type AssetFormData = {
  ip_type: IpType
  management_number: string
  name: string
  description: string
  country: string
  status: IpAssetStatus
  application_number: string
  application_date: string
  registration_number: string
  registration_date: string
  expiry_date: string
  keywords: string
  image_urls: string[]
  related_products: string
  report_url: string
  assignee: string
  notes: string
}

const emptyForm: AssetFormData = {
  ip_type: 'patent',
  management_number: '',
  name: '',
  description: '',
  country: 'US',
  status: 'filed',
  application_number: '',
  application_date: '',
  registration_number: '',
  registration_date: '',
  expiry_date: '',
  keywords: '',
  image_urls: [],
  related_products: '',
  report_url: '',
  assignee: '',
  notes: '',
}

export const PatentsContent = ({
  assets,
  totalPages,
  page,
  typeFilter,
  statusFilter,
  countryFilter,
  searchQuery,
  isAdmin,
  typeCounts,
}: PatentsContentProps) => {
  const { t } = useI18n()
  const router = useRouter()

  const [selectedAsset, setSelectedAsset] = useState<IpAsset | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingAsset, setEditingAsset] = useState<IpAsset | null>(null)
  const [formData, setFormData] = useState<AssetFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<IpAsset | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [localSearch, setLocalSearch] = useState(searchQuery)
  const [syncing, setSyncing] = useState(false)
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const { addToast } = useToast()

  useEffect(() => {
    const stored = localStorage.getItem('patent_new_ids')
    if (stored) {
      try {
        setNewIds(new Set(JSON.parse(stored) as string[]))
      } catch { /* ignore */ }
    }
  }, [])

  const typeTabs: { value: string; labelKey: string; count: number }[] = [
    { value: '', labelKey: 'patents.allTypes', count: typeCounts.all },
    { value: 'patent', labelKey: 'patents.patent', count: typeCounts.patent },
    { value: 'design_patent', labelKey: 'patents.design_patent', count: typeCounts.design_patent },
    { value: 'trademark', labelKey: 'patents.trademark', count: typeCounts.trademark },
    { value: 'copyright', labelKey: 'patents.copyright', count: typeCounts.copyright },
  ]

  const buildHref = useCallback((overrides: Record<string, string>) => {
    const p = new URLSearchParams()
    const merged = { type: typeFilter, status: statusFilter, country: countryFilter, search: searchQuery, ...overrides }
    Object.entries(merged).forEach(([k, v]) => { if (v) p.set(k, v) })
    const qs = p.toString()
    return qs ? `/patents?${qs}` : '/patents'
  }, [typeFilter, statusFilter, countryFilter, searchQuery])

  const handleSync = useCallback(async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/patents/sync', { method: 'POST' })
      const data = await res.json() as {
        error?: { message: string }
        synced?: number
        total?: number
        created?: number
        created_ids?: string[]
        updated?: number
        errors?: number
      }
      if (!res.ok) {
        addToast({
          type: 'error',
          title: 'Sync Failed',
          message: data.error?.message ?? 'Monday.com sync is not configured',
        })
      } else {
        const parts: string[] = []
        if (data.created) parts.push(`${data.created} new`)
        if (data.updated) parts.push(`${data.updated} updated`)
        if (data.errors) parts.push(`${data.errors} errors`)

        addToast({
          type: data.errors ? 'warning' : 'success',
          title: 'Sync Complete',
          message: `${data.total} items synced${parts.length > 0 ? ` (${parts.join(', ')})` : ''}`,
        })

        if (data.created_ids?.length) {
          const existing = JSON.parse(localStorage.getItem('patent_new_ids') ?? '[]') as string[]
          const merged = [...new Set([...existing, ...data.created_ids])]
          localStorage.setItem('patent_new_ids', JSON.stringify(merged))
          setNewIds(new Set(merged))
        }

        router.refresh()
      }
    } catch {
      addToast({
        type: 'error',
        title: 'Sync Failed',
        message: 'Failed to connect to Monday.com',
      })
    } finally {
      setSyncing(false)
    }
  }, [router, addToast])

  const openEdit = useCallback((asset: IpAsset) => {
    setEditingAsset(asset)
    setFormData({
      ip_type: asset.ip_type,
      management_number: asset.management_number,
      name: asset.name,
      description: asset.description ?? '',
      country: asset.country,
      status: asset.status,
      application_number: asset.application_number ?? '',
      application_date: asset.application_date ?? '',
      registration_number: asset.registration_number ?? '',
      registration_date: asset.registration_date ?? '',
      expiry_date: asset.expiry_date ?? '',
      keywords: asset.keywords.join(', '),
      image_urls: [...asset.image_urls],
      related_products: asset.related_products.join(', '),
      report_url: asset.report_url ?? '',
      assignee: asset.assignee ?? '',
      notes: asset.notes ?? '',
    })
    setSelectedAsset(null)
    setShowForm(true)
  }, [])

  const handleSave = useCallback(async () => {
    if (!formData.management_number.trim() || !formData.name.trim()) return
    setSaving(true)

    const payload = {
      ip_type: formData.ip_type,
      management_number: formData.management_number.trim(),
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      country: formData.country,
      status: formData.status,
      application_number: formData.application_number.trim() || null,
      application_date: formData.application_date || null,
      registration_number: formData.registration_number.trim() || null,
      registration_date: formData.registration_date || null,
      expiry_date: formData.expiry_date || null,
      keywords: formData.keywords.split(',').map((k) => k.trim()).filter(Boolean),
      image_urls: formData.image_urls.filter(Boolean),
      related_products: formData.related_products.split(',').map((p) => p.trim()).filter(Boolean),
      report_url: formData.report_url.trim() || null,
      assignee: formData.assignee.trim() || null,
      notes: formData.notes.trim() || null,
    }

    try {
      if (!editingAsset) return
      await fetch(`/api/patents/${editingAsset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setShowForm(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }, [formData, editingAsset, router])

  const handleDelete = useCallback(async (asset: IpAsset) => {
    setDeleting(true)
    try {
      await fetch(`/api/patents/${asset.id}`, { method: 'DELETE' })
      setDeleteConfirm(null)
      setSelectedAsset(null)
      router.refresh()
    } finally {
      setDeleting(false)
    }
  }, [router])

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    router.push(buildHref({ search: localSearch }))
  }, [localSearch, router, buildHref])

  const handleSelectAsset = useCallback((asset: IpAsset) => {
    setSelectedAsset(asset)
    if (newIds.has(asset.id)) {
      setNewIds((prev) => {
        const next = new Set(prev)
        next.delete(asset.id)
        localStorage.setItem('patent_new_ids', JSON.stringify([...next]))
        return next
      })
    }
  }, [newIds])

  const addImageUrl = useCallback(() => {
    setFormData((prev) => ({ ...prev, image_urls: [...prev.image_urls, ''] }))
  }, [])

  const updateImageUrl = useCallback((index: number, value: string) => {
    setFormData((prev) => {
      const urls = [...prev.image_urls]
      urls[index] = value
      return { ...prev, image_urls: urls }
    })
  }, [])

  const removeImageUrl = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      image_urls: prev.image_urls.filter((_, i) => i !== index),
    }))
  }, [])

  const renderTypeBadge = (ipType: IpType) => {
    const config = IP_TYPE_CONFIG[ipType]
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3" />
        {t(`patents.${ipType}` as Parameters<typeof t>[0])}
      </span>
    )
  }

  const renderStatusBadge = (status: IpAssetStatus) => (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
      {t(`patents.${status}` as Parameters<typeof t>[0])}
    </span>
  )

  const inputClass = 'w-full rounded-xl border border-th-border bg-surface-card px-4 py-2.5 text-sm text-th-text placeholder:text-th-text-muted focus:border-th-accent focus:outline-none focus:ring-2 focus:ring-th-accent/20'

  return (
    <div className="flex flex-col gap-4 md:h-full md:gap-6">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <h1 className="truncate text-xl font-bold text-th-text md:text-2xl">{t('patents.title')}</h1>
        {isAdmin && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleSync}
            loading={syncing}
            disabled={syncing}
            icon={<RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />}
          >
            {syncing ? (
              <>
                <span className="hidden md:inline">Syncing from Monday.com...</span>
                <span className="md:hidden">Syncing...</span>
              </>
            ) : (
              <>
                <span className="hidden md:inline">{t('patents.syncStatus')}</span>
                <span className="md:hidden">Sync</span>
              </>
            )}
          </Button>
        )}
      </div>

      {/* Type Tabs */}
      <ScrollTabs>
        {typeTabs.map((tab) => (
          <Link
            key={tab.value}
            href={buildHref({ type: tab.value, page: '' })}
            className={`snap-start whitespace-nowrap rounded-lg px-4 py-2 text-center text-sm font-medium transition-colors ${
              typeFilter === tab.value
                ? 'bg-surface-card text-th-text shadow-sm'
                : 'text-th-text-tertiary hover:text-th-text-secondary'
            }`}
          >
            {t(tab.labelKey as Parameters<typeof t>[0])}
            {tab.count > 0 && (
              <span className="ml-1.5 text-xs text-th-text-muted">({tab.count})</span>
            )}
          </Link>
        ))}
      </ScrollTabs>

      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-th-text-muted" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={t('patents.managementNumber') + ', ' + t('patents.name') + '...'}
            className="w-full rounded-xl border border-th-border bg-surface-card py-2.5 pl-10 pr-4 text-sm text-th-text placeholder:text-th-text-muted focus:border-th-accent focus:outline-none focus:ring-2 focus:ring-th-accent/20"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => { setLocalSearch(''); router.push(buildHref({ search: '' })) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-th-text-muted hover:text-th-text"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {/* Status Filter */}
      <ScrollTabs pill={false} className="gap-2">
        <Link
          href={buildHref({ status: '', page: '' })}
          className={`snap-start whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
            !statusFilter
              ? 'bg-th-accent-soft text-th-accent-text'
              : 'text-th-text-tertiary hover:bg-th-bg-hover'
          }`}
        >
          {t('common.all')}
        </Link>
        {IP_ASSET_STATUSES.map((s) => (
          <Link
            key={s}
            href={buildHref({ status: s, page: '' })}
            className={`snap-start whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-th-accent-soft text-th-accent-text'
                : 'text-th-text-tertiary hover:bg-th-bg-hover'
            }`}
          >
            {t(`patents.${s}` as Parameters<typeof t>[0])}
          </Link>
        ))}
      </ScrollTabs>

      {/* Mobile: card list */}
      <div className="space-y-3 md:hidden">
        {(!assets || assets.length === 0) ? (
          <div className="rounded-xl border border-th-border bg-surface-card p-8 text-center text-th-text-muted">
            {t('patents.noAssets')}
          </div>
        ) : (
          assets.map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => handleSelectAsset(asset)}
              className="block w-full text-left"
            >
              <div className="rounded-xl border border-th-border bg-surface-card p-4 transition-colors active:bg-th-bg-hover">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {renderTypeBadge(asset.ip_type)}
                      {renderStatusBadge(asset.status)}
                      {newIds.has(asset.id) && (
                        <span className="rounded-full bg-th-accent px-2 py-0.5 text-[10px] font-bold text-white animate-pulse">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="mt-2 font-medium text-th-text">{asset.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-th-text-secondary">{asset.management_number}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-th-text-muted">
                  <span>{asset.country}</span>
                  {asset.registration_number && <span>Reg: {asset.registration_number}</span>}
                  {asset.expiry_date && <span>{new Date(asset.expiry_date).toLocaleDateString()}</span>}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-th-border md:flex">
        <table className="w-full shrink-0 text-left text-sm">
          <thead>
            <tr className="border-b border-th-border bg-th-bg-tertiary">
              <th className="px-4 py-3 text-xs font-semibold text-th-text-tertiary">{t('patents.ipType')}</th>
              <th className="px-4 py-3 text-xs font-semibold text-th-text-tertiary">{t('patents.managementNumber')}</th>
              <th className="px-4 py-3 text-xs font-semibold text-th-text-tertiary">{t('patents.name')}</th>
              <th className="px-4 py-3 text-xs font-semibold text-th-text-tertiary">{t('patents.country')}</th>
              <th className="px-4 py-3 text-xs font-semibold text-th-text-tertiary">{t('common.status')}</th>
              <th className="px-4 py-3 text-xs font-semibold text-th-text-tertiary">{t('patents.registrationNumber')}</th>
              <th className="px-4 py-3 text-xs font-semibold text-th-text-tertiary">{t('patents.expiryDate')}</th>
              <th className="px-4 py-3 text-xs font-semibold text-th-text-tertiary">{t('patents.assignee')}</th>
            </tr>
          </thead>
        </table>
        <div className="min-h-0 flex-1 overflow-y-auto shadow-[inset_0_6px_8px_-4px_rgba(0,0,0,0.15)]">
          <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-th-border">
            {(!assets || assets.length === 0) ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-th-text-muted">{t('patents.noAssets')}</td>
              </tr>
            ) : (
              assets.map((asset) => (
                <tr
                  key={asset.id}
                  className="cursor-pointer bg-surface-card transition-colors hover:bg-th-bg-hover"
                  onClick={() => handleSelectAsset(asset)}
                >
                  <td className="px-4 py-3.5">{renderTypeBadge(asset.ip_type)}</td>
                  <td className="px-4 py-3.5 font-mono text-sm text-th-text">
                    <span className="inline-flex items-center gap-2">
                      {asset.management_number}
                      {newIds.has(asset.id) && (
                        <span className="rounded-full bg-th-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                          NEW
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 font-medium text-th-text">{asset.name}</td>
                  <td className="px-4 py-3.5 text-th-text-secondary">{asset.country}</td>
                  <td className="px-4 py-3.5">{renderStatusBadge(asset.status)}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-th-text-secondary">{asset.registration_number ?? '-'}</td>
                  <td className="px-4 py-3.5 text-th-text-secondary">
                    {asset.expiry_date ? new Date(asset.expiry_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3.5 text-th-text-muted">{asset.assignee ?? '-'}</td>
                </tr>
              ))
            )}
          </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildHref({ page: String(p) })}
              className={`rounded-md px-3 py-1.5 text-sm ${
                p === page ? 'bg-th-accent text-white' : 'text-th-text-secondary hover:bg-th-bg-hover'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}

      {/* Quick View SlidePanel */}
      <SlidePanel
        open={!!selectedAsset}
        onClose={() => setSelectedAsset(null)}
        title={selectedAsset?.name ?? ''}
        size="lg"
        status={
          selectedAsset ? (
            <div className="flex items-center gap-2">
              {renderTypeBadge(selectedAsset.ip_type)}
              {renderStatusBadge(selectedAsset.status)}
            </div>
          ) : undefined
        }
      >
        {selectedAsset && (
          <div className="space-y-6 p-6">
            {/* 관리번호 */}
            <div>
              <p className="text-xs font-medium uppercase text-th-text-tertiary">{t('patents.managementNumber')}</p>
              <p className="mt-1 font-mono text-sm text-th-text">{selectedAsset.management_number}</p>
            </div>

            {/* 설명 */}
            {selectedAsset.description && (
              <div>
                <p className="text-xs font-medium uppercase text-th-text-tertiary">{t('patents.description')}</p>
                <p className="mt-1 text-sm leading-relaxed text-th-text-secondary">{selectedAsset.description}</p>
              </div>
            )}

            {/* 출원/등록 정보 그리드 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium uppercase text-th-text-tertiary">{t('patents.country')}</p>
                <p className="mt-1 text-sm text-th-text">
                  {COUNTRY_OPTIONS.find((c) => c.code === selectedAsset.country)?.name ?? selectedAsset.country}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-th-text-tertiary">{t('patents.expiryDate')}</p>
                <p className="mt-1 text-sm text-th-text">
                  {selectedAsset.expiry_date ? new Date(selectedAsset.expiry_date).toLocaleDateString() : t('patents.noExpiry')}
                </p>
              </div>
              {selectedAsset.application_number && (
                <div>
                  <p className="text-xs font-medium uppercase text-th-text-tertiary">{t('patents.applicationNumber')}</p>
                  <p className="mt-1 font-mono text-sm text-th-text">{selectedAsset.application_number}</p>
                </div>
              )}
              {selectedAsset.application_date && (
                <div>
                  <p className="text-xs font-medium uppercase text-th-text-tertiary">{t('patents.applicationDate')}</p>
                  <p className="mt-1 text-sm text-th-text">{new Date(selectedAsset.application_date).toLocaleDateString()}</p>
                </div>
              )}
              {selectedAsset.registration_number && (
                <div>
                  <p className="text-xs font-medium uppercase text-th-text-tertiary">{t('patents.registrationNumber')}</p>
                  <p className="mt-1 font-mono text-sm text-th-text">{selectedAsset.registration_number}</p>
                </div>
              )}
              {selectedAsset.registration_date && (
                <div>
                  <p className="text-xs font-medium uppercase text-th-text-tertiary">{t('patents.registrationDate')}</p>
                  <p className="mt-1 text-sm text-th-text">{new Date(selectedAsset.registration_date).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            {/* 이미지 */}
            {selectedAsset.image_urls.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase text-th-text-tertiary">{t('patents.imageUrls')}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedAsset.image_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="group relative block h-16 w-16 overflow-hidden rounded-md border border-th-border">
                      <img src={url} alt={`Image ${i + 1}`} className="h-full w-full object-cover transition-opacity group-hover:opacity-80" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* 관련 제품 */}
            {selectedAsset.related_products.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase text-th-text-tertiary">{t('patents.relatedProducts')}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedAsset.related_products.map((p) => (
                    <span key={p} className="rounded-md bg-th-bg-tertiary px-2 py-1 text-sm text-th-text-secondary">{p}</span>
                  ))}
                </div>
              </div>
            )}

            {/* 키워드 */}
            {selectedAsset.keywords.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase text-th-text-tertiary">{t('patents.keywords')}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedAsset.keywords.map((kw) => (
                    <span key={kw} className="rounded-md bg-th-bg-tertiary px-2 py-1 text-sm text-th-text-secondary">{kw}</span>
                  ))}
                </div>
              </div>
            )}

            {/* 담당자 / 비고 */}
            {selectedAsset.assignee && (
              <div>
                <p className="text-xs font-medium uppercase text-th-text-tertiary">{t('patents.assignee')}</p>
                <p className="mt-1 text-sm text-th-text-secondary">{selectedAsset.assignee}</p>
              </div>
            )}
            {selectedAsset.notes && (
              <div>
                <p className="text-xs font-medium uppercase text-th-text-tertiary">{t('patents.notes')}</p>
                <p className="mt-1 text-sm leading-relaxed text-th-text-secondary">{selectedAsset.notes}</p>
              </div>
            )}

            {/* Monday.com info */}
            {selectedAsset.monday_item_id && (
              <div>
                <p className="text-xs font-medium uppercase text-th-text-tertiary">{t('patents.mondayItemId')}</p>
                <p className="mt-1 text-sm text-th-text-secondary">{selectedAsset.monday_item_id}</p>
                {selectedAsset.synced_at && (
                  <p className="text-xs text-th-text-muted">
                    {t('patents.syncLastAt')}: {new Date(selectedAsset.synced_at).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {/* 보고서 링크 */}
            {selectedAsset.report_url && (
              <div>
                <p className="text-xs font-medium uppercase text-th-text-tertiary">{t('patents.reportUrl')}</p>
                <a
                  href={selectedAsset.report_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-sm text-th-accent hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {t('patents.reportUrl')}
                </a>
              </div>
            )}

            {/* Admin 버튼 */}
            {isAdmin && (
              <div className="flex gap-2 border-t border-th-border pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Pencil className="h-4 w-4" />}
                  onClick={() => openEdit(selectedAsset)}
                >
                  {t('common.edit')}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Trash2 className="h-4 w-4" />}
                  onClick={() => { setDeleteConfirm(selectedAsset); setSelectedAsset(null) }}
                >
                  {t('common.delete')}
                </Button>
              </div>
            )}
          </div>
        )}
      </SlidePanel>

      {/* Edit SlidePanel */}
      <SlidePanel
        open={showForm}
        onClose={() => setShowForm(false)}
        title={t('patents.editAsset')}
        size="lg"
      >
        <div className="space-y-4 p-6">
          {/* IP Type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-th-text">{t('patents.ipType')} *</label>
            <div className="flex gap-2">
              {(['patent', 'design_patent', 'trademark', 'copyright'] as const).map((type) => {
                const config = IP_TYPE_CONFIG[type]
                const Icon = config.icon
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, ip_type: type }))}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      formData.ip_type === type
                        ? 'border-th-accent bg-th-accent-soft text-th-accent-text'
                        : 'border-th-border text-th-text-secondary hover:bg-th-bg-hover'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {t(`patents.${type}` as Parameters<typeof t>[0])}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 관리번호 + 명칭 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-th-text">{t('patents.managementNumber')} *</label>
            <input
              type="text"
              value={formData.management_number}
              onChange={(e) => setFormData((prev) => ({ ...prev, management_number: e.target.value }))}
              placeholder={t('patents.form.managementNumberPlaceholder')}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-th-text">{t('patents.name')} *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={t('patents.form.namePlaceholder')}
              className={inputClass}
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-th-text">{t('patents.description')}</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={t('patents.form.descriptionPlaceholder')}
              className={inputClass}
            />
          </div>

          {/* 국가 + 상태 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-th-text">{t('patents.country')}</label>
              <select
                value={formData.country}
                onChange={(e) => setFormData((prev) => ({ ...prev, country: e.target.value }))}
                className={inputClass}
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-th-text">{t('common.status')}</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as IpAssetStatus }))}
                className={inputClass}
              >
                {IP_ASSET_STATUSES.map((s) => (
                  <option key={s} value={s}>{t(`patents.${s}` as Parameters<typeof t>[0])}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 출원번호 + 출원일 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-th-text">{t('patents.applicationNumber')}</label>
              <input type="text" value={formData.application_number} onChange={(e) => setFormData((prev) => ({ ...prev, application_number: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-th-text">{t('patents.applicationDate')}</label>
              <input type="date" value={formData.application_date} onChange={(e) => setFormData((prev) => ({ ...prev, application_date: e.target.value }))} className={inputClass} />
            </div>
          </div>

          {/* 등록번호 + 등록일 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-th-text">{t('patents.registrationNumber')}</label>
              <input type="text" value={formData.registration_number} onChange={(e) => setFormData((prev) => ({ ...prev, registration_number: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-th-text">{t('patents.registrationDate')}</label>
              <input type="date" value={formData.registration_date} onChange={(e) => setFormData((prev) => ({ ...prev, registration_date: e.target.value }))} className={inputClass} />
            </div>
          </div>

          {/* 존속만료일 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-th-text">{t('patents.expiryDate')}</label>
            <input type="date" value={formData.expiry_date} onChange={(e) => setFormData((prev) => ({ ...prev, expiry_date: e.target.value }))} className={inputClass} />
          </div>

          {/* 키워드 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-th-text">{t('patents.keywords')}</label>
            <input
              type="text"
              value={formData.keywords}
              onChange={(e) => setFormData((prev) => ({ ...prev, keywords: e.target.value }))}
              placeholder={t('patents.form.keywordsPlaceholder')}
              className={inputClass}
            />
            {formData.keywords && (
              <div className="mt-2 flex flex-wrap gap-1">
                {formData.keywords.split(',').map((k) => k.trim()).filter(Boolean).map((kw) => (
                  <span key={kw} className="rounded bg-th-bg-tertiary px-1.5 py-0.5 text-xs text-th-text-muted">{kw}</span>
                ))}
              </div>
            )}
          </div>

          {/* 관련 제품 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-th-text">{t('patents.relatedProducts')}</label>
            <input
              type="text"
              value={formData.related_products}
              onChange={(e) => setFormData((prev) => ({ ...prev, related_products: e.target.value }))}
              placeholder={t('patents.form.relatedProductsPlaceholder')}
              className={inputClass}
            />
          </div>

          {/* 이미지 URL */}
          <div>
            <label className="mb-1 block text-sm font-medium text-th-text">{t('patents.imageUrls')}</label>
            {formData.image_urls.map((url, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => updateImageUrl(i, e.target.value)}
                  placeholder={t('patents.form.imageUrlPlaceholder')}
                  className={`flex-1 ${inputClass}`}
                />
                <button
                  type="button"
                  onClick={() => removeImageUrl(i)}
                  className="rounded-lg p-2 text-th-text-muted hover:bg-th-bg-hover hover:text-st-danger-text"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={addImageUrl}>
              + {t('patents.form.addImageUrl')}
            </Button>
          </div>

          {/* 보고서 URL */}
          <div>
            <label className="mb-1 block text-sm font-medium text-th-text">{t('patents.reportUrl')}</label>
            <input
              type="url"
              value={formData.report_url}
              onChange={(e) => setFormData((prev) => ({ ...prev, report_url: e.target.value }))}
              placeholder={t('patents.form.reportUrlPlaceholder')}
              className={inputClass}
            />
          </div>

          {/* 담당자 + 비고 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-th-text">{t('patents.assignee')}</label>
            <input
              type="text"
              value={formData.assignee}
              onChange={(e) => setFormData((prev) => ({ ...prev, assignee: e.target.value }))}
              placeholder={t('patents.form.assigneePlaceholder')}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-th-text">{t('patents.notes')}</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder={t('patents.form.notesPlaceholder')}
              className={inputClass}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2 border-t border-th-border pt-4">
            <Button onClick={handleSave} loading={saving} disabled={!formData.management_number.trim() || !formData.name.trim()}>
              {t('common.save')}
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      </SlidePanel>

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteConfirm(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-lg border border-th-border bg-surface-panel p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-th-text">{t('patents.deleteConfirm')}</h3>
            <p className="mt-2 text-sm text-th-text-muted">{t('patents.deleteWarning')}</p>
            <p className="mt-2 font-mono text-sm text-th-text-secondary">{deleteConfirm.management_number} — {deleteConfirm.name}</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
                {t('common.cancel')}
              </Button>
              <Button variant="danger" loading={deleting} onClick={() => handleDelete(deleteConfirm)}>
                {t('common.delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
