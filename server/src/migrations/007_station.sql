-- Imtihon stansiyasi (cefr.edumock.uz): tashkilotchi o'rnatgan parol bilan kiriladi — faqat Mock Test + Yozuvlar
ALTER TABLE registration_settings
  ADD COLUMN IF NOT EXISTS station_password_hash TEXT NULL,
  ADD COLUMN IF NOT EXISTS station_enabled BOOLEAN NOT NULL DEFAULT TRUE;
