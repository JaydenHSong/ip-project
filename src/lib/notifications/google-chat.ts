// Google Chat Webhook 알림 (Web API에서 사용)
// MS1: Extension 제보 접수 알림
// MS2: AI 드래프트 생성 → Admin 검토 필요 알림

const sendGoogleChatMessage = async (text: string): Promise<void> => {
  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL
  if (!webhookUrl) return

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ text }),
    })
  } catch {
    // 알림 실패는 메인 로직에 영향 주지 않음
  }
}

// 새 리스팅 제보 접수 알림
const notifyNewSubmission = async (asin: string, title: string, source: string): Promise<void> => {
  const text = [
    `📋 *[A.R.C.]* 새 리스팅 접수 (${source})`,
    `ASIN: ${asin} — "${title.slice(0, 60)}${title.length > 60 ? '...' : ''}"`,
  ].join('\n')
  await sendGoogleChatMessage(text)
}

// 드래프트 검토 필요 알림 (MS2)
const notifyDraftReady = async (
  reportId: string,
  asin: string,
  violationType: string,
): Promise<void> => {
  const text = [
    `🔔 *[A.R.C.]* 신고서 검토 필요`,
    `Report: ${reportId} | ASIN: ${asin} | 위반: ${violationType}`,
    `→ 검토/승인이 필요합니다.`,
  ].join('\n')
  await sendGoogleChatMessage(text)
}

// 신고서 승인 알림
const notifyApproved = async (
  reportId: string,
  asin: string,
  reportNumber?: number,
): Promise<void> => {
  const label = reportNumber ? `#${String(reportNumber).padStart(5, '0')}` : reportId.slice(0, 8)
  const text = [
    `✅ *[A.R.C.]* 신고서 승인됨`,
    `Report: ${label} | ASIN: ${asin}`,
    `→ BR 제출 큐에 등록되었습니다.`,
  ].join('\n')
  await sendGoogleChatMessage(text)
}

// 신고서 반려 알림 (MS2)
const notifyRejected = async (
  reportId: string,
  asin: string,
  reason: string,
): Promise<void> => {
  const text = [
    `❌ *[A.R.C.]* 신고서 반려됨`,
    `Report: ${reportId} | ASIN: ${asin}`,
    `사유: ${reason.slice(0, 100)}${reason.length > 100 ? '...' : ''}`,
  ].join('\n')
  await sendGoogleChatMessage(text)
}

// PD 접수 알림 (MS2)
const notifySubmittedToPD = async (
  reportId: string,
  asin: string,
): Promise<void> => {
  const text = [
    `📮 *[A.R.C.]* PD Report 접수됨`,
    `Report: ${reportId} | ASIN: ${asin}`,
    `→ Product Detail 페이지에서 신고가 접수되었습니다.`,
  ].join('\n')
  await sendGoogleChatMessage(text)
}

// SC 자동 제출 실패 알림
const notifyPdFailed = async (
  reportId: string,
  error: string,
  extra?: { reportNumber?: number; asin?: string },
): Promise<void> => {
  const label = extra?.reportNumber ? `#${String(extra.reportNumber).padStart(5, '0')}` : reportId.slice(0, 8)
  const asinInfo = extra?.asin ? ` | ASIN: ${extra.asin}` : ''
  const text = [
    `🚨 *[A.R.C.]* SC 자동 제출 실패 (3회 초과)`,
    `Report: ${label}${asinInfo}`,
    `오류: ${error.slice(0, 150)}${error.length > 150 ? '...' : ''}`,
    `→ 수동 재시도가 필요합니다.`,
  ].join('\n')
  await sendGoogleChatMessage(text)
}

// BR 제출/케이스 연동 확인 필요 알림
const notifyBrFailed = async (
  reportId: string,
  error: string,
  extra?: { reportNumber?: number; asin?: string },
): Promise<void> => {
  const label = extra?.reportNumber ? `#${String(extra.reportNumber).padStart(5, '0')}` : reportId.slice(0, 8)
  const asinInfo = extra?.asin ? ` | ASIN: ${extra.asin}` : ''
  const text = [
    `🚨 *[A.R.C.]* BR 자동 제출 확인 필요`,
    `Report: ${label}${asinInfo}`,
    `오류: ${error.slice(0, 150)}${error.length > 150 ? '...' : ''}`,
    `→ BR 케이스 상태를 확인해 주세요.`,
  ].join('\n')
  await sendGoogleChatMessage(text)
}

// 재제출 max 초과 알림
const notifyResubmitMaxExceeded = async (
  reportId: string,
  asin: string,
  count: number,
): Promise<void> => {
  const text = [
    `⚠️ *[A.R.C.]* 재제출 최대 횟수 도달`,
    `Report: ${reportId} | ASIN: ${asin} | 재제출: ${count}회`,
    `→ 수동 확인이 필요합니다.`,
  ].join('\n')
  await sendGoogleChatMessage(text)
}

export {
  sendGoogleChatMessage,
  notifyNewSubmission,
  notifyDraftReady,
  notifyApproved,
  notifyRejected,
  notifySubmittedToPD,
  notifyPdFailed,
  notifyBrFailed,
  notifyResubmitMaxExceeded,
}
