import { log } from '../logger.js';
const COOLDOWN_MS = 5 * 60 * 1000; // 5분
const MAX_FAIL_COUNT = 3;
// Bright Data 세션 ID 기반 프록시 풀 생성
// 같은 호스트/포트에 다른 세션 ID를 붙여 별도 IP로 취급
const createProxyManager = (baseConfig, poolSize) => {
    const pool = Array.from({ length: poolSize }, (_, i) => ({
        config: {
            ...baseConfig,
            username: `${baseConfig.username}-session-${Date.now()}-${i}`,
        },
        status: 'active',
        failCount: 0,
        lastUsed: 0,
        blockedUntil: null,
    }));
    let currentIndex = 0;
    const refreshCooldowns = () => {
        const now = Date.now();
        for (const proxy of pool) {
            if (proxy.status === 'cooldown' && proxy.blockedUntil && now >= proxy.blockedUntil) {
                proxy.status = 'active';
                proxy.failCount = 0;
                proxy.blockedUntil = null;
                log('info', 'proxy', `Proxy recovered from cooldown: ${proxy.config.username}`);
            }
        }
    };
    const findProxy = (config) => {
        return pool.find((p) => p.config.username === config.username);
    };
    return {
        getNextProxy: () => {
            refreshCooldowns();
            const activeProxies = pool.filter((p) => p.status === 'active');
            if (activeProxies.length === 0) {
                log('error', 'proxy', 'No active proxies available');
                return null;
            }
            // 라운드 로빈
            const index = currentIndex % activeProxies.length;
            currentIndex++;
            const selected = activeProxies[index];
            selected.lastUsed = Date.now();
            return selected.config;
        },
        reportFailure: (config) => {
            const proxy = findProxy(config);
            if (!proxy)
                return;
            proxy.failCount++;
            log('warn', 'proxy', `Proxy failure #${proxy.failCount}: ${config.username}`);
            if (proxy.failCount >= MAX_FAIL_COUNT) {
                proxy.status = 'cooldown';
                proxy.blockedUntil = Date.now() + COOLDOWN_MS;
                log('warn', 'proxy', `Proxy moved to cooldown (${COOLDOWN_MS / 1000}s): ${config.username}`);
            }
        },
        reportSuccess: (config) => {
            const proxy = findProxy(config);
            if (!proxy)
                return;
            proxy.failCount = 0;
            proxy.status = 'active';
        },
        getStatus: () => {
            refreshCooldowns();
            return {
                active: pool.filter((p) => p.status === 'active').length,
                blocked: pool.filter((p) => p.status === 'blocked').length,
                cooldown: pool.filter((p) => p.status === 'cooldown').length,
            };
        },
    };
};
export { createProxyManager };
//# sourceMappingURL=proxy.js.map