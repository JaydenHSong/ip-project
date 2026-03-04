import type { Browser, BrowserContext } from 'playwright';
import type { BrowserFingerprint, ProxyConfig } from '../types/index.js';
declare const applyStealthSettings: (context: BrowserContext) => Promise<void>;
declare const createStealthContext: (browser: Browser, fingerprint: BrowserFingerprint, proxy?: ProxyConfig) => Promise<BrowserContext>;
export { applyStealthSettings, createStealthContext };
//# sourceMappingURL=stealth.d.ts.map