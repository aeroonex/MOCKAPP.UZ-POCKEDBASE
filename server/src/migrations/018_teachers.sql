-- Markaz -> ustozlar ro'yxati (botda tugmalar bilan tanlash uchun).
-- {} = kodda turgan standart ro'yxat (teachers.ts): Younine Academy va CEFR Centre uchun.
ALTER TABLE registration_settings
  ADD COLUMN IF NOT EXISTS teachers JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Statistikada "markaz -> ustozlar" bo'yicha guruhlash uchun
CREATE INDEX IF NOT EXISTS idx_registrations_center_teacher
  ON registrations (user_id, center_name, teacher_name);
