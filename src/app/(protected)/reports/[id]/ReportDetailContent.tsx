'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n/context'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ViolationBadge } from '@/components/ui/ViolationBadge'
import type { ViolationCode } from '@/constants/violations'
import type { ReportStatus } from '@/types/reports'

type ReportDetailContentProps = {
  report: {
    id: string
    status: string
    user_violation_type: string
    ai_violation_type: string | null
    ai_confidence_score: number | null
    confirmed_violation_type: string | null
    disagreement_flag: boolean
    draft_title: string | null
    draft_body: string | null
    rejection_reason: string | null
    sc_case_id: string | null
    created_at: string
    approved_at: string | null
    rejected_at: string | null
  }
  listing: {
    asin: string
    title: string
    marketplace: string
    seller_name: string | null
  } | null
  creatorName: string | null
}

export const ReportDetailContent = ({ report, listing, creatorName }: ReportDetailContentProps) => {
  const { t } = useI18n()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/reports" className="text-th-text-muted hover:text-th-text-secondary">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-th-text">{t('reports.detail.title')}</h1>
        <StatusBadge status={report.status as ReportStatus} type="report" />
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-th-text">{t('reports.detail.violationInfo')}</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-th-text-tertiary">{t('reports.detail.userViolationType')}</p>
              <div className="mt-1">
                <ViolationBadge code={report.user_violation_type as ViolationCode} />
              </div>
            </div>
            {report.ai_violation_type && (
              <div>
                <p className="text-sm text-th-text-tertiary">{t('reports.detail.aiViolationType')}</p>
                <div className="mt-1 flex items-center gap-2">
                  <ViolationBadge code={report.ai_violation_type as ViolationCode} />
                  {report.ai_confidence_score !== null && (
                    <span className="text-sm text-th-text-muted">{report.ai_confidence_score}%</span>
                  )}
                </div>
              </div>
            )}
          </div>
          {report.disagreement_flag && (
            <div className="rounded-lg border border-st-warning-text/30 bg-st-warning-bg px-4 py-3">
              <p className="text-sm font-medium text-st-warning-text">
                {t('reports.detail.disagreementWarning')}
              </p>
            </div>
          )}
          {report.confirmed_violation_type && (
            <div>
              <p className="text-sm text-th-text-tertiary">{t('reports.detail.confirmedViolationType')}</p>
              <div className="mt-1">
                <ViolationBadge code={report.confirmed_violation_type as ViolationCode} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {listing && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-th-text">{t('reports.detail.listing')}</h2>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-th-text-tertiary">ASIN</dt>
                <dd className="mt-1 text-sm font-medium text-th-text">{listing.asin}</dd>
              </div>
              <div>
                <dt className="text-sm text-th-text-tertiary">{t('reports.detail.marketplace')}</dt>
                <dd className="mt-1 text-sm font-medium text-th-text">{listing.marketplace}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-sm text-th-text-tertiary">{t('reports.title')}</dt>
                <dd className="mt-1 text-sm font-medium text-th-text">{listing.title}</dd>
              </div>
              {listing.seller_name && (
                <div>
                  <dt className="text-sm text-th-text-tertiary">{t('reports.seller')}</dt>
                  <dd className="mt-1 text-sm font-medium text-th-text">{listing.seller_name}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}

      {report.draft_title && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-th-text">{t('reports.detail.reportDraft')}</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-th-text-tertiary">{t('reports.detail.draftTitle')}</p>
              <p className="mt-1 text-sm font-medium text-th-text">{report.draft_title}</p>
            </div>
            {report.draft_body && (
              <div>
                <p className="text-sm text-th-text-tertiary">{t('reports.detail.draftBody')}</p>
                <div className="mt-1 rounded-lg bg-th-bg-tertiary p-4 text-sm text-th-text-secondary whitespace-pre-wrap">
                  {report.draft_body}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-th-text">{t('reports.detail.reportHistory')}</h2>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-th-text-tertiary">{t('reports.detail.createdBy')}</dt>
              <dd className="mt-1 text-sm font-medium text-th-text">{creatorName ?? t('reports.detail.unknown')}</dd>
            </div>
            <div>
              <dt className="text-sm text-th-text-tertiary">{t('reports.detail.createdAt')}</dt>
              <dd className="mt-1 text-sm font-medium text-th-text">
                {new Date(report.created_at).toLocaleString()}
              </dd>
            </div>
            {report.approved_at && (
              <div>
                <dt className="text-sm text-th-text-tertiary">{t('reports.detail.approvedAt')}</dt>
                <dd className="mt-1 text-sm font-medium text-th-text">
                  {new Date(report.approved_at).toLocaleString()}
                </dd>
              </div>
            )}
            {report.rejected_at && (
              <>
                <div>
                  <dt className="text-sm text-th-text-tertiary">{t('reports.detail.rejectedAt')}</dt>
                  <dd className="mt-1 text-sm font-medium text-th-text">
                    {new Date(report.rejected_at).toLocaleString()}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-sm text-th-text-tertiary">{t('reports.detail.rejectionReason')}</dt>
                  <dd className="mt-1 text-sm text-st-danger-text">{report.rejection_reason}</dd>
                </div>
              </>
            )}
            {report.sc_case_id && (
              <div>
                <dt className="text-sm text-th-text-tertiary">{t('reports.detail.scCaseId')}</dt>
                <dd className="mt-1 text-sm font-medium text-th-text">{report.sc_case_id}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
