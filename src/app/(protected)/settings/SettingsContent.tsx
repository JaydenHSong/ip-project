'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useI18n } from '@/lib/i18n/context'
import { MonitoringSettings } from './MonitoringSettings'
import { ScAutomationSettings } from './ScAutomationSettings'
import { AutoApproveSettings } from './AutoApproveSettings'
import { CrawlerSettings } from './CrawlerSettings'
import { TemplatesTab } from './TemplatesTab'
import { ExtensionGuide } from './ExtensionGuide'
import { UserManagement } from './UserManagement'
import { AiLearningTab } from './AiLearningTab'

type SettingsContentProps = {
  isOwner: boolean
  isAdmin: boolean
  isEditor: boolean
  currentUserId: string
}

// viewer/viewer+/editor: extension only
// admin: + monitoring, crawler, sc-automation, auto-approve, templates
// owner: + users
const VIEWER_TABS = ['extension'] as const
const EDITOR_TABS = ['extension'] as const
const ADMIN_TABS = ['monitoring', 'extension', 'crawler', 'sc-automation', 'auto-approve', 'templates', 'ai-learning'] as const
const OWNER_TABS = ['monitoring', 'extension', 'crawler', 'sc-automation', 'auto-approve', 'templates', 'ai-learning', 'users'] as const

type SettingsTab = 'monitoring' | 'extension' | 'crawler' | 'sc-automation' | 'auto-approve' | 'templates' | 'ai-learning' | 'users'

export const SettingsContent = ({ isOwner, isAdmin, isEditor, currentUserId }: SettingsContentProps) => {
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as SettingsTab | null
  const defaultTab: SettingsTab = tabParam ?? (isEditor ? 'monitoring' : 'extension')
  const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab)

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam)
    }
  }, [tabParam]) // eslint-disable-line react-hooks/exhaustive-deps

  const tabs = isOwner ? OWNER_TABS : isAdmin ? ADMIN_TABS : isEditor ? EDITOR_TABS : VIEWER_TABS

  const tabLabel = (tab: SettingsTab): string => {
    switch (tab) {
      case 'monitoring': return t('settings.monitoring.title')
      case 'extension': return t('settings.extension.title' as Parameters<typeof t>[0])
      case 'crawler': return t('settings.crawler.title' as Parameters<typeof t>[0])
      case 'sc-automation': return t('settings.scAutomation.title' as Parameters<typeof t>[0])
      case 'auto-approve': return t('settings.autoApprove.title' as Parameters<typeof t>[0])
      case 'templates': return 'Templates'
      case 'ai-learning': return t('settings.aiLearning.title' as Parameters<typeof t>[0])
      case 'users': return t('settings.users.title')
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-th-text">{t('nav.settings')}</h1>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-th-border bg-th-bg-secondary p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
              activeTab === tab
                ? 'bg-surface-card text-th-text shadow-sm'
                : 'text-th-text-muted hover:text-th-text-secondary'
            }`}
          >
            {tabLabel(tab)}
          </button>
        ))}
      </div>

      {activeTab === 'monitoring' && <MonitoringSettings isAdmin={isAdmin} />}
      {activeTab === 'extension' && <ExtensionGuide />}
      {activeTab === 'crawler' && <CrawlerSettings isAdmin={isAdmin} />}
      {activeTab === 'sc-automation' && <ScAutomationSettings isAdmin={isAdmin} />}
      {activeTab === 'auto-approve' && <AutoApproveSettings isAdmin={isAdmin} />}
      {activeTab === 'templates' && <TemplatesTab />}
      {activeTab === 'ai-learning' && <AiLearningTab />}
      {activeTab === 'users' && isOwner && (
        <UserManagement currentUserId={currentUserId} />
      )}
    </div>
  )
}
