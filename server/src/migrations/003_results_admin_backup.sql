-- Natijalar (4 ko'nikma ballari), Speaking yozuvini arizaga bog'lash,
-- Telegram admin panel (video zaxira) va serverdan avtomatik tozalash.

-- Ballar: Listening / Reading / Writing / Speaking (NULL = hali kiritilmagan)
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS score_listening NUMERIC(5,1) NULL,
  ADD COLUMN IF NOT EXISTS score_reading   NUMERIC(5,1) NULL,
  ADD COLUMN IF NOT EXISTS score_writing   NUMERIC(5,1) NULL,
  ADD COLUMN IF NOT EXISTS score_speaking  NUMERIC(5,1) NULL;

-- Speaking videosi qaysi arizaga tegishli; Telegram'ga zaxiralangan vaqti; serverdan o'chirilgan vaqti
ALTER TABLE recordings
  ADD COLUMN IF NOT EXISTS registration_id  UUID NULL REFERENCES registrations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tg_backup_at     TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS tg_backup_error  TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS video_deleted_at TIMESTAMPTZ NULL;
CREATE INDEX IF NOT EXISTS idx_recordings_registration ON recordings (registration_id);

-- Admin panel: maxfiy deep-link kodi va ulangan Telegram chat; videolarni serverda saqlash muddati (kun, 0 = cheksiz)
ALTER TABLE registration_settings
  ADD COLUMN IF NOT EXISTS admin_code           TEXT NULL UNIQUE,
  ADD COLUMN IF NOT EXISTS admin_chat_id        BIGINT NULL,
  ADD COLUMN IF NOT EXISTS admin_chat_title     TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS video_retention_days INTEGER NOT NULL DEFAULT 15;

-- "Topshirilmagan" belgisi (skill imtihoniga kelmagan): overall'da hisobga olinmaydi, o'quvchiga sababi bilan boradi
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS skip_listening BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS skip_reading   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS skip_writing   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS skip_speaking  BOOLEAN NOT NULL DEFAULT FALSE,
  -- Natijalar o'quvchiga bot orqali yuborilgan vaqti (NULL = hali e'lon qilinmagan); xato bo'lsa sababi
  ADD COLUMN IF NOT EXISTS results_published_at  TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS results_publish_error TEXT NOT NULL DEFAULT '';

-- Telegram'ga yuborilgan video file_id — o'quvchiga natija bilan qayta yuklamasdan yuborish uchun
ALTER TABLE recordings
  ADD COLUMN IF NOT EXISTS tg_file_id TEXT NOT NULL DEFAULT '';
