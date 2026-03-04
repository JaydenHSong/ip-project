import type { LogEntry } from './types/index.js';
declare const log: (level: LogEntry["level"], module: string, message: string, extra?: Partial<Pick<LogEntry, "campaignId" | "asin" | "error" | "duration">>) => void;
export { log };
//# sourceMappingURL=logger.d.ts.map