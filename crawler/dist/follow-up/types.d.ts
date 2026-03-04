export type RevisitTarget = {
    report_id: string;
    listing_id: string;
    asin: string;
    marketplace: string;
    monitoring_started_at: string;
    last_snapshot_at: string | null;
    snapshot_count: number;
};
export type RevisitResult = {
    report_id: string;
    screenshot_url: string | null;
    listing_data: Record<string, unknown>;
    crawled_at: string;
    listing_removed: boolean;
};
export type PendingResponse = {
    reports: RevisitTarget[];
};
export type CallbackResponse = {
    snapshot_id: string;
    change_detected: boolean;
    ai_resolution_suggestion: 'resolved' | 'unresolved' | 'continue';
};
//# sourceMappingURL=types.d.ts.map