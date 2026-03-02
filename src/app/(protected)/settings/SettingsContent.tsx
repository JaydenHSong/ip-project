'use client'

import { useI18n } from '@/lib/i18n/context'
import { MonitoringSettings } from './MonitoringSettings'

type SettingsContentProps = {
  isAdmin: boolean
}

export const SettingsContent = ({ isAdmin }: SettingsContentProps) => {
  const { t } = useI18n()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-th-text">{t('nav.settings')}</h1>
      <MonitoringSettings isAdmin={isAdmin} />
    </div>
  )
}
