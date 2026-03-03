'use client'

import { useState } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { MonitoringSettings } from './MonitoringSettings'
import { ScAutomationSettings } from './ScAutomationSettings'
import { TemplatesTab } from './TemplatesTab'
import { UserManagement } from './UserManagement'

type SettingsContentProps = {
  isAdmin: boolean
  currentUserId: string
}

const BASE_TABS = ['monitoring', 'templates'] as const
const ADMIN_TABS = ['monitoring', 'sc-automation', 'templates', 'users'] as const
type SettingsTab = 'monitoring' | 'sc-automation' | 'templates' | 'users'

export const SettingsContent = ({ isAdmin, currentUserId }: SettingsContentProps) => {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<SettingsTab>('monitoring')

  const tabs = isAdmin ? ADMIN_TABS : BASE_TABS

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-th-text">{t('nav.settings')}</h1>

      <div className="flex gap-1 border-b border-th-border">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-th-accent text-th-accent'
                : 'text-th-text-muted hover:text-th-text-secondary'
            }`}
          >
            {tab === 'monitoring'
              ? t('settings.monitoring.title')
              : tab === 'sc-automation'
                ? t('settings.scAutomation.title' as Parameters<typeof t>[0])
                : tab === 'templates'
                  ? 'Templates'
                  : t('settings.users.title')}
          </button>
        ))}
      </div>

      {activeTab === 'monitoring' && <MonitoringSettings isAdmin={isAdmin} />}
      {activeTab === 'sc-automation' && <ScAutomationSettings isAdmin={isAdmin} />}
      {activeTab === 'templates' && <TemplatesTab />}
      {activeTab === 'users' && isAdmin && (
        <UserManagement currentUserId={currentUserId} />
      )}
    </div>
  )
}
