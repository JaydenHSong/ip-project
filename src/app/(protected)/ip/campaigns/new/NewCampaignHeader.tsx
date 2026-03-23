'use client'

import { useI18n } from '@/lib/i18n/context'

export const NewCampaignHeader = () => {
  const { t } = useI18n()
  return <h1 className="text-2xl font-bold text-th-text">{t('campaigns.form.newTitle')}</h1>
}

export const NewCampaignDescription = () => {
  const { t } = useI18n()
  return <p className="text-sm text-th-text-secondary">{t('campaigns.form.description')}</p>
}
