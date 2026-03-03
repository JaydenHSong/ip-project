-- ============================================
-- 006: Seed Report Templates + Usage Counter
-- V01~V19 coverage: 73 templates
-- ============================================

-- Helper function for usage_count increment (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION increment_template_usage(p_template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE report_templates
  SET usage_count = usage_count + 1, updated_at = now()
  WHERE id = p_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- V01: Trademark Infringement (4 templates)
INSERT INTO report_templates (title, body, category, violation_types, marketplace, tags, is_default) VALUES
('Trademark Infringement — Logo Misuse',
 E'Dear Amazon Seller Performance Team,\n\nI am writing to report a trademark infringement on ASIN {{ASIN}} ("{{TITLE}}") sold by {{SELLER}} on Amazon {{MARKETPLACE}}.\n\nThis listing prominently displays the Spigen logo and registered trademarks without authorization. The seller is not an authorized distributor or licensee of Spigen Inc.\n\nWe respectfully request that Amazon review this listing and take appropriate action.\n\nDate: {{TODAY}}',
 'intellectual_property', ARRAY['V01'], ARRAY[]::TEXT[], ARRAY['trademark','logo','standard'], true),

('Trademark Infringement — Name Misuse in Title',
 E'Dear Amazon Seller Performance Team,\n\nI am reporting a trademark violation on ASIN {{ASIN}} ("{{TITLE}}") sold by {{SELLER}} on Amazon {{MARKETPLACE}}.\n\nThe seller has incorporated the "Spigen" trademark into the product title to mislead consumers. The product is not manufactured by or affiliated with Spigen Inc.\n\nWe request immediate removal of all unauthorized references to the Spigen trademark.\n\nDate: {{TODAY}}',
 'intellectual_property', ARRAY['V01'], ARRAY[]::TEXT[], ARRAY['trademark','name','title'], false),

('Trademark Infringement — Brand Confusion',
 E'Dear Amazon Seller Performance Team,\n\nI am writing regarding ASIN {{ASIN}} ("{{TITLE}}") sold by {{SELLER}} on Amazon {{MARKETPLACE}}.\n\nThis listing uses a brand name confusingly similar to our registered trademark "Spigen." The similarity creates likelihood of confusion among consumers.\n\nWe respectfully request investigation and enforcement action.\n\nDate: {{TODAY}}',
 'intellectual_property', ARRAY['V01'], ARRAY[]::TEXT[], ARRAY['trademark','confusion'], false),

('Trademark Infringement — Unauthorized Keyword Usage',
 E'Dear Amazon Seller Performance Team,\n\nI am writing to report unauthorized use of the "Spigen" trademark on ASIN {{ASIN}} ("{{TITLE}}") sold by {{SELLER}} on Amazon {{MARKETPLACE}}.\n\nThe seller has used our trademarked brand name in backend search keywords to divert traffic from legitimate Spigen listings.\n\nWe request removal of all unauthorized Spigen trademark references.\n\nDate: {{TODAY}}',
 'intellectual_property', ARRAY['V01'], ARRAY[]::TEXT[], ARRAY['trademark','keyword','search'], false);

-- V02: Copyright Infringement (4 templates)
INSERT INTO report_templates (title, body, category, violation_types, marketplace, tags, is_default) VALUES
('Copyright Infringement — Product Image Theft',
 E'Dear Amazon Seller Performance Team,\n\nI am writing to report copyright infringement on ASIN {{ASIN}} ("{{TITLE}}") sold by {{SELLER}} on Amazon {{MARKETPLACE}}.\n\nThe listing uses product images that are the copyrighted property of Spigen Inc. The seller has copied these images without authorization.\n\nWe request immediate removal of all copyrighted images from this listing.\n\nDate: {{TODAY}}',
 'intellectual_property', ARRAY['V02'], ARRAY[]::TEXT[], ARRAY['copyright','image','photo'], true),

('Copyright Infringement — Description Copy',
 E'Dear Amazon Seller Performance Team,\n\nI am reporting a copyright violation on ASIN {{ASIN}} ("{{TITLE}}") sold by {{SELLER}} on Amazon {{MARKETPLACE}}.\n\nThe product description and bullet points contain text directly copied from our official Spigen product listings.\n\nWe request that the copied content be removed from this listing.\n\nDate: {{TODAY}}',
 'intellectual_property', ARRAY['V02'], ARRAY[]::TEXT[], ARRAY['copyright','description','text'], false),

('Copyright Infringement — A+ Content Copy',
 E'Dear Amazon Seller Performance Team,\n\nASIN {{ASIN}} ("{{TITLE}}") sold by {{SELLER}} on Amazon {{MARKETPLACE}} has copied our A+ Content.\n\nSpigen''s A+ Content includes custom-designed graphics and branded modules that are copyrighted works.\n\nDate: {{TODAY}}',
 'intellectual_property', ARRAY['V02'], ARRAY[]::TEXT[], ARRAY['copyright','a-plus','ebc'], false),

('Copyright Infringement — Video Content',
 E'Dear Amazon Seller Performance Team,\n\nASIN {{ASIN}} ("{{TITLE}}") sold by {{SELLER}} on Amazon {{MARKETPLACE}} contains video content that infringes on our copyright.\n\nThe listing features video content produced by Spigen Inc. for our official products.\n\nWe request the infringing video content be removed immediately.\n\nDate: {{TODAY}}',
 'intellectual_property', ARRAY['V02'], ARRAY[]::TEXT[], ARRAY['copyright','video'], false);

-- V03: Patent Infringement (4 templates)
INSERT INTO report_templates (title, body, category, violation_types, marketplace, tags, is_default) VALUES
('Patent Infringement — Design Patent',
 E'Dear Amazon Seller Performance Team,\n\nI am writing to report a design patent infringement on ASIN {{ASIN}} ("{{TITLE}}") sold by {{SELLER}} on Amazon {{MARKETPLACE}}.\n\nThis product''s overall visual appearance is substantially similar to our patented designs.\n\nWe request that Amazon review this listing in light of our patent rights.\n\nDate: {{TODAY}}',
 'intellectual_property', ARRAY['V03'], ARRAY[]::TEXT[], ARRAY['patent','design'], true),

('Patent Infringement — Utility Patent',
 E'Dear Amazon Seller Performance Team,\n\nASIN {{ASIN}} ("{{TITLE}}") sold by {{SELLER}} on Amazon {{MARKETPLACE}} infringes on Spigen''s utility patent.\n\nThe product incorporates technology covered by our active utility patent(s).\n\nDate: {{TODAY}}',
 'intellectual_property', ARRAY['V03'], ARRAY[]::TEXT[], ARRAY['patent','utility'], false),

('Patent Infringement — Trade Dress',
 E'Dear Amazon Seller Performance Team,\n\nI am reporting trade dress infringement on ASIN {{ASIN}} ("{{TITLE}}") sold by {{SELLER}} on Amazon {{MARKETPLACE}}.\n\nThe listed product copies our trade dress elements to create a misleading impression of association with Spigen.\n\nDate: {{TODAY}}',
 'intellectual_property', ARRAY['V03'], ARRAY[]::TEXT[], ARRAY['patent','trade-dress'], false),

('Patent Infringement — Multiple Patents',
 E'Dear Amazon Seller Performance Team,\n\nASIN {{ASIN}} ("{{TITLE}}") sold by {{SELLER}} on Amazon {{MARKETPLACE}} infringes on multiple Spigen patents.\n\nThe product violates both design and utility patents held by Spigen Inc.\n\nDate: {{TODAY}}',
 'intellectual_property', ARRAY['V03'], ARRAY[]::TEXT[], ARRAY['patent','multiple'], false);

-- V04: Counterfeit (3 templates)
INSERT INTO report_templates (title, body, category, violation_types, marketplace, tags, is_default) VALUES
('Counterfeit — Fake Spigen Product',
 E'Dear Amazon Seller Performance Team,\n\nI am writing to report the sale of counterfeit goods on ASIN {{ASIN}} ("{{TITLE}}") sold by {{SELLER}} on Amazon {{MARKETPLACE}}.\n\nThis product is being sold as a genuine Spigen product but is a counterfeit. We have verified that {{SELLER}} is not an authorized seller.\n\nWe request immediate removal of this counterfeit listing.\n\nDate: {{TODAY}}',
 'intellectual_property', ARRAY['V04'], ARRAY[]::TEXT[], ARRAY['counterfeit','fake','standard'], true),

('Counterfeit — Test Purchase Evidence',
 E'Dear Amazon Seller Performance Team,\n\nFollowing a test purchase of ASIN {{ASIN}} ("{{TITLE}}") from {{SELLER}} on Amazon {{MARKETPLACE}}, we have confirmed the product is counterfeit.\n\nOur quality assurance team has examined the purchased product and identified discrepancies from authentic Spigen products.\n\nDate: {{TODAY}}',
 'intellectual_property', ARRAY['V04'], ARRAY[]::TEXT[], ARRAY['counterfeit','test-purchase','evidence'], false),

('Counterfeit — Unauthorized Reseller Counterfeit',
 E'Dear Amazon Seller Performance Team,\n\nASIN {{ASIN}} ("{{TITLE}}") sold by {{SELLER}} on Amazon {{MARKETPLACE}} appears to be selling counterfeit Spigen products.\n\nThe pricing ({{PRICE}}) is significantly below our MAP, which is a strong indicator of counterfeit origin.\n\nDate: {{TODAY}}',
 'intellectual_property', ARRAY['V04'], ARRAY[]::TEXT[], ARRAY['counterfeit','unauthorized'], false);

-- V05~V19: Additional templates follow same pattern
-- (Using shorter bodies for migration efficiency; full text in demo/templates.ts)

-- V05: False/Exaggerated Claims (3)
INSERT INTO report_templates (title, body, category, violation_types, marketplace, tags, is_default) VALUES
('False Claims — Misleading Compatibility', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} makes misleading claims about product compatibility or performance.\n\nDate: {{TODAY}}', 'listing_content', ARRAY['V05'], ARRAY[]::TEXT[], ARRAY['false-claims','misleading'], true),
('False Claims — Exaggerated Performance', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} makes exaggerated performance claims.\n\nDate: {{TODAY}}', 'listing_content', ARRAY['V05'], ARRAY[]::TEXT[], ARRAY['false-claims','exaggerated'], false),
('False Claims — Fake Certification', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} displays fake certifications.\n\nDate: {{TODAY}}', 'listing_content', ARRAY['V05'], ARRAY[]::TEXT[], ARRAY['false-claims','certification'], false);

-- V06: Prohibited Keywords (3)
INSERT INTO report_templates (title, body, category, violation_types, marketplace, tags, is_default) VALUES
('Prohibited Keywords — Brand Name in Non-Brand Listing', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} uses prohibited brand-name keywords.\n\nDate: {{TODAY}}', 'listing_content', ARRAY['V06'], ARRAY[]::TEXT[], ARRAY['prohibited-keyword','brand-name'], true),
('Prohibited Keywords — Compatible With Misuse', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} misuses the "compatible with" phrase.\n\nDate: {{TODAY}}', 'listing_content', ARRAY['V06'], ARRAY[]::TEXT[], ARRAY['prohibited-keyword','compatible'], false),
('Prohibited Keywords — Restricted Terms', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} uses restricted or prohibited terms.\n\nDate: {{TODAY}}', 'listing_content', ARRAY['V06'], ARRAY[]::TEXT[], ARRAY['prohibited-keyword','restricted'], false);

-- V07: Inaccurate Product Information (5)
INSERT INTO report_templates (title, body, category, violation_types, marketplace, tags, is_default) VALUES
('Inaccurate Info — Wrong Product Specifications', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} contains incorrect product specifications.\n\nDate: {{TODAY}}', 'listing_content', ARRAY['V07'], ARRAY[]::TEXT[], ARRAY['inaccurate','specifications'], true),
('Inaccurate Info — Misleading Images', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} displays misleading product images.\n\nDate: {{TODAY}}', 'listing_content', ARRAY['V07'], ARRAY[]::TEXT[], ARRAY['inaccurate','images'], false),
('Inaccurate Info — Wrong Category', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} is listed in the wrong product category.\n\nDate: {{TODAY}}', 'listing_content', ARRAY['V07'], ARRAY[]::TEXT[], ARRAY['inaccurate','category'], false),
('Inaccurate Info — Pre-announcement Product', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} appears to be a pre-announcement listing.\n\nDate: {{TODAY}}', 'listing_content', ARRAY['V07'], ARRAY[]::TEXT[], ARRAY['inaccurate','pre-announcement'], false),
('Inaccurate Info — False Origin/Material Claims', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} makes false origin and material claims.\n\nDate: {{TODAY}}', 'listing_content', ARRAY['V07'], ARRAY[]::TEXT[], ARRAY['inaccurate','material','origin'], false);

-- V08: Image Policy Violation (8)
INSERT INTO report_templates (title, body, category, violation_types, marketplace, tags, is_default) VALUES
('Image Violation — Stolen Product Photos', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} uses stolen product photographs belonging to Spigen Inc.\n\nDate: {{TODAY}}', 'listing_content', ARRAY['V08'], ARRAY[]::TEXT[], ARRAY['image','stolen'], true),
('Image Violation — Logo/Watermark on Main Image', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} has logos or watermarks on the main image.\n\nDate: {{TODAY}}', 'listing_content', ARRAY['V08'], ARRAY[]::TEXT[], ARRAY['image','logo','watermark'], false),
('Image Violation — Non-White Background', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} main image does not have a white background.\n\nDate: {{TODAY}}', 'listing_content', ARRAY['V08'], ARRAY[]::TEXT[], ARRAY['image','background'], false),
('Image Violation — Misleading Product Photos', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} uses misleading product images.\n\nDate: {{TODAY}}', 'listing_content', ARRAY['V08'], ARRAY[]::TEXT[], ARRAY['image','misleading'], false),
('Image Violation — Competitor Badge Misuse', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} displays unauthorized badges in images.\n\nDate: {{TODAY}}', 'listing_content', ARRAY['V08'], ARRAY[]::TEXT[], ARRAY['image','badge'], false),
('Image Violation — Multiple Products in Main', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} shows multiple products in the main image.\n\nDate: {{TODAY}}', 'listing_content', ARRAY['V08'], ARRAY[]::TEXT[], ARRAY['image','multiple-products'], false),
('Image Violation — Lifestyle as Main', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} uses a lifestyle photo as the main product image.\n\nDate: {{TODAY}}', 'listing_content', ARRAY['V08'], ARRAY[]::TEXT[], ARRAY['image','lifestyle'], false),
('Image Violation — Low Resolution', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} uses low-quality product images.\n\nDate: {{TODAY}}', 'listing_content', ARRAY['V08'], ARRAY[]::TEXT[], ARRAY['image','low-resolution'], false);

-- V09: Title Policy Violation (3)
INSERT INTO report_templates (title, body, category, violation_types, marketplace, tags, is_default) VALUES
('Title Violation — Keyword Stuffing', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} has an excessively long title with keyword stuffing.\n\nDate: {{TODAY}}', 'listing_content', ARRAY['V09'], ARRAY[]::TEXT[], ARRAY['title','keyword-stuffing'], true),
('Title Violation — Promotional Text', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} contains promotional text in the title.\n\nDate: {{TODAY}}', 'listing_content', ARRAY['V09'], ARRAY[]::TEXT[], ARRAY['title','promotional'], false),
('Title Violation — Competing Brand Name Abuse', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} uses competing brand names in the title.\n\nDate: {{TODAY}}', 'listing_content', ARRAY['V09'], ARRAY[]::TEXT[], ARRAY['title','brand-abuse'], false);

-- V10: Variation Abuse (8)
INSERT INTO report_templates (title, body, category, violation_types, marketplace, tags, is_default) VALUES
('Variation Abuse — Unrelated Product Merged', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} has merged unrelated products into a variation family.\n\nDate: {{TODAY}}', 'listing_content', ARRAY['V10'], ARRAY[]::TEXT[], ARRAY['variation','unrelated'], true),
('Variation Abuse — Review Hijacking via Variation', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} exploits the variation system to hijack reviews.\n\nDate: {{TODAY}}', 'listing_content', ARRAY['V10'], ARRAY[]::TEXT[], ARRAY['variation','review-hijack'], false),
('Variation Abuse — Size/Color Mismatch', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} has incorrect variation attributes.\n\nDate: {{TODAY}}', 'listing_content', ARRAY['V10'], ARRAY[]::TEXT[], ARRAY['variation','size','color'], false),
('Variation Abuse — Cross-Category', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} combines products from different categories.\n\nDate: {{TODAY}}', 'listing_content', ARRAY['V10'], ARRAY[]::TEXT[], ARRAY['variation','cross-category'], false),
('Variation Abuse — Duplicate ASIN', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} has duplicate variations.\n\nDate: {{TODAY}}', 'listing_content', ARRAY['V10'], ARRAY[]::TEXT[], ARRAY['variation','duplicate'], false),
('Variation Abuse — Accessory as Variant', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} lists accessories as product variations.\n\nDate: {{TODAY}}', 'listing_content', ARRAY['V10'], ARRAY[]::TEXT[], ARRAY['variation','accessory'], false),
('Variation Abuse — Brand Mixing', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} mixes brands within a variation family.\n\nDate: {{TODAY}}', 'listing_content', ARRAY['V10'], ARRAY[]::TEXT[], ARRAY['variation','brand-mixing'], false),
('Variation Abuse — Price Manipulation via Variant', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} uses variation pricing manipulation.\n\nDate: {{TODAY}}', 'listing_content', ARRAY['V10'], ARRAY[]::TEXT[], ARRAY['variation','price'], false);

-- V11: Review Manipulation (5)
INSERT INTO report_templates (title, body, category, violation_types, marketplace, tags, is_default) VALUES
('Review Manipulation — Incentivized Reviews', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} has received incentivized reviews. Rating: {{RATING}} ({{REVIEW_COUNT}} reviews).\n\nDate: {{TODAY}}', 'review_manipulation', ARRAY['V11'], ARRAY[]::TEXT[], ARRAY['review','incentivized'], true),
('Review Manipulation — Fake Negative Reviews', E'Fake negative reviews detected on our ASIN {{ASIN}} ("{{TITLE}}"). Suspected competitor: {{SELLER}} on {{MARKETPLACE}}.\n\nDate: {{TODAY}}', 'review_manipulation', ARRAY['V11'], ARRAY[]::TEXT[], ARRAY['review','fake-negative'], false),
('Review Manipulation — Review Farm', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} shows evidence of review farm activity.\n\nDate: {{TODAY}}', 'review_manipulation', ARRAY['V11'], ARRAY[]::TEXT[], ARRAY['review','farm'], false),
('Review Manipulation — Insert Card Solicitation', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} includes product insert cards soliciting reviews.\n\nDate: {{TODAY}}', 'review_manipulation', ARRAY['V11'], ARRAY[]::TEXT[], ARRAY['review','insert-card'], false),
('Review Manipulation — Seller Self-Review', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} has reviews suspected from the seller or affiliates.\n\nDate: {{TODAY}}', 'review_manipulation', ARRAY['V11'], ARRAY[]::TEXT[], ARRAY['review','self-review'], false);

-- V12: Review Hijacking (3)
INSERT INTO report_templates (title, body, category, violation_types, marketplace, tags, is_default) VALUES
('Review Hijacking — Product Swap', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} has undergone a product swap retaining original reviews. Rating: {{RATING}} ({{REVIEW_COUNT}} reviews).\n\nDate: {{TODAY}}', 'review_manipulation', ARRAY['V12'], ARRAY[]::TEXT[], ARRAY['review-hijack','product-swap'], true),
('Review Hijacking — Listing Takeover', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} listing details have been modified while reviews remain.\n\nDate: {{TODAY}}', 'review_manipulation', ARRAY['V12'], ARRAY[]::TEXT[], ARRAY['review-hijack','listing-takeover'], false),
('Review Hijacking — ASIN Merge Abuse', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} was created through abusive ASIN merging.\n\nDate: {{TODAY}}', 'review_manipulation', ARRAY['V12'], ARRAY[]::TEXT[], ARRAY['review-hijack','asin-merge'], false);

-- V13: Price Manipulation (2)
INSERT INTO report_templates (title, body, category, violation_types, marketplace, tags, is_default) VALUES
('Price Manipulation — Artificial Price Inflation', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} artificially inflates the list price. Current: {{PRICE}}.\n\nDate: {{TODAY}}', 'selling_practice', ARRAY['V13'], ARRAY[]::TEXT[], ARRAY['price','inflation'], true),
('Price Manipulation — Bait-and-Switch', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} engages in bait-and-switch pricing.\n\nDate: {{TODAY}}', 'selling_practice', ARRAY['V13'], ARRAY[]::TEXT[], ARRAY['price','bait-switch'], false);

-- V14: Unauthorized Reseller (3)
INSERT INTO report_templates (title, body, category, violation_types, marketplace, tags, is_default) VALUES
('Unauthorized Reseller — Non-Authorized Spigen Seller', E'{{SELLER}} on {{MARKETPLACE}} sells Spigen products (ASIN {{ASIN}}, "{{TITLE}}") without authorization.\n\nDate: {{TODAY}}', 'selling_practice', ARRAY['V14'], ARRAY[]::TEXT[], ARRAY['unauthorized','reseller'], true),
('Unauthorized Reseller — Grey Market Goods', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} appears to sell grey market Spigen products.\n\nDate: {{TODAY}}', 'selling_practice', ARRAY['V14'], ARRAY[]::TEXT[], ARRAY['unauthorized','grey-market'], false),
('Unauthorized Reseller — MAP Violation', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} is priced below MAP at {{PRICE}}.\n\nDate: {{TODAY}}', 'selling_practice', ARRAY['V14'], ARRAY[]::TEXT[], ARRAY['unauthorized','map-violation'], false);

-- V15: Listing Hijacking / Bundling (5)
INSERT INTO report_templates (title, body, category, violation_types, marketplace, tags, is_default) VALUES
('Listing Hijacking — Buy Box Takeover', E'{{SELLER}} has attached their offer to our Spigen listing ASIN {{ASIN}} ("{{TITLE}}") on {{MARKETPLACE}} without authorization.\n\nDate: {{TODAY}}', 'selling_practice', ARRAY['V15'], ARRAY[]::TEXT[], ARRAY['hijacking','buy-box'], true),
('Listing Hijacking — Detail Page Modification', E'ASIN {{ASIN}} ("{{TITLE}}") on {{MARKETPLACE}} detail page has been modified by unauthorized seller {{SELLER}}.\n\nDate: {{TODAY}}', 'selling_practice', ARRAY['V15'], ARRAY[]::TEXT[], ARRAY['hijacking','detail-page'], false),
('Listing Hijacking — Unauthorized Bundling', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} creates an unauthorized bundle with Spigen products.\n\nDate: {{TODAY}}', 'selling_practice', ARRAY['V15'], ARRAY[]::TEXT[], ARRAY['hijacking','bundle'], false),
('Listing Hijacking — Duplicate Listing', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} is a duplicate of an existing Spigen ASIN.\n\nDate: {{TODAY}}', 'selling_practice', ARRAY['V15'], ARRAY[]::TEXT[], ARRAY['hijacking','duplicate'], false),
('Listing Hijacking — Condition Misrepresentation', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} misrepresents product condition.\n\nDate: {{TODAY}}', 'selling_practice', ARRAY['V15'], ARRAY[]::TEXT[], ARRAY['hijacking','condition'], false);

-- V16: Missing Certification (2)
INSERT INTO report_templates (title, body, category, violation_types, marketplace, tags, is_default) VALUES
('Missing Certification — FCC/UL Compliance', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} lacks required FCC or UL certifications.\n\nDate: {{TODAY}}', 'regulatory_safety', ARRAY['V16'], ARRAY[]::TEXT[], ARRAY['certification','fcc','ul'], true),
('Missing Certification — CE/RoHS for EU', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} lacks required CE marking and RoHS compliance.\n\nDate: {{TODAY}}', 'regulatory_safety', ARRAY['V16'], ARRAY['UK','DE','FR','IT','ES'], ARRAY['certification','ce','rohs'], false);

-- V17: Safety Standards Violation (3)
INSERT INTO report_templates (title, body, category, violation_types, marketplace, tags, is_default) VALUES
('Safety Violation — Restricted Category Product', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} may belong to a restricted category requiring pre-approval.\n\nDate: {{TODAY}}', 'regulatory_safety', ARRAY['V17'], ARRAY[]::TEXT[], ARRAY['safety','restricted'], true),
('Safety Violation — Hazardous Material', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} may contain undisclosed hazardous materials.\n\nDate: {{TODAY}}', 'regulatory_safety', ARRAY['V17'], ARRAY[]::TEXT[], ARRAY['safety','hazardous'], false),
('Safety Violation — Product Recall', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} appears to be a recalled product.\n\nDate: {{TODAY}}', 'regulatory_safety', ARRAY['V17'], ARRAY[]::TEXT[], ARRAY['safety','recall'], false);

-- V18: Missing Required Warnings (3)
INSERT INTO report_templates (title, body, category, violation_types, marketplace, tags, is_default) VALUES
('Missing Warnings — Prop 65', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} is missing required Proposition 65 warnings.\n\nDate: {{TODAY}}', 'regulatory_safety', ARRAY['V18'], ARRAY['US'], ARRAY['warning','prop65'], true),
('Missing Warnings — Choking Hazard', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} is missing required choking hazard warnings.\n\nDate: {{TODAY}}', 'regulatory_safety', ARRAY['V18'], ARRAY[]::TEXT[], ARRAY['warning','choking'], false),
('Missing Warnings — Battery Safety', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} contains batteries but lacks required safety warnings.\n\nDate: {{TODAY}}', 'regulatory_safety', ARRAY['V18'], ARRAY[]::TEXT[], ARRAY['warning','battery'], false);

-- V19: Import Regulation Violation (2)
INSERT INTO report_templates (title, body, category, violation_types, marketplace, tags, is_default) VALUES
('Import Violation — Missing Country of Origin', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} does not display required country of origin information.\n\nDate: {{TODAY}}', 'regulatory_safety', ARRAY['V19'], ARRAY['US'], ARRAY['import','country-of-origin'], true),
('Import Violation — Suspected Tariff Evasion', E'ASIN {{ASIN}} ("{{TITLE}}") by {{SELLER}} on {{MARKETPLACE}} at {{PRICE}} may be involved in tariff evasion.\n\nDate: {{TODAY}}', 'regulatory_safety', ARRAY['V19'], ARRAY[]::TEXT[], ARRAY['import','tariff'], false);
