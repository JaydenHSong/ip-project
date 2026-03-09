import type { BrCaseStatus, SlaStatus, BrSlaConfig } from '@/types/br-case'

type CalculateSlaDeadlineParams = {
  baseTime: Date
  expectedResponseHours: number
}

/**
 * SLA deadline 계산 — baseTime + expectedResponseHours
 */
export const calculateSlaDeadline = ({
  baseTime,
  expectedResponseHours,
}: CalculateSlaDeadlineParams): Date => {
  const deadline = new Date(baseTime.getTime())
  deadline.setHours(deadline.getHours() + expectedResponseHours)
  return deadline
}

type GetSlaStatusParams = {
  deadline: Date | string | null
  brCaseStatus: BrCaseStatus | null
  expectedResponseHours: number
  warningThresholdHours: number
}

/**
 * 현재 SLA 상태 판단
 * - paused: 아마존 대기 중 (우리 행동 불필요)
 * - on_track: 기한 내 (경고 임계 전)
 * - warning: 경고 임계 도달
 * - breached: 기한 초과
 */
export const getSlaStatus = ({
  deadline,
  brCaseStatus,
  expectedResponseHours,
  warningThresholdHours,
}: GetSlaStatusParams): SlaStatus => {
  // 아마존이 대기 중인 상태 → paused
  const awaitingAmazonStatuses: BrCaseStatus[] = ['open', 'work_in_progress', 'answered']
  if (brCaseStatus && awaitingAmazonStatuses.includes(brCaseStatus)) {
    return 'paused'
  }

  if (!deadline) {
    return 'on_track'
  }

  const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline
  const now = new Date()
  const remainingMs = deadlineDate.getTime() - now.getTime()
  const remainingHours = remainingMs / (1000 * 60 * 60)

  if (remainingHours <= 0) {
    return 'breached'
  }

  // warningThresholdHours = 경과 기준 (예: 48h, 96h)
  // 남은 시간이 (expected - warning) 이하면 경고
  const warningRemainingHours = expectedResponseHours - warningThresholdHours
  if (remainingHours <= warningRemainingHours) {
    return 'warning'
  }

  return 'on_track'
}

/**
 * 남은 시간을 사람이 읽을 수 있는 형태로 변환
 */
export const formatSlaRemaining = (deadline: Date | string | null): string => {
  if (!deadline) return '-'

  const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline
  const now = new Date()
  const diffMs = deadlineDate.getTime() - now.getTime()

  if (diffMs <= 0) {
    const overMs = Math.abs(diffMs)
    const overHours = Math.floor(overMs / (1000 * 60 * 60))
    const overDays = Math.floor(overHours / 24)
    const overRemainingHours = overHours % 24
    if (overDays > 0) return `${overDays}d ${overRemainingHours}h overdue`
    if (overHours > 0) return `${overHours}h overdue`
    const overMins = Math.floor(overMs / (1000 * 60))
    return `${overMins}m overdue`
  }

  const totalMins = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(totalMins / 60)
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  const remainingMins = totalMins % 60

  if (days > 0) return `${days}d ${remainingHours}h`
  if (hours > 0) return `${hours}h ${remainingMins}m`
  return `${remainingMins}m`
}

/**
 * violation_category로 SLA config 찾기
 */
export const findSlaConfig = (
  configs: BrSlaConfig[],
  violationCategory: string,
): BrSlaConfig | undefined => {
  return configs.find((c) => c.violation_category === violationCategory)
}
