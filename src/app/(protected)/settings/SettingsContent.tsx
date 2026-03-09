'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useI18n } from '@/lib/i18n/context'
import {
  Activity, Puzzle, Search, Bot, ShieldCheck, FileText, Brain, Sparkles, Users, ChevronDown, Timer,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { MonitoringSettings } from './MonitoringSettings'
import { ScAutomationSettings } from './ScAutomationSettings'
import { AutoApproveSettings } from './AutoApproveSettings'
import { CrawlerSettings } from './CrawlerSettings'
import { TemplatesTab } from './TemplatesTab'
import { ExtensionGuide } from './ExtensionGuide'
import { UserManagement } from './UserManagement'
import { AiLearningTab } from './AiLearningTab'
import { AiPromptsTab } from './AiPromptsTab'
import { SlaSettings } from './SlaSettings'

type SettingsContentProps = {
  isOwner: boolean
  isAdmin: boolean
  isEditor: boolean
  currentUserId: string
}

type SettingsTab = 'monitoring' | 'extension' | 'crawler' | 'sc-automation' | 'auto-approve' | 'sla' | 'templates' | 'ai-learning' | 'ai-prompts' | 'users'

type NavItem = {
  key: SettingsTab
  icon: React.ComponentType<{ className?: string }>
  minRole: 'viewer' | 'editor' | 'admin' | 'owner'
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'General',
    items: [
      { key: 'monitoring', icon: Activity, minRole: 'admin' },
      { key: 'sla', icon: Timer, minRole: 'admin' },
      { key: 'extension', icon: Puzzle, minRole: 'viewer' },
    ],
  },
  {
    label: 'Automation',
    items: [
      { key: 'crawler', icon: Search, minRole: 'admin' },
      { key: 'sc-automation', icon: Bot, minRole: 'admin' },
      { key: 'auto-approve', icon: ShieldCheck, minRole: 'admin' },
    ],
  },
  {
    label: 'AI & Content',
    items: [
      { key: 'templates', icon: FileText, minRole: 'admin' },
      { key: 'ai-learning', icon: Brain, minRole: 'admin' },
      { key: 'ai-prompts', icon: Sparkles, minRole: 'admin' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { key: 'users', icon: Users, minRole: 'owner' },
    ],
  },
]

const ROLE_LEVEL: Record<string, number> = { viewer: 1, viewer_plus: 2, editor: 3, admin: 4, owner: 5 }

export const SettingsContent = ({ isOwner, isAdmin, isEditor, currentUserId }: SettingsContentProps) => {
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as SettingsTab | null
  const userRole = isOwner ? 'owner' : isAdmin ? 'admin' : isEditor ? 'editor' : 'viewer'
  const userLevel = ROLE_LEVEL[userRole]

  const visibleGroups = NAV_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => userLevel >= ROLE_LEVEL[item.minRole]),
    }))
    .filter((group) => group.items.length > 0)

  const allTabs = visibleGroups.flatMap((g) => g.items.map((i) => i.key))
  const defaultTab: SettingsTab = tabParam && allTabs.includes(tabParam) ? tabParam : allTabs[0]
  const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (tabParam && tabParam !== activeTab && allTabs.includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam]) // eslint-disable-line react-hooks/exhaustive-deps

  const tabLabel = (tab: SettingsTab): string => {
    switch (tab) {
      case 'monitoring': return t('settings.monitoring.title')
      case 'sla': return 'SLA'
      case 'extension': return t('settings.extension.title' as Parameters<typeof t>[0])
      case 'crawler': return t('settings.crawler.title' as Parameters<typeof t>[0])
      case 'sc-automation': return t('settings.scAutomation.title' as Parameters<typeof t>[0])
      case 'auto-approve': return t('settings.autoApprove.title' as Parameters<typeof t>[0])
      case 'templates': return 'Templates'
      case 'ai-learning': return t('settings.aiLearning.title' as Parameters<typeof t>[0])
      case 'ai-prompts': return 'AI Prompts'
      case 'users': return t('settings.users.title')
    }
  }

  const activeItem = visibleGroups.flatMap((g) => g.items).find((i) => i.key === activeTab)
  const ActiveIcon = activeItem?.icon ?? Activity

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-th-text">{t('nav.settings')}</h1>

      {/* Mobile: Dropdown */}
      <div className="relative md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl border border-th-border bg-surface-card px-4 py-3"
        >
          <div className="flex items-center gap-2.5">
            <ActiveIcon className="h-4 w-4 text-th-accent" />
            <span className="text-sm font-medium text-th-text">{tabLabel(activeTab)}</span>
          </div>
          <ChevronDown className={cn('h-4 w-4 text-th-text-muted transition-transform', mobileOpen && 'rotate-180')} />
        </button>
        {mobileOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMobileOpen(false)} />
            <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-th-border bg-surface-card shadow-xl">
              {visibleGroups.map((group) => (
                <div key={group.label}>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-th-text-muted">
                    {group.label}
                  </p>
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const isActive = activeTab === item.key
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => { setActiveTab(item.key); setMobileOpen(false) }}
                        className={cn(
                          'flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition-colors',
                          isActive ? 'bg-th-accent-soft text-th-accent-text' : 'text-th-text-secondary hover:bg-th-bg-hover',
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {tabLabel(item.key)}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Desktop: Side nav + Content */}
      <div className="hidden gap-6 md:flex">
        <nav className="w-52 shrink-0 space-y-4">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-th-text-muted">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = activeTab === item.key
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setActiveTab(item.key)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-th-accent-soft text-th-accent-text'
                          : 'text-th-text-secondary hover:bg-th-bg-hover hover:text-th-text',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {tabLabel(item.key)}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          {activeTab === 'monitoring' && <MonitoringSettings isAdmin={isAdmin} />}
          {activeTab === 'sla' && <SlaSettings isAdmin={isAdmin} />}
          {activeTab === 'extension' && <ExtensionGuide />}
          {activeTab === 'crawler' && <CrawlerSettings isAdmin={isAdmin} />}
          {activeTab === 'sc-automation' && <ScAutomationSettings isAdmin={isAdmin} />}
          {activeTab === 'auto-approve' && <AutoApproveSettings isAdmin={isAdmin} />}
          {activeTab === 'templates' && <TemplatesTab />}
          {activeTab === 'ai-learning' && <AiLearningTab />}
          {activeTab === 'ai-prompts' && <AiPromptsTab />}
          {activeTab === 'users' && isOwner && <UserManagement currentUserId={currentUserId} />}
        </div>
      </div>

      {/* Mobile: Content */}
      <div className="md:hidden">
        {activeTab === 'monitoring' && <MonitoringSettings isAdmin={isAdmin} />}
        {activeTab === 'sla' && <SlaSettings isAdmin={isAdmin} />}
        {activeTab === 'extension' && <ExtensionGuide />}
        {activeTab === 'crawler' && <CrawlerSettings isAdmin={isAdmin} />}
        {activeTab === 'sc-automation' && <ScAutomationSettings isAdmin={isAdmin} />}
        {activeTab === 'auto-approve' && <AutoApproveSettings isAdmin={isAdmin} />}
        {activeTab === 'templates' && <TemplatesTab />}
        {activeTab === 'ai-learning' && <AiLearningTab />}
        {activeTab === 'ai-prompts' && <AiPromptsTab />}
        {activeTab === 'users' && isOwner && <UserManagement currentUserId={currentUserId} />}
      </div>
    </div>
  )
}
