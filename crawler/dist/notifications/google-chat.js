import { log } from '../logger.js';
// Google Chat Webhook 알림 전송
const createChatNotifier = (webhookUrl) => {
    const send = async (text) => {
        if (!webhookUrl)
            return;
        try {
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=UTF-8' },
                body: JSON.stringify({ text }),
            });
        }
        catch (error) {
            log('warn', 'google-chat', 'Failed to send notification', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    };
    const formatDuration = (ms) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        if (minutes > 0) {
            return `${minutes}분 ${remainingSeconds}초`;
        }
        return `${seconds}초`;
    };
    return {
        notifyCrawlComplete: async (campaignKeyword, result) => {
            const text = [
                `✅ *[Sentinel Crawler]* "${campaignKeyword}" 캠페인 완료`,
                `수집: ${result.totalFound}건 | 전송: ${result.totalSent}건 | 중복: ${result.duplicates}건 | 에러: ${result.errors}건`,
                `소요: ${formatDuration(result.duration)}`,
            ].join('\n');
            await send(text);
        },
        notifyCrawlFailed: async (campaignKeyword, error) => {
            const text = [
                `❌ *[Sentinel Crawler]* "${campaignKeyword}" 캠페인 실패`,
                `원인: ${error}`,
            ].join('\n');
            await send(text);
        },
        notifyMessage: async (text) => {
            await send(text);
        },
    };
};
export { createChatNotifier };
//# sourceMappingURL=google-chat.js.map