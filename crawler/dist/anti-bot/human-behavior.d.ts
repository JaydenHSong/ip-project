import type { Page } from 'playwright';
declare const humanBehavior: {
    delay: (min: number, max: number) => Promise<void>;
    moveMouse: (page: Page, selector: string) => Promise<void>;
    scrollPage: (page: Page, scrollPercent: number) => Promise<void>;
    typeText: (page: Page, selector: string, text: string) => Promise<void>;
};
export { humanBehavior };
//# sourceMappingURL=human-behavior.d.ts.map