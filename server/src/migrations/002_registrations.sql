-- Telegram bot orqali CEFR mock imtihoniga ro'yxatdan o'tish (Ro'yxat bo'limi)

-- Har bir tashkilotchi (platforma foydalanuvchisi) uchun bot sozlamalari.
-- reg_code — deep-link kodi: https://t.me/<bot>?start=<reg_code>
CREATE TABLE IF NOT EXISTS registration_settings (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  reg_code        TEXT NOT NULL UNIQUE,
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  -- Bepul rejim: to'lov (karta/chek/vaqt) qadamlari so'ralmaydi
  free_mode       BOOLEAN NOT NULL DEFAULT FALSE,
  center_name     TEXT NOT NULL DEFAULT '',
  exam_price      INTEGER NOT NULL DEFAULT 60000,
  card_number     TEXT NOT NULL DEFAULT '',
  card_holder     TEXT NOT NULL DEFAULT '',
  exam_info       TEXT NOT NULL DEFAULT '',
  contact_info    TEXT NOT NULL DEFAULT '',
  receipt_minutes INTEGER NOT NULL DEFAULT 10,
  created         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Talabalar arizalari. seq — tashkilotchi ichidagi tartib raqami (#001, #002 ...)
CREATE TABLE IF NOT EXISTS registrations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seq               INTEGER NOT NULL,
  telegram_id       BIGINT NOT NULL,
  telegram_username TEXT NOT NULL DEFAULT '',
  full_name         TEXT NOT NULL,
  phone             TEXT NOT NULL,
  center_name       TEXT NOT NULL DEFAULT '',
  amount            INTEGER NOT NULL DEFAULT 0,
  receipt_path      TEXT NULL,
  receipt_sent_at   TIMESTAMPTZ NULL,
  payment_time      TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  note              TEXT NOT NULL DEFAULT '',
  reviewed_at       TIMESTAMPTZ NULL,
  created           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, seq)
);
CREATE INDEX IF NOT EXISTS idx_registrations_user_status ON registrations (user_id, status, created DESC);
CREATE INDEX IF NOT EXISTS idx_registrations_telegram ON registrations (telegram_id);

-- Bot suhbat holati (har bir Telegram chat uchun qaysi qadamda turgani va yig'ilgan ma'lumotlar)
CREATE TABLE IF NOT EXISTS bot_sessions (
  chat_id  BIGINT PRIMARY KEY,
  user_id  UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  step     TEXT NOT NULL DEFAULT 'idle',
  data     JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['registration_settings', 'registrations'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_' || t || '_updated') THEN
      EXECUTE format('CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
    END IF;
  END LOOP;
END $$;
