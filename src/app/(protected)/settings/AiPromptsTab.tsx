'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/hooks/useToast'
import { RefreshCw, RotateCcw, ChevronDown, Sparkles, FileText, Search, Image, Bot, CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type PromptVersion = {
  id: string
  prompt_type: string
  version: number
  content: string
  is_active: boolean
  accuracy_score: number | null
  sample_count: number
  created_by: string
  created_at: string
  metadata: Record<string, unknown>
}

type PromptTypeInfo = {
  type: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const PROMPT_TYPES: PromptTypeInfo[] = [
  { type: 'system', icon: Bot, label: 'System Prompt', description: 'Sonnet/Opus shared system prompt for violation detection' },
  { type: 'analyze', icon: Search, label: 'Analyze Prompt', description: 'Violation analysis prompt template' },
  { type: 'draft', icon: FileText, label: 'Draft Prompt', description: 'Report draft generation prompt' },
  { type: 'crawler-violation-scan', icon: Sparkles, label: 'Crawler Violation Scan', description: 'Crawler AI violation detection prompt' },
  { type: 'crawler-thumbnail-scan', icon: Image, label: 'Crawler Thumbnail Scan', description: 'Crawler thumbnail policy check prompt' },
]

export const AiPromptsTab = () => {
  const { t } = useI18n()
  const { addToast } = useToast()
  const [prompts, setPrompts] = useState<Record<string, PromptVersion[]>>({})
  const [loading, setLoading] = useState(true)
  const [expandedType, setExpandedType] = useState<string | null>(null)
  const [optimizing, setOptimizing] = useState(false)
  const [rollbackTarget, setRollbackTarget] = useState<{ type: string; version: number } | null>(null)
  const [activating, setActivating] = useState<string | null>(null)

  const fetchPrompts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/prompts')
      if (res.ok) {
        const data = await res.json()
        setPrompts(data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPrompts()
  }, [fetchPrompts])

  const stats = useMemo(() => {
    const allVersions = Object.values(prompts).flat()
    const activeCount = PROMPT_TYPES.filter((pt) => (prompts[pt.type] ?? []).some((v) => v.is_active)).length
    const totalVersions = allVersions.length
    const avgAccuracy = allVersions.filter((v) => v.accuracy_score !== null)
    const avg = avgAccuracy.length > 0
      ? Math.round(avgAccuracy.reduce((sum, v) => sum + (v.accuracy_score ?? 0), 0) / avgAccuracy.length)
      : null
    return { activeCount, totalVersions, avgAccuracy: avg }
  }, [prompts])

  const handleOptimize = async () => {
    setOptimizing(true)
    try {
      const res = await fetch('/api/ai/optimize', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        addToast({ type: 'success', title: 'Optimization complete', message: data.results?.map((r: { message: string }) => r.message).join('; ') })
        fetchPrompts()
      } else {
        addToast({ type: 'error', title: 'Optimization failed', message: data.error })
      }
    } catch {
      addToast({ type: 'error', title: 'Optimization failed' })
    } finally {
      setOptimizing(false)
    }
  }

  const handleActivate = async (promptType: string, version: number) => {
    setActivating(`${promptType}-${version}`)
    try {
      const res = await fetch('/api/ai/prompts/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt_type: promptType, version }),
      })
      if (res.ok) {
        addToast({ type: 'success', title: `Activated v${version}` })
        fetchPrompts()
      } else {
        const data = await res.json()
        addToast({ type: 'error', title: 'Activation failed', message: data.error })
      }
    } catch {
      addToast({ type: 'error', title: 'Activation failed' })
    } finally {
      setActivating(null)
      setRollbackTarget(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 flex-1 animate-pulse rounded-xl bg-th-bg-secondary" />)}
        </div>
        {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-th-bg-secondary" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-th-text">AI Prompts</h2>
          <p className="mt-0.5 text-sm text-th-text-muted">
            Manage and optimize AI prompt versions. Opus analyzes accuracy weekly and suggests improvements.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          loading={optimizing}
          onClick={handleOptimize}
          icon={<RefreshCw className={`h-4 w-4 ${optimizing ? 'animate-spin' : ''}`} />}
        >
          Optimize
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-th-border bg-surface-card px-4 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-st-success-text" />
            <p className="text-xs text-th-text-muted">Active</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-th-text">
            {stats.activeCount}<span className="text-sm font-normal text-th-text-muted">/{PROMPT_TYPES.length}</span>
          </p>
        </div>
        <div className="rounded-xl border border-th-border bg-surface-card px-4 py-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-th-text-muted" />
            <p className="text-xs text-th-text-muted">Total Versions</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-th-text">{stats.totalVersions}</p>
        </div>
        <div className="rounded-xl border border-th-border bg-surface-card px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-th-accent" />
            <p className="text-xs text-th-text-muted">Avg Accuracy</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-th-text">
            {stats.avgAccuracy !== null ? `${stats.avgAccuracy}%` : '—'}
          </p>
        </div>
      </div>

      {/* Prompt Type Cards */}
      <div className="space-y-3">
        {PROMPT_TYPES.map((pt) => {
          const versions = prompts[pt.type] ?? []
          const activeVersion = versions.find((v) => v.is_active)
          const isExpanded = expandedType === pt.type
          const Icon = pt.icon
          const hasDb = versions.length > 0

          return (
            <div
              key={pt.type}
              className={cn(
                'overflow-hidden rounded-xl border transition-colors',
                isExpanded ? 'border-th-accent/40 bg-th-accent/[0.02]' : 'border-th-border bg-surface-card',
              )}
            >
              {/* Card Header */}
              <button
                type="button"
                onClick={() => setExpandedType(isExpanded ? null : pt.type)}
                className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-th-bg-hover/50"
              >
                <div className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                  hasDb ? 'bg-th-accent/10 text-th-accent' : 'bg-th-bg-tertiary text-th-text-muted',
                )}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-th-text">{pt.label}</h3>
                    {activeVersion ? (
                      <span className="rounded-full bg-st-success-bg px-2 py-0.5 text-[10px] font-bold text-st-success-text">
                        v{activeVersion.version}
                      </span>
                    ) : (
                      <span className="rounded-full bg-th-bg-tertiary px-2 py-0.5 text-[10px] font-medium text-th-text-muted">
                        Hardcoded
                      </span>
                    )}
                    {activeVersion?.accuracy_score !== null && activeVersion?.accuracy_score !== undefined && (
                      <span className="text-xs text-th-text-muted">
                        {activeVersion.accuracy_score}%
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-th-text-muted">{pt.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {hasDb && (
                    <span className="text-xs text-th-text-muted">{versions.length} version{versions.length !== 1 ? 's' : ''}</span>
                  )}
                  <ChevronDown className={cn('h-4 w-4 text-th-text-muted transition-transform', isExpanded && 'rotate-180')} />
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-th-border px-4 pb-4 pt-3">
                  {versions.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-th-border bg-th-bg-secondary/50 px-4 py-6 text-center">
                      <Bot className="mx-auto h-8 w-8 text-th-text-muted opacity-40" />
                      <p className="mt-2 text-sm text-th-text-muted">No versions stored in DB</p>
                      <p className="mt-1 text-xs text-th-text-muted">Using hardcoded fallback. Run optimization to create the first DB version.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {versions.map((v) => (
                        <div
                          key={v.id}
                          className={cn(
                            'rounded-lg border p-3',
                            v.is_active ? 'border-th-accent/30 bg-th-accent/5' : 'border-th-border bg-th-bg-secondary/30',
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-th-bg-tertiary px-1.5 py-0.5 font-mono text-xs font-medium text-th-text">
                                v{v.version}
                              </span>
                              {v.is_active && (
                                <span className="rounded bg-st-success-bg px-1.5 py-0.5 text-[10px] font-bold text-st-success-text">
                                  ACTIVE
                                </span>
                              )}
                              {v.accuracy_score !== null && (
                                <span className="text-xs text-th-text-secondary">{v.accuracy_score}% accuracy</span>
                              )}
                              <span className="text-xs text-th-text-muted">
                                {v.created_by} · {new Date(v.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {!v.is_active && (
                              <Button
                                variant="ghost"
                                size="sm"
                                loading={activating === `${pt.type}-${v.version}`}
                                onClick={() => setRollbackTarget({ type: pt.type, version: v.version })}
                                icon={<RotateCcw className="h-3 w-3" />}
                              >
                                Activate
                              </Button>
                            )}
                          </div>
                          {v.metadata && Object.keys(v.metadata).length > 0 && (() => {
                            const meta = v.metadata as Record<string, unknown>
                            const changes = Array.isArray(meta.changes) ? (meta.changes as string[]) : null
                            const accuracyAtTime = typeof meta.accuracy_at_time === 'number' ? meta.accuracy_at_time : null
                            return (
                              <div className="mt-2 space-y-1">
                                {changes && (
                                  <div className="text-xs text-th-text-secondary">
                                    Changes: {changes.join(', ')}
                                  </div>
                                )}
                                {accuracyAtTime !== null && (
                                  <div className="text-xs text-th-text-muted">
                                    Accuracy at time: {accuracyAtTime}%
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-th-accent-text hover:underline">
                              View prompt content
                            </summary>
                            <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-th-bg-tertiary p-3 text-xs text-th-text-secondary">
                              {v.content}
                            </pre>
                          </details>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Modal
        open={!!rollbackTarget}
        onClose={() => setRollbackTarget(null)}
        title={t('common.confirm' as Parameters<typeof t>[0])}
      >
        <p className="text-sm text-th-text-secondary">
          Activate version {rollbackTarget?.version} for {rollbackTarget?.type}? This will deactivate the current version.
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={() => setRollbackTarget(null)}>
            Cancel
          </Button>
          <Button
            size="sm"
            loading={!!activating}
            onClick={() => rollbackTarget && handleActivate(rollbackTarget.type, rollbackTarget.version)}
          >
            Activate
          </Button>
        </div>
      </Modal>
    </div>
  )
}
