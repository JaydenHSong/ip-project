'use client'

import { getBrFormTypeLabel } from '@/constants/br-form-types'

// V코드 → BR form type 라벨 변환 (레거시 데이터 호환)
const VCODE_TO_LABEL: Record<string, string> = {
  V01: 'Trademark Infringement',
  V02: 'Copyright Infringement',
  V03: 'Design Patent Infringement',
  V04: 'Counterfeit Product',
  V05: 'False Advertising',
  V06: 'Prohibited Keywords',
  V07: 'Inaccurate Product Info',
  V08: 'Image Policy Violation',
  V09: 'Comparative Advertising',
  V10: 'Variation Policy Violation',
  V11: 'Review Manipulation',
  V12: 'Review Hijacking',
  V13: 'Price Manipulation',
  V14: 'Resale Violation',
  V15: 'Bundling Violation',
  V16: 'Missing Certification',
  V17: 'Safety Standards Failure',
  V18: 'Missing Warning Label',
  V19: 'Import Regulation Violation',
}

const getViolationLabel = (code: string | null): string => {
  if (!code) return 'Unknown'
  return VCODE_TO_LABEL[code] ?? getBrFormTypeLabel(code)
}

type AiEvidence = {
  type: string
  location: string
  description: string
}

type AiAnalysis = {
  violation_detected: boolean
  confidence: number
  reasons: string[]
  evidence: AiEvidence[]
}

type AiAnalysisTabProps = {
  aiAnalysis: AiAnalysis | null
  aiViolationType: string | null
  aiSeverity: string | null
  aiConfidenceScore: number | null
  userViolationType: string
  disagreementFlag: boolean
  policyReferences: string[]
}

const SeverityBadge = ({ severity }: { severity: string | null }) => {
  if (!severity) return null
  const colors = {
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-green-500/20 text-green-400 border-green-500/30',
  }
  const color = colors[severity as keyof typeof colors] ?? colors.medium

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded border ${color} uppercase`}>
      {severity}
    </span>
  )
}

const ConfidenceBar = ({ score }: { score: number }) => {
  const color = score >= 80 ? 'bg-red-500' : score >= 50 ? 'bg-yellow-500' : 'bg-green-500'

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-th-bg-subtle rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-sm font-mono font-medium text-th-text">{score}%</span>
    </div>
  )
}

export const AiAnalysisTab = ({
  aiAnalysis,
  aiViolationType,
  aiSeverity,
  aiConfidenceScore,
  userViolationType,
  disagreementFlag,
  policyReferences,
}: AiAnalysisTabProps) => {
  if (!aiAnalysis && !aiViolationType) {
    return (
      <div className="p-6 text-center text-th-text-muted">
        <p className="text-lg mb-1">No AI Analysis</p>
        <p className="text-sm">AI analysis has not been run for this report yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header: Violation + Confidence + Severity */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-th-text-muted uppercase tracking-wider">
            AI Analysis Results
          </h3>
          <SeverityBadge severity={aiSeverity} />
        </div>

        {aiViolationType && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-th-text">
              {getViolationLabel(aiViolationType)}
            </span>
          </div>
        )}

        {aiConfidenceScore !== null && (
          <div>
            <p className="text-xs text-th-text-muted mb-1">AI Confidence</p>
            <ConfidenceBar score={aiConfidenceScore} />
          </div>
        )}
      </div>

      {/* Disagreement Alert */}
      {disagreementFlag && (
        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <p className="text-sm font-medium text-yellow-400 mb-2">Opinion Disagreement</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-th-text-muted text-xs">User</p>
              <p className="text-th-text">{getViolationLabel(userViolationType)}</p>
            </div>
            <div>
              <p className="text-th-text-muted text-xs">AI</p>
              <p className="text-th-accent">{getViolationLabel(aiViolationType)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Summary */}
      {aiAnalysis?.reasons && aiAnalysis.reasons.length > 0 && (
        <div>
          <p className="text-xs text-th-text-muted mb-2 font-semibold uppercase">Reasons</p>
          <ul className="space-y-1">
            {aiAnalysis.reasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-th-text-secondary">
                <span className="text-th-accent mt-0.5">{'>'}</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Evidence */}
      {aiAnalysis?.evidence && aiAnalysis.evidence.length > 0 && (
        <div>
          <p className="text-xs text-th-text-muted mb-2 font-semibold uppercase">Evidence</p>
          <div className="space-y-2">
            {aiAnalysis.evidence.map((ev, i) => (
              <div key={i} className="p-2 rounded bg-th-bg-subtle text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-1.5 py-0.5 text-xs rounded font-mono ${
                    ev.type === 'image' ? 'bg-purple-500/20 text-purple-400'
                    : ev.type === 'keyword' ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {ev.type}
                  </span>
                  {ev.location && (
                    <span className="text-xs text-th-text-muted">{ev.location}</span>
                  )}
                </div>
                <p className="text-th-text-secondary">{ev.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Policy References */}
      {policyReferences.length > 0 && (
        <div>
          <p className="text-xs text-th-text-muted mb-2 font-semibold uppercase">Policy References</p>
          <ul className="space-y-1">
            {policyReferences.map((ref, i) => (
              <li key={i} className="text-sm text-th-text-secondary flex items-start gap-2">
                <span className="text-th-text-muted">{'#'}{i + 1}</span>
                {ref}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
