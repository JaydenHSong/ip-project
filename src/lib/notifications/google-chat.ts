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
    `📋 *[Sentinel]* 새 리스팅 접수 (${source})`,
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
    `🔔 *[Sentinel]* 신고서 검토 필요`,
    `Report: ${reportId} | ASIN: ${asin} | 위반: ${violationType}`,
    `→ 검토/승인이 필요합니다.`,
  ].join('\n')
  await sendGoogleChatMessage(text)
}

// 신고서 승인 알림 (MS2)
const notifyApproved = async (
  reportId: string,
  asin: string,
): Promise<void> => {
  const text = [
    `✅ *[Sentinel]* 신고서 승인됨`,
    `Report: ${reportId} | ASIN: ${asin}`,
    `→ PD Reporting 제출이 가능합니다.`,
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
    `❌ *[Sentinel]* 신고서 반려됨`,
    `Report: ${reportId} | ASIN: ${asin}`,
    `사유: ${reason.slice(0, 100)}${reason.length > 100 ? '...' : ''}`,
  ].join('\n')
  await sendGoogleChatMessage(text)
}

// SC 접수 알림 (MS2)
const notifySubmittedToSC = async (
  reportId: string,
  asin: string,
): Promise<void> => {
  const text = [
    `📮 *[Sentinel]* PD Report 접수됨`,
    `Report: ${reportId} | ASIN: ${asin}`,
    `→ Product Detail 페이지에서 신고가 접수되었습니다.`,
  ].join('\n')
  await sendGoogleChatMessage(text)
}

// SC 자동 제출 실패 알림
const notifyScFailed = async (
  reportId: string,
  error: string,
): Promise<void> => {
  const text = [
    `🚨 *[Sentinel]* SC 자동 제출 실패 (3회 초과)`,
    `Report: ${reportId}`,
    `오류: ${error.slice(0, 150)}${error.length > 150 ? '...' : ''}`,
    `→ 수동 재시도가 필요합니다.`,
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
    `⚠️ *[Sentinel]* 재제출 최대 횟수 도달`,
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
  notifySubmittedToSC,
  notifyScFailed,
  notifyResubmitMaxExceeded,
}
