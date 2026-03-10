// V01-V19 front-end reportability check (shared between SW and content script)
// V01-V03 redirect to separate IP form — not automatable from product page
// New categories (variation, main_image, etc.) don't have PD form mappings yet

const NON_FRONT_REPORTABLE = new Set(['V01', 'V02', 'V03'])
const FRONT_REPORTABLE_PREFIX = 'V' // Only V-codes are front-reportable

export const isFrontReportable = (violationCode: string): boolean =>
  violationCode.startsWith(FRONT_REPORTABLE_PREFIX) && !NON_FRONT_REPORTABLE.has(violationCode)
