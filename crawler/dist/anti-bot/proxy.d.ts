import type { ProxyConfig } from '../types/index.js';
type ProxyManager = {
    getNextProxy: () => ProxyConfig | null;
    reportFailure: (proxy: ProxyConfig) => void;
    reportSuccess: (proxy: ProxyConfig) => void;
    getStatus: () => {
        active: number;
        blocked: number;
        cooldown: number;
    };
};
declare const createProxyManager: (baseConfig: ProxyConfig, poolSize: number) => ProxyManager;
export { createProxyManager };
export type { ProxyManager };
//# sourceMappingURL=proxy.d.ts.map