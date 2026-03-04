'use client'

import { useState } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

const EXTENSION_VERSION = '1.0.0'
const DOWNLOAD_PATH = `/downloads/sentinel-extension-v${EXTENSION_VERSION}.zip`
const TOTAL_STEPS = 4

const STEP_ICONS = ['1', '2', '3', '4'] as const

export const ExtensionGuide = () => {
  const { t } = useI18n()
  const [currentStep, setCurrentStep] = useState(0)

  const webStoreUrl = process.env.NEXT_PUBLIC_EXTENSION_STORE_URL ?? null

  const stepKeys = ['download', 'extract', 'load', 'verify'] as const

  const handlePrev = () => setCurrentStep((s) => Math.max(0, s - 1))
  const handleNext = () => setCurrentStep((s) => Math.min(TOTAL_STEPS - 1, s + 1))

  return (
    <div className="space-y-6">
      {/* Web Store Section */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-th-text">
            {t('settings.extension.install.webStore.title' as Parameters<typeof t>[0])}
          </h3>
        </CardHeader>
        <CardContent>
          {webStoreUrl ? (
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <svg className="h-6 w-6 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" opacity="0.2" />
                  <circle cx="12" cy="12" r="4" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-th-text-secondary">
                  {t('settings.extension.install.webStore.description' as Parameters<typeof t>[0])}
                </p>
              </div>
              <a href={webStoreUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="primary" size="sm">
                  {t('settings.extension.install.webStore.button' as Parameters<typeof t>[0])}
                </Button>
              </a>
            </div>
          ) : (
            <p className="text-sm text-th-text-muted">
              {t('settings.extension.install.webStore.comingSoon' as Parameters<typeof t>[0])}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Manual Install - Step Wizard */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-th-text">
            {t('settings.extension.install.manual.title' as Parameters<typeof t>[0])}
          </h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2">
              {stepKeys.map((key, i) => (
                <div key={key} className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentStep(i)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                      i === currentStep
                        ? 'bg-th-accent text-white'
                        : i < currentStep
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-th-bg-secondary text-th-text-muted'
                    }`}
                  >
                    {i < currentStep ? '✓' : STEP_ICONS[i]}
                  </button>
                  {i < TOTAL_STEPS - 1 && (
                    <div className={`h-0.5 w-8 ${i < currentStep ? 'bg-green-500/40' : 'bg-th-border'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step Content */}
            <div className="rounded-lg border border-th-border bg-th-bg-secondary p-5">
              {/* Step 1: Download */}
              {currentStep === 0 && (
                <div className="space-y-4">
                  <h4 className="text-base font-semibold text-th-text">
                    {t('settings.extension.install.manual.steps.download.title' as Parameters<typeof t>[0])}
                  </h4>
                  <p className="text-sm text-th-text-secondary">
                    {t('settings.extension.install.manual.steps.download.description' as Parameters<typeof t>[0])}
                  </p>
                  <a href={DOWNLOAD_PATH} download>
                    <Button variant="primary" size="sm">
                      {t('settings.extension.install.manual.steps.download.button' as Parameters<typeof t>[0])}
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
                  <h4 className="text-base font-semibold text-th-text">
                    {t('settings.extension.install.manual.steps.extract.title' as Parameters<typeof t>[0])}
                  </h4>
                  <p className="text-sm text-th-text-secondary">
                    {t('settings.extension.install.manual.steps.extract.description' as Parameters<typeof t>[0])}
                  </p>
                  <div className="rounded-md bg-th-bg p-3 font-mono text-xs text-th-text-secondary">
                    <div className="space-y-1">
                      <div>📁 Downloads/</div>
                      <div className="pl-4">└─ 📁 sentinel-extension/</div>
                      <div className="pl-8">├─ manifest.json</div>
                      <div className="pl-8">├─ background.js</div>
                      <div className="pl-8">├─ content.js</div>
                      <div className="pl-8">└─ popup.html</div>
                    </div>
                  </div>
                  <p className="text-xs text-th-accent">
                    💡 {t('settings.extension.install.manual.steps.extract.tip' as Parameters<typeof t>[0])}
                  </p>
                </div>
              )}

              {/* Step 3: Load in Chrome */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <h4 className="text-base font-semibold text-th-text">
                    {t('settings.extension.install.manual.steps.load.title' as Parameters<typeof t>[0])}
                  </h4>
                  <ol className="space-y-3 text-sm text-th-text-secondary">
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-th-accent/20 text-xs font-bold text-th-accent">1</span>
                      <div>
                        <p>{t('settings.extension.install.manual.steps.load.step1' as Parameters<typeof t>[0])}</p>
                        <a
                          href="chrome://extensions"
                          className="mt-1 inline-block text-xs text-th-accent hover:underline"
                          onClick={(e) => {
                            e.preventDefault()
                            navigator.clipboard.writeText('chrome://extensions')
                          }}
                        >
                          📋 chrome://extensions
                        </a>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-th-accent/20 text-xs font-bold text-th-accent">2</span>
                      <div>
                        <p>{t('settings.extension.install.manual.steps.load.step2' as Parameters<typeof t>[0])}</p>
                        <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-th-border px-3 py-1 text-xs">
                          <span className="text-th-text-muted">Developer mode</span>
                          <span className="h-4 w-8 rounded-full bg-th-accent" />
                        </div>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-th-accent/20 text-xs font-bold text-th-accent">3</span>
                      <p>{t('settings.extension.install.manual.steps.load.step3' as Parameters<typeof t>[0])}</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-th-accent/20 text-xs font-bold text-th-accent">4</span>
                      <p>{t('settings.extension.install.manual.steps.load.step4' as Parameters<typeof t>[0])}</p>
                    </li>
                  </ol>
                </div>
              )}

              {/* Step 4: Verify */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <h4 className="text-base font-semibold text-th-text">
                    {t('settings.extension.install.manual.steps.verify.title' as Parameters<typeof t>[0])}
                  </h4>
                  <ul className="space-y-2 text-sm text-th-text-secondary">
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">✅</span>
                      {t('settings.extension.install.manual.steps.verify.check1' as Parameters<typeof t>[0])}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">✅</span>
                      {t('settings.extension.install.manual.steps.verify.check2' as Parameters<typeof t>[0])}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">✅</span>
                      {t('settings.extension.install.manual.steps.verify.check3' as Parameters<typeof t>[0])}
                    </li>
                  </ul>
                  <div className="rounded-md bg-green-500/10 p-3 text-center text-sm font-medium text-green-400">
                    🎉 {t('settings.extension.install.manual.steps.verify.success' as Parameters<typeof t>[0])}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-th-text-muted">
                      {t('settings.extension.install.manual.steps.verify.troubleshoot' as Parameters<typeof t>[0])}
                    </p>
                    <ul className="space-y-0.5 text-xs text-th-text-muted">
                      <li>→ {t('settings.extension.install.manual.steps.verify.tip1' as Parameters<typeof t>[0])}</li>
                      <li>→ {t('settings.extension.install.manual.steps.verify.tip2' as Parameters<typeof t>[0])}</li>
                      <li>→ {t('settings.extension.install.manual.steps.verify.tip3' as Parameters<typeof t>[0])}</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="mt-5 flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                >
                  ← {t('settings.extension.install.manual.back' as Parameters<typeof t>[0])}
                </Button>
                {currentStep < TOTAL_STEPS - 1 ? (
                  <Button variant="outline" size="sm" onClick={handleNext}>
                    {t('settings.extension.install.manual.next' as Parameters<typeof t>[0])} →
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => setCurrentStep(0)}>
                    {t('settings.extension.install.manual.done' as Parameters<typeof t>[0])} ✓
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Extension Info */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-th-text">
            {t('settings.extension.info.title' as Parameters<typeof t>[0])}
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-th-text-muted">{t('settings.extension.info.version' as Parameters<typeof t>[0])}</span>
              <p className="font-mono text-th-text">{EXTENSION_VERSION}</p>
            </div>
            <div>
              <span className="text-th-text-muted">{t('settings.extension.info.manifest' as Parameters<typeof t>[0])}</span>
              <p className="text-th-text">V3</p>
            </div>
            <div>
              <span className="text-th-text-muted">{t('settings.extension.info.permissions' as Parameters<typeof t>[0])}</span>
              <p className="text-th-text">{t('settings.extension.info.permissionsDesc' as Parameters<typeof t>[0])}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
