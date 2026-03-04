import type { CrawlResult } from '../types/index.js';
type ChatNotifier = {
    notifyCrawlComplete: (campaignKeyword: string, result: CrawlResult) => Promise<void>;
    notifyCrawlFailed: (campaignKeyword: string, error: string) => Promise<void>;
    notifyMessage: (text: string) => Promise<void>;
};
declare const createChatNotifier: (webhookUrl: string | null) => ChatNotifier;
export { createChatNotifier };
export type { ChatNotifier };
//# sourceMappingURL=google-chat.d.ts.map