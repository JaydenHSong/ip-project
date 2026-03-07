'use client'

import { useState, useEffect, useCallback } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/hooks/useToast'
import { RefreshCw, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'

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
}

const PROMPT_TYPES: PromptTypeInfo[] = [
  { type: 'system', label: 'System Prompt', description: 'Sonnet/Opus shared system prompt for violation detection' },
  { type: 'analyze', label: 'Analyze Prompt', description: 'Violation analysis prompt template' },
  { type: 'draft', label: 'Draft Prompt', description: 'Report draft generation prompt' },
  { type: 'crawler-violation-scan', label: 'Crawler Violation Scan', description: 'Crawler AI violation detection prompt' },
  { type: 'crawler-thumbnail-scan', label: 'Crawler Thumbnail Scan', description: 'Crawler thumbnail policy check prompt' },
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
    return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-th-bg-secondary" />)}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-th-text">AI Prompts</h2>
          <p className="text-sm text-th-text-muted">Manage and optimize AI prompt versions</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          loading={optimizing}
          onClick={handleOptimize}
          icon={<RefreshCw className={`h-4 w-4 ${optimizing ? 'animate-spin' : ''}`} />}
        >
          Run Optimization
        </Button>
      </div>

      {PROMPT_TYPES.map((pt) => {
        const versions = prompts[pt.type] ?? []
        const activeVersion = versions.find((v) => v.is_active)
        const isExpanded = expandedType === pt.type

        return (
          <Card key={pt.type}>
            <CardHeader>
              <button
                type="button"
                onClick={() => setExpandedType(isExpanded ? null : pt.type)}
                className="flex w-full items-center justify-between"
              >
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-th-text">{pt.label}</h3>
                    {activeVersion && (
                      <span className="rounded-full bg-st-success-bg px-2 py-0.5 text-xs font-medium text-st-success-text">
                        v{activeVersion.version}
                      </span>
                    )}
                    {activeVersion?.accuracy_score !== null && activeVersion?.accuracy_score !== undefined && (
                      <span className="text-xs text-th-text-muted">
                        {activeVersion.accuracy_score}% accuracy
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-th-text-muted">{pt.description}</p>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-th-text-muted" /> : <ChevronDown className="h-4 w-4 text-th-text-muted" />}
              </button>
            </CardHeader>
            {isExpanded && (
              <CardContent>
                {versions.length === 0 ? (
                  <p className="text-sm text-th-text-muted">No versions stored in DB. Using hardcoded fallback.</p>
                ) : (
                  <div className="space-y-3">
                    {versions.map((v) => (
                      <div
                        key={v.id}
                        className={`rounded-lg border p-3 ${v.is_active ? 'border-th-accent bg-th-accent/5' : 'border-th-border'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-th-text">v{v.version}</span>
                            {v.is_active && (
                              <span className="rounded bg-st-success-bg px-1.5 py-0.5 text-[10px] font-bold text-st-success-text">
                                ACTIVE
                              </span>
                            )}
                            <span className="text-xs text-th-text-muted">
                              by {v.created_by} · {new Date(v.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
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
                          <summary className="cursor-pointer text-xs text-th-text-muted hover:text-th-text-secondary">
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
              </CardContent>
            )}
          </Card>
        )
      })}

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
