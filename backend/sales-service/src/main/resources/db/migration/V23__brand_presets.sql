-- V23: Brand Presets — system-provided industry brand templates
-- Tenants can browse and apply presets as a starting point for their brand.

CREATE TABLE brand_presets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    industry        VARCHAR(50) NOT NULL,
    description     TEXT DEFAULT '',
    thumbnail_url   TEXT DEFAULT '',
    palette_json    JSONB NOT NULL,      -- {primary, secondary, accent}
    typography_json JSONB DEFAULT '{}',  -- {heading, body, mono}
    is_premium      BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_brand_presets_industry ON brand_presets(industry);

-- Seed 12 industry presets
INSERT INTO brand_presets (name, industry, description, palette_json, typography_json, sort_order) VALUES
('Fresh Pharmacy', 'Pharmacy',
 'Clean, trustworthy green palette with serif fonts — ideal for pharmacies and healthcare.',
 '{"primary":"#059669","secondary":"#1E293B","accent":"#F59E0B"}',
 '{"heading":"Inter, system-ui, sans-serif","body":"Inter, system-ui, sans-serif","mono":"JetBrains Mono, monospace"}', 1),

('Bistro Kitchen', 'Restaurant',
 'Warm, inviting colours that evoke appetite and hospitality.',
 '{"primary":"#DC2626","secondary":"#292524","accent":"#F59E0B"}',
 '{"heading":"DM Sans, system-ui, sans-serif","body":"DM Sans, system-ui, sans-serif","mono":"JetBrains Mono, monospace"}', 2),

('Urban Retail', 'Retail',
 'Modern, versatile palette for clothing and fashion boutiques.',
 '{"primary":"#7C3AED","secondary":"#1E293B","accent":"#F97316"}',
 '{"heading":"Inter, system-ui, sans-serif","body":"Inter, system-ui, sans-serif","mono":"JetBrains Mono, monospace"}', 3),

('The Grooming Lounge', 'Salon',
 'Sophisticated dark palette with gold accents for premium salons and barbershops.',
 '{"primary":"#1E293B","secondary":"#0F172A","accent":"#CA8A04"}',
 '{"heading":"Playfair Display, Georgia, serif","body":"Inter, system-ui, sans-serif","mono":"JetBrains Mono, monospace"}', 4),

('ValueMart', 'Supermarket',
 'Bright, approachable colours that signal value and freshness.',
 '{"primary":"#2563EB","secondary":"#1E3A5F","accent":"#EF4444"}',
 '{"heading":"Inter, system-ui, sans-serif","body":"Inter, system-ui, sans-serif","mono":"JetBrains Mono, monospace"}', 5),

('BuildRight Hardware', 'Hardware',
 'Solid, industrial palette conveying durability and reliability.',
 '{"primary":"#B45309","secondary":"#292524","accent":"#F97316"}',
 '{"heading":"Inter, system-ui, sans-serif","body":"Inter, system-ui, sans-serif","mono":"JetBrains Mono, monospace"}', 6),

('TechPoint', 'Electronics',
 'Cool blue-tech palette with clean modern fonts.',
 '{"primary":"#0284C7","secondary":"#0F172A","accent":"#06B6D4"}',
 '{"heading":"Inter, system-ui, sans-serif","body":"Inter, system-ui, sans-serif","mono":"JetBrains Mono, monospace"}', 7),

('Serenity Stay', 'Hotel',
 'Calm, luxurious palette for hospitality and accommodation.',
 '{"primary":"#0D9488","secondary":"#1E293B","accent":"#CA8A04"}',
 '{"heading":"Playfair Display, Georgia, serif","body":"Inter, system-ui, sans-serif","mono":"JetBrains Mono, monospace"}', 8),

('MediCare Clinic', 'Clinic',
 'Professional medical palette with trustworthy blues.',
 '{"primary":"#1D4ED8","secondary":"#1E3A5F","accent":"#10B981"}',
 '{"heading":"Inter, system-ui, sans-serif","body":"Inter, system-ui, sans-serif","mono":"JetBrains Mono, monospace"}', 9),

('Lex & Co', 'Law Firm',
 'Traditional, authoritative palette for legal practices.',
 '{"primary":"#1E293B","secondary":"#0F172A","accent":"#B45309"}',
 '{"heading":"Source Serif 4, Georgia, serif","body":"Inter, system-ui, sans-serif","mono":"JetBrains Mono, monospace"}', 10),

('SweetCrust Bakery', 'Bakery',
 'Warm, inviting bakery colours with friendly typography.',
 '{"primary":"#C2410C","secondary":"#431407","accent":"#F59E0B"}',
 '{"heading":"DM Sans, system-ui, sans-serif","body":"DM Sans, system-ui, sans-serif","mono":"JetBrains Mono, monospace"}', 11),

('AutoPro Parts', 'Auto Parts',
 'Bold, high-contrast palette for automotive and spare parts businesses.',
 '{"primary":"#DC2626","secondary":"#1E293B","accent":"#3B82F6"}',
 '{"heading":"Inter, system-ui, sans-serif","body":"Inter, system-ui, sans-serif","mono":"JetBrains Mono, monospace"}', 12);
