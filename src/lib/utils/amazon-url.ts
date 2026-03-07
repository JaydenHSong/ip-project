const MARKETPLACE_DOMAINS: Record<string, string> = {
  US: 'amazon.com',
  UK: 'amazon.co.uk',
  JP: 'amazon.co.jp',
  DE: 'amazon.de',
  FR: 'amazon.fr',
  IT: 'amazon.it',
  ES: 'amazon.es',
  CA: 'amazon.ca',
}

export const getAmazonUrl = (asin: string, marketplace: string): string => {
  const domain = MARKETPLACE_DOMAINS[marketplace] ?? 'amazon.com'
  return `https://www.${domain}/dp/${asin}`
}
