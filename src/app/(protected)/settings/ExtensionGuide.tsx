'use client'

import { useState, useCallback, useEffect } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Download, Package, FolderOpen, Chrome, CheckCircle, ChevronDown, Shield, Globe, Puzzle } from 'lucide-react'

const TOTAL_STEPS = 4

type ReleaseEntry = {
  version: string
  download_url: string
  changes: string[]
  released_at: string
}

const STEP_ICONS = [Download, FolderOpen, Chrome, CheckCircle] as const

export const ExtensionGuide = () => {
  const { t } = useI18n()
  const [currentStep, setCurrentStep] = useState(0)
  const [releases, setReleases] = useState<ReleaseEntry[]>([])
  const [latestVersion, setLatestVersion] = useState<string>('...')
  const [downloadUrl, setDownloadUrl] = useState<string>('#')
  const [openVersions, setOpenVersions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/extension/latest')
      .then((res) => res.json())
      .then((data: { latest: ReleaseEntry | null; history: ReleaseEntry[] }) => {
        if (data.latest) {
          setLatestVersion(data.latest.version)
          setDownloadUrl(data.latest.download_url)
          setOpenVersions(new Set([data.latest.version]))
        }
        setReleases(data.history)
      })
      .catch(() => {
        setLatestVersion('1.4.0')
        setDownloadUrl('/downloads/sentinel-extension-v1.4.0.zip')
      })
      .finally(() => setLoading(false))
  }, [])

  const toggleVersion = useCallback((version: string) => {
    setOpenVersions((prev) => {
      const next = new Set(prev)
      if (next.has(version)) next.delete(version)
      else next.add(version)
      return next
    })
  }, [])

  const webStoreUrl = process.env.NEXT_PUBLIC_EXTENSION_STORE_URL ?? null

  const stepKeys = ['download', 'extract', 'load', 'verify'] as const

  return (
    <div className="space-y-6">
      {/* Hero Download Section */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-th-accent/10 via-th-accent/5 to-transparent p-6 md:p-8">
          <div className="flex flex-col items-center gap-5 md:flex-row md:items-start">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-th-accent/15 shadow-sm">
              <Shield className="h-8 w-8 text-th-accent" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-bold text-th-text">Sentinel Extension</h3>
              <p className="mt-1 text-sm text-th-text-secondary">
                One-click violation reporting for Amazon product pages
              </p>
              <div className="mt-1.5 flex flex-wrap items-center justify-center gap-3 text-xs text-th-text-muted md:justify-start">
                <span className="flex items-center gap-1">
                  <Package className="h-3.5 w-3.5" />
                  v{latestVersion}
                </span>
                <span className="flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" />
                  Chrome / Edge
                </span>
                <span className="flex items-center gap-1">
                  <Puzzle className="h-3.5 w-3.5" />
                  Manifest V3
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-center gap-2">
              <a href={downloadUrl} download>
                <Button variant="primary" disabled={loading} className="gap-2 px-6 py-2.5 text-base">
                  <Download className="h-5 w-5" />
                  {loading ? '...' : `Download v${latestVersion}`}
                </Button>
              </a>
              {webStoreUrl && (
                <a
                  href={webStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-th-accent-text hover:underline"
                >
                  Or install from Chrome Web Store
                </a>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Installation Steps */}
      <Card>
        <CardContent className="p-6">
          <h3 className="mb-5 text-base font-semibold text-th-text">
            {t('settings.extension.install.manual.title' as Parameters<typeof t>[0])}
          </h3>

          {/* Modern Stepper */}
          <div className="mb-6 flex items-center">
            {stepKeys.map((key, i) => {
              const Icon = STEP_ICONS[i]
              const isActive = i === currentStep
              const isCompleted = i < currentStep

              return (
                <div key={key} className="flex flex-1 items-center">
                  <button
                    onClick={() => setCurrentStep(i)}
                    className={`group flex flex-col items-center gap-1.5 transition-all ${
                      isActive ? 'scale-105' : ''
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
                        isActive
                          ? 'bg-th-accent text-white shadow-md shadow-th-accent/25'
                          : isCompleted
                            ? 'bg-green-500/15 text-green-500'
                            : 'bg-th-bg-secondary text-th-text-muted group-hover:bg-th-bg-tertiary'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-medium ${
                        isActive
                          ? 'text-th-accent-text'
                          : isCompleted
                            ? 'text-green-500'
                            : 'text-th-text-muted'
                      }`}
                    >
                      {t(`settings.extension.install.manual.steps.${key}.title` as Parameters<typeof t>[0])}
                    </span>
                  </button>
                  {i < TOTAL_STEPS - 1 && (
                    <div
                      className={`mx-1 mt-[-18px] h-0.5 flex-1 rounded-full transition-colors ${
                        isCompleted ? 'bg-green-500/40' : 'bg-th-border'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* Step Content */}
          <div className="rounded-xl border border-th-border bg-th-bg-secondary p-5">
            {/* Step 1: Download */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <p className="text-sm text-th-text-secondary">
                  {t('settings.extension.install.manual.steps.download.description' as Parameters<typeof t>[0])}
                </p>
                <a href={downloadUrl} download>
                  <Button variant="primary" size="sm" disabled={loading} className="gap-2">
                    <Download className="h-4 w-4" />
                    {loading
                      ? '...'
                      : `${t('settings.extension.install.manual.steps.download.button' as Parameters<typeof t>[0])} (v${latestVersion})`}
                  </Button>
                </a>
                <p className="text-xs text-th-text-muted">
                  {t('settings.extension.install.manual.steps.download.size' as Parameters<typeof t>[0])}
                </p>
              </div>
            )}

            {/* Step 2: Extract */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-th-text-secondary">
                  {t('settings.extension.install.manual.steps.extract.description' as Parameters<typeof t>[0])}
                </p>
                <div className="rounded-lg bg-th-bg p-3 font-mono text-xs text-th-text-secondary">
                  <div className="space-y-0.5">
                    <div className="text-th-text-muted">Downloads/</div>
                    <div className="pl-4 text-th-accent-text">sentinel-extension/</div>
                    <div className="pl-8">manifest.json</div>
                    <div className="pl-8">background.js</div>
                    <div className="pl-8">content.js</div>
                    <div className="pl-8">popup.html</div>
                  </div>
                </div>
                <p className="rounded-lg bg-th-accent/5 px-3 py-2 text-xs text-th-accent-text">
                  {t('settings.extension.install.manual.steps.extract.tip' as Parameters<typeof t>[0])}
                </p>
              </div>
            )}

            {/* Step 3: Load in Chrome */}
            {currentStep === 2 && (
              <div className="space-y-3">
                <ol className="space-y-3 text-sm text-th-text-secondary">
                  {(['step1', 'step2', 'step3', 'step4'] as const).map((step, i) => (
                    <li key={step} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-th-accent/15 text-xs font-bold text-th-accent">
                        {i + 1}
                      </span>
                      <div>
                        <p>{t(`settings.extension.install.manual.steps.load.${step}` as Parameters<typeof t>[0])}</p>
                        {i === 0 && (
                          <button
                            onClick={() => navigator.clipboard.writeText('chrome://extensions')}
                            className="mt-1 inline-flex items-center gap-1 rounded-md bg-th-bg px-2 py-0.5 font-mono text-xs text-th-accent-text transition-colors hover:bg-th-bg-tertiary"
                          >
                            chrome://extensions
                            <span className="text-[10px] text-th-text-muted">click to copy</span>
                          </button>
                        )}
                        {i === 1 && (
                          <div className="mt-1.5 inline-flex items-center gap-2 rounded-full border border-th-border px-3 py-1 text-xs">
                            <span className="text-th-text-muted">Developer mode</span>
                            <span className="h-3.5 w-7 rounded-full bg-th-accent" />
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Step 4: Verify */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <ul className="space-y-2">
                  {(['check1', 'check2', 'check3'] as const).map((check) => (
                    <li key={check} className="flex items-center gap-2.5 text-sm text-th-text-secondary">
                      <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                      {t(`settings.extension.install.manual.steps.verify.${check}` as Parameters<typeof t>[0])}
                    </li>
                  ))}
                </ul>
                <div className="rounded-lg bg-green-500/10 px-4 py-3 text-center text-sm font-medium text-green-500">
                  {t('settings.extension.install.manual.steps.verify.success' as Parameters<typeof t>[0])}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-th-text-muted">
                    {t('settings.extension.install.manual.steps.verify.troubleshoot' as Parameters<typeof t>[0])}
                  </p>
                  <ul className="space-y-0.5 text-xs text-th-text-muted">
                    {(['tip1', 'tip2', 'tip3'] as const).map((tip) => (
                      <li key={tip}>
                        {t(`settings.extension.install.manual.steps.verify.${tip}` as Parameters<typeof t>[0])}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-5 flex justify-between border-t border-th-border pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                disabled={currentStep === 0}
              >
                {t('settings.extension.install.manual.back' as Parameters<typeof t>[0])}
              </Button>
              {currentStep < TOTAL_STEPS - 1 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep((s) => Math.min(TOTAL_STEPS - 1, s + 1))}
                >
                  {t('settings.extension.install.manual.next' as Parameters<typeof t>[0])}
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={() => setCurrentStep(0)}>
                  {t('settings.extension.install.manual.done' as Parameters<typeof t>[0])}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Background ASIN Fetch */}
      <Card>
        <CardContent className="p-6">
          <h3 className="mb-3 text-base font-semibold text-th-text">
            {t('settings.extension.bgFetch.title' as Parameters<typeof t>[0])}
          </h3>
          <p className="text-sm text-th-text-secondary">
            {t('settings.extension.bgFetch.description' as Parameters<typeof t>[0])}
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {(['step1', 'step2', 'step3', 'step4'] as const).map((step, i) => (
              <div
                key={step}
                className="flex items-start gap-2.5 rounded-lg border border-th-border bg-th-bg-secondary p-3"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-blue-500/15 text-[10px] font-bold text-blue-500">
                  {i + 1}
                </span>
                <span className="text-xs text-th-text-secondary">
                  {t(`settings.extension.bgFetch.${step}` as Parameters<typeof t>[0])}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 rounded-lg bg-blue-500/5 px-3 py-2 text-xs text-blue-500">
            {t('settings.extension.bgFetch.enableNote' as Parameters<typeof t>[0])}
          </p>
        </CardContent>
      </Card>

      {/* Version History - Timeline */}
      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 text-base font-semibold text-th-text">Version History</h3>
          {loading ? (
            <p className="text-sm text-th-text-muted">Loading...</p>
          ) : (
            <div className="relative space-y-0">
              {/* Timeline line */}
              <div className="absolute bottom-0 left-[15px] top-0 w-px bg-th-border" />

              {releases.map((entry, idx) => {
                const isOpen = openVersions.has(entry.version)
                const isCurrent = idx === 0

                return (
                  <div key={entry.version} className="relative pl-10">
                    {/* Timeline dot */}
                    <div
                      className={`absolute left-[10px] top-3.5 h-3 w-3 rounded-full border-2 ${
                        isCurrent
                          ? 'border-th-accent bg-th-accent'
                          : 'border-th-border bg-surface-card'
                      }`}
                    />

                    <button
                      onClick={() => toggleVersion(entry.version)}
                      className="group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-th-bg-secondary"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`font-mono text-sm font-semibold ${
                            isCurrent ? 'text-th-accent-text' : 'text-th-text'
                          }`}
                        >
                          v{entry.version}
                        </span>
                        {isCurrent && (
                          <span className="rounded-full bg-th-accent/15 px-2 py-0.5 text-[10px] font-semibold text-th-accent-text">
                            Latest
                          </span>
                        )}
                        <span className="text-xs text-th-text-muted">
                          {new Date(entry.released_at).toLocaleDateString()}
                        </span>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-th-text-muted transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="mb-2 ml-3 rounded-lg border border-th-border bg-th-bg-secondary px-4 py-3">
                        <ul className="space-y-1.5">
                          {entry.changes.map((change, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-sm text-th-text-secondary"
                            >
                              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-th-text-muted" />
                              {change}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
