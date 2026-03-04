import { log } from '../logger.js';
// 빈도 → 밀리초 매핑
const FREQUENCY_MS = {
    daily: 24 * 60 * 60 * 1000,
    every_12h: 12 * 60 * 60 * 1000,
    every_6h: 6 * 60 * 60 * 1000,
    every_3d: 3 * 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
};
// 캠페인 스케줄 동기화 주기 (5분)
const SYNC_INTERVAL_MS = 5 * 60 * 1000;
// 현재 등록된 캠페인 ID 추적
const registeredCampaigns = new Map(); // campaignId → frequency
// 캠페인 스케줄 동기화
const syncCampaigns = async (queue, sentinelClient) => {
    try {
        const campaigns = await sentinelClient.getActiveCampaigns();
        const activeCampaignIds = new Set(campaigns.map((c) => c.id));
        // 신규/변경 캠페인 → 잡 등록
        for (const campaign of campaigns) {
            const existingFrequency = registeredCampaigns.get(campaign.id);
            const frequency = campaign.frequency || 'daily';
            if (existingFrequency === frequency)
                continue; // 변경 없음
            // 기존 잡 제거 (변경된 경우)
            if (existingFrequency) {
                await removeRepeatableJob(queue, campaign.id);
            }
            // 새 반복 잡 등록
            await addRepeatableJob(queue, campaign, frequency);
            registeredCampaigns.set(campaign.id, frequency);
        }
        // 비활성화된 캠페인 → 잡 제거
        for (const [campaignId] of registeredCampaigns) {
            if (!activeCampaignIds.has(campaignId)) {
                await removeRepeatableJob(queue, campaignId);
                registeredCampaigns.delete(campaignId);
                log('info', 'scheduler', `Removed job for deactivated campaign: ${campaignId}`);
            }
        }
        log('info', 'scheduler', `Synced ${campaigns.length} active campaigns (${registeredCampaigns.size} jobs registered)`);
    }
    catch (error) {
        log('error', 'scheduler', `Failed to sync campaigns: ${error instanceof Error ? error.message : String(error)}`);
    }
};
const addRepeatableJob = async (queue, campaign, frequency) => {
    const repeatInterval = FREQUENCY_MS[frequency] ?? FREQUENCY_MS['daily'];
    const jobData = {
        campaignId: campaign.id,
        keyword: campaign.keyword,
        marketplace: campaign.marketplace,
        maxPages: campaign.max_pages,
    };
    await queue.add(`campaign-${campaign.id}`, jobData, {
        repeat: {
            every: repeatInterval,
        },
        jobId: `campaign-${campaign.id}`,
    });
    log('info', 'scheduler', `Registered repeatable job: "${campaign.keyword}" (${frequency})`, {
        campaignId: campaign.id,
    });
};
const removeRepeatableJob = async (queue, campaignId) => {
    const repeatableJobs = await queue.getRepeatableJobs();
    for (const job of repeatableJobs) {
        if (job.id === `campaign-${campaignId}`) {
            await queue.removeRepeatableByKey(job.key);
            log('info', 'scheduler', `Removed repeatable job for campaign: ${campaignId}`);
            break;
        }
    }
};
// 스케줄러 시작
const startScheduler = async (queue, sentinelClient) => {
    log('info', 'scheduler', 'Starting campaign scheduler');
    // 즉시 첫 동기화
    await syncCampaigns(queue, sentinelClient);
    // 5분마다 동기화 반복
    const interval = setInterval(() => {
        syncCampaigns(queue, sentinelClient).catch((error) => {
            log('error', 'scheduler', `Scheduler sync error: ${error instanceof Error ? error.message : String(error)}`);
        });
    }, SYNC_INTERVAL_MS);
    return interval;
};
export { startScheduler, syncCampaigns };
//# sourceMappingURL=scheduler.js.map