'use client'

import { useState } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { MonitoringSettings } from './MonitoringSettings'
import { ScAutomationSettings } from './ScAutomationSettings'
import { AutoApproveSettings } from './AutoApproveSettings'
import { CrawlerSettings } from './CrawlerSettings'
import { TemplatesTab } from './TemplatesTab'
import { ExtensionGuide } from './ExtensionGuide'
import { UserManagement } from './UserManagement'
import { SystemStatusTab } from './SystemStatusTab'
import { NoticesTab } from './NoticesTab'

type SettingsContentProps = {
  isOwner: boolean
  isAdmin: boolean
  isEditor: boolean
  currentUserId: string
}

// viewer/viewer+/editor: extension only
// admin: + monitoring, crawler, sc-automation, auto-approve, templates, notices
// owner: + users, system-status
const VIEWER_TABS = ['extension'] as const
const EDITOR_TABS = ['extension'] as const
const ADMIN_TABS = ['monitoring', 'extension', 'crawler', 'sc-automation', 'auto-approve', 'templates', 'notices'] as const
const OWNER_TABS = ['monitoring', 'extension', 'crawler', 'sc-automation', 'auto-approve', 'templates', 'notices', 'users', 'system-status'] as const

type SettingsTab = 'monitoring' | 'extension' | 'crawler' | 'sc-automation' | 'auto-approve' | 'templates' | 'notices' | 'users' | 'system-status'

export const SettingsContent = ({ isOwner, isAdmin, isEditor, currentUserId }: SettingsContentProps) => {
  const { t } = useI18n()
  const defaultTab: SettingsTab = isEditor ? 'monitoring' : 'extension'
  const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab)

  const tabs = isOwner ? OWNER_TABS : isAdmin ? ADMIN_TABS : isEditor ? EDITOR_TABS : VIEWER_TABS

  const tabLabel = (tab: SettingsTab): string => {
    switch (tab) {
      case 'monitoring': return t('settings.monitoring.title')
      case 'extension': return t('settings.extension.title' as Parameters<typeof t>[0])
      case 'crawler': return t('settings.crawler.title' as Parameters<typeof t>[0])
      case 'sc-automation': return t('settings.scAutomation.title' as Parameters<typeof t>[0])
      case 'auto-approve': return t('settings.autoApprove.title' as Parameters<typeof t>[0])
      case 'templates': return 'Templates'
      case 'notices': return t('settings.notices.title' as Parameters<typeof t>[0])
      case 'system-status': return t('settings.systemStatus.title' as Parameters<typeof t>[0])
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
      {activeTab === 'notices' && isAdmin && <NoticesTab />}
      {activeTab === 'users' && isOwner && (
        <UserManagement currentUserId={currentUserId} />
      )}
      {activeTab === 'system-status' && isOwner && <SystemStatusTab />}
    </div>
  )
}
