-- O'quv markazlar ro'yxati (botda tugmalar bilan tanlash uchun).
-- Bo'sh massiv = kodda turgan standart ro'yxat ishlatiladi (centers.ts / DEFAULT_CENTERS).
ALTER TABLE registration_settings
  ADD COLUMN IF NOT EXISTS centers JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Markaz nomi bo'yicha statistika tez guruhlanishi uchun
CREATE INDEX IF NOT EXISTS idx_registrations_center ON registrations (user_id, center_name);
