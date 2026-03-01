-- Sentinel: Seed Data (초기 데이터)
-- Based on: sentinel.design.md v0.3

-- ============================================================
-- 1. Product Categories (OMS 12개 카테고리)
-- ============================================================
INSERT INTO product_categories (name, slug, sort_order) VALUES
  ('GPS Screen Protector Foils (Auto, Smart Watch)', 'gps-screen-protector-foils', 1),
  ('Golf Accessories', 'golf-accessories', 2),
  ('Game Console Screen Protector', 'game-console-screen-protector', 3),
  ('Case', 'case', 4),
  ('Cell Phone Screen Protector', 'cell-phone-screen-protector', 5),
  ('Lens Protectors', 'lens-protectors', 6),
  ('Auto Screen Protector', 'auto-screen-protector', 7),
  ('Auto Accessories', 'auto-accessories', 8),
  ('EV Screen Protector', 'ev-screen-protector', 9),
  ('EV Accessories', 'ev-accessories', 10),
  ('Wearable', 'wearable', 11),
  ('Others', 'others', 12);

-- ============================================================
-- 2. System Configs (초기 설정)
-- ============================================================
INSERT INTO system_configs (key, value, description) VALUES
  ('followup_intervals', '{"warning_days": [7, 14], "unresolved_days": 30}', '팔로업 미해결 알림 기간'),
  ('crawling_defaults', '{"max_pages": 3, "delay_ms": [2000, 5000]}', '크롤링 기본 설정'),
  ('ai_config', '{"model": "claude-opus-4-6", "max_retries": 3, "batch_size": 10}', 'AI 분석 설정'),
  ('sc_config', '{"auto_submit": false, "max_daily_submissions": 50}', 'Seller Central 설정');

-- ============================================================
-- 3. Spigen Trademarks (D42 — 주요 등록 상표)
-- ============================================================
INSERT INTO trademarks (name, mark_type, country, variations) VALUES
  ('Spigen', 'standard_character', 'US', '["spigen", "SPIGEN", "Spigen Inc"]'),
  ('Tough Armor', 'standard_character', 'US', '["tough armor", "ToughArmor", "Tough-Armor"]'),
  ('Rugged Armor', 'standard_character', 'US', '["rugged armor", "RuggedArmor", "Rugged-Armor"]'),
  ('Ultra Hybrid', 'standard_character', 'US', '["ultra hybrid", "UltraHybrid", "Ultra-Hybrid"]'),
  ('Thin Fit', 'standard_character', 'US', '["thin fit", "ThinFit", "Thin-Fit"]'),
  ('Liquid Air', 'standard_character', 'US', '["liquid air", "LiquidAir", "Liquid-Air"]'),
  ('Liquid Crystal', 'standard_character', 'US', '["liquid crystal", "LiquidCrystal"]'),
  ('Neo Hybrid', 'standard_character', 'US', '["neo hybrid", "NeoHybrid", "Neo-Hybrid"]'),
  ('Crystal Flex', 'standard_character', 'US', '["crystal flex", "CrystalFlex"]'),
  ('EZ Fit', 'standard_character', 'US', '["ez fit", "EZFit", "EZ-Fit"]'),
  ('Glas.tR', 'design_mark', 'US', '["glastr", "glas.tr", "GlastR", "Glas tR"]'),
  ('Ciel', 'standard_character', 'US', '["ciel", "CIEL", "Ciel by Spigen"]'),
  ('Cyrill', 'standard_character', 'US', '["cyrill", "CYRILL"]');
