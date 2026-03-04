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

type SettingsContentProps = {
  isAdmin: boolean
  currentUserId: string
}

const BASE_TABS = ['monitoring', 'extension', 'templates'] as const
const ADMIN_TABS = ['monitoring', 'extension', 'crawler', 'sc-automation', 'auto-approve', 'templates', 'users', 'system-status'] as const
type SettingsTab = 'monitoring' | 'extension' | 'crawler' | 'sc-automation' | 'auto-approve' | 'templates' | 'users' | 'system-status'

export const SettingsContent = ({ isAdmin, currentUserId }: SettingsContentProps) => {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<SettingsTab>('monitoring')

  const tabs = isAdmin ? ADMIN_TABS : BASE_TABS

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-th-text">{t('nav.settings')}</h1>

      <div className="flex gap-1 rounded-xl border border-th-border bg-th-bg-secondary p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
              activeTab === tab
                ? 'bg-surface-card text-th-text shadow-sm'
                : 'text-th-text-muted hover:text-th-text-secondary'
            }`}
          >
            {tab === 'monitoring'
              ? t('settings.monitoring.title')
              : tab === 'extension'
                ? t('settings.extension.title' as Parameters<typeof t>[0])
                : tab === 'crawler'
                  ? t('settings.crawler.title' as Parameters<typeof t>[0])
                  : tab === 'sc-automation'
                    ? t('settings.scAutomation.title' as Parameters<typeof t>[0])
                    : tab === 'auto-approve'
                      ? t('settings.autoApprove.title' as Parameters<typeof t>[0])
                      : tab === 'templates'
                        ? 'Templates'
                        : tab === 'system-status'
                          ? t('settings.systemStatus.title' as Parameters<typeof t>[0])
                          : t('settings.users.title')}
          </button>
        ))}
      </div>

      {activeTab === 'monitoring' && <MonitoringSettings isAdmin={isAdmin} />}
      {activeTab === 'extension' && <ExtensionGuide />}
      {activeTab === 'crawler' && <CrawlerSettings isAdmin={isAdmin} />}
      {activeTab === 'sc-automation' && <ScAutomationSettings isAdmin={isAdmin} />}
      {activeTab === 'auto-approve' && <AutoApproveSettings isAdmin={isAdmin} />}
      {activeTab === 'templates' && <TemplatesTab />}
      {activeTab === 'users' && isAdmin && (
        <UserManagement currentUserId={currentUserId} />
      )}
      {activeTab === 'system-status' && isAdmin && <SystemStatusTab />}
    </div>
  )
}
