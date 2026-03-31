-- =============================================================================
-- AD Optimizer Module — Seed Data
-- =============================================================================
-- Run AFTER 001-ads-schema.sql
-- Prerequisite: public.brand_markets must have data
-- =============================================================================

-- marketplace_profiles — 계정별 API 인증 매핑
-- brand_market_id는 실제 public.brand_markets의 UUID로 교체 필요
-- =============================================================================

-- Spigen US
INSERT INTO ads.marketplace_profiles (brand_market_id, seller_id, refresh_token_key, sp_api_refresh_token_key, region, endpoint_url)
SELECT bm.id, 'SELLER_SPIGEN_US', 'AMAZON_ADS_REFRESH_TOKEN_SPIGEN_US', 'AMAZON_SP_API_REFRESH_TOKEN_US', 'NA', 'https://advertising-api.amazon.com'
FROM public.brand_markets bm
JOIN public.brands b ON bm.brand_id = b.id
WHERE b.name = 'Spigen' AND bm.marketplace = 'US'
ON CONFLICT (brand_market_id) DO NOTHING;

-- Spigen CA
INSERT INTO ads.marketplace_profiles (brand_market_id, seller_id, refresh_token_key, sp_api_refresh_token_key, region, endpoint_url)
SELECT bm.id, 'SELLER_SPIGEN_CA', 'AMAZON_ADS_REFRESH_TOKEN_SPIGEN_CA', 'AMAZON_SP_API_REFRESH_TOKEN_CA', 'NA', 'https://advertising-api.amazon.com'
FROM public.brand_markets bm
JOIN public.brands b ON bm.brand_id = b.id
WHERE b.name = 'Spigen' AND bm.marketplace = 'CA'
ON CONFLICT (brand_market_id) DO NOTHING;

-- Spigen DE (EU)
INSERT INTO ads.marketplace_profiles (brand_market_id, seller_id, refresh_token_key, sp_api_refresh_token_key, region, endpoint_url)
SELECT bm.id, 'SELLER_SPIGEN_DE', 'AMAZON_ADS_REFRESH_TOKEN_SPIGEN_DE', 'AMAZON_SP_API_REFRESH_TOKEN_EU', 'EU', 'https://advertising-api-eu.amazon.com'
FROM public.brand_markets bm
JOIN public.brands b ON bm.brand_id = b.id
WHERE b.name = 'Spigen' AND bm.marketplace = 'DE'
ON CONFLICT (brand_market_id) DO NOTHING;

-- Spigen JP
INSERT INTO ads.marketplace_profiles (brand_market_id, seller_id, refresh_token_key, sp_api_refresh_token_key, region, endpoint_url)
SELECT bm.id, 'SELLER_SPIGEN_JP', 'AMAZON_ADS_REFRESH_TOKEN_SPIGEN_JP', 'AMAZON_SP_API_REFRESH_TOKEN_JP', 'FE', 'https://advertising-api-fe.amazon.com'
FROM public.brand_markets bm
JOIN public.brands b ON bm.brand_id = b.id
WHERE b.name = 'Spigen' AND bm.marketplace = 'JP'
ON CONFLICT (brand_market_id) DO NOTHING;

-- Legato US
INSERT INTO ads.marketplace_profiles (brand_market_id, seller_id, refresh_token_key, sp_api_refresh_token_key, region, endpoint_url)
SELECT bm.id, 'SELLER_LEGATO_US', 'AMAZON_ADS_REFRESH_TOKEN_LEGATO_US', 'AMAZON_SP_API_REFRESH_TOKEN_LEGATO_US', 'NA', 'https://advertising-api.amazon.com'
FROM public.brand_markets bm
JOIN public.brands b ON bm.brand_id = b.id
WHERE b.name = 'Legato' AND bm.marketplace = 'US'
ON CONFLICT (brand_market_id) DO NOTHING;

-- Cyrill US
INSERT INTO ads.marketplace_profiles (brand_market_id, seller_id, refresh_token_key, sp_api_refresh_token_key, region, endpoint_url)
SELECT bm.id, 'SELLER_CYRILL_US', 'AMAZON_ADS_REFRESH_TOKEN_CYRILL_US', 'AMAZON_SP_API_REFRESH_TOKEN_CYRILL_US', 'NA', 'https://advertising-api.amazon.com'
FROM public.brand_markets bm
JOIN public.brands b ON bm.brand_id = b.id
WHERE b.name = 'Cyrill' AND bm.marketplace = 'US'
ON CONFLICT (brand_market_id) DO NOTHING;

-- =============================================================================
-- Verify
-- =============================================================================
SELECT
  mp.id,
  b.name as brand,
  bm.marketplace as market,
  mp.region,
  mp.refresh_token_key,
  mp.is_active
FROM ads.marketplace_profiles mp
JOIN public.brand_markets bm ON mp.brand_market_id = bm.id
JOIN public.brands b ON bm.brand_id = b.id
ORDER BY b.name, bm.marketplace;
