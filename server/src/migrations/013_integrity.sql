-- Halollik nazorati hodisalari (oynadan/to'liq ekrandan chiqish, yuz kadrda yo'qligi) — yozuv bilan birga
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS integrity JSONB NOT NULL DEFAULT '[]'::jsonb;
