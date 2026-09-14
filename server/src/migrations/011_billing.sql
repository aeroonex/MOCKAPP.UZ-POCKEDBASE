-- Billing (obuna): admin belgilagan summa/rekvizit, foydalanuvchi chek yuboradi, admin tasdiqlasa muddat uzayadi

-- Tizim bo'yicha yagona billing sozlamasi (id = 1)
CREATE TABLE IF NOT EXISTS billing_settings (
  id           INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  amount       INTEGER NOT NULL DEFAULT 0,
  card_number  TEXT NOT NULL DEFAULT '',
  card_holder  TEXT NOT NULL DEFAULT '',
  period_days  INTEGER NOT NULL DEFAULT 30,
  remind_days  INTEGER NOT NULL DEFAULT 5,
  note         TEXT NOT NULL DEFAULT '',
  updated      TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO billing_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Foydalanuvchi obunasi qachongacha amal qiladi (NULL = hech qachon to'lamagan → nofaol)
ALTER TABLE users ADD COLUMN IF NOT EXISTS paid_until TIMESTAMPTZ NULL;
-- Mavjud foydalanuvchilarga 30 kun (tizim yangilanganda birdan yopilib qolmasin)
UPDATE users SET paid_until = now() + interval '30 days' WHERE paid_until IS NULL AND role <> 'developer';

-- To'lov so'rovlari (chek rasmi bilan)
CREATE TABLE IF NOT EXISTS payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount           INTEGER NOT NULL DEFAULT 0,
  receipt_path     TEXT NOT NULL,
  note             TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note       TEXT NOT NULL DEFAULT '',
  reviewed_at      TIMESTAMPTZ NULL,
  reviewed_by      UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  paid_until_after TIMESTAMPTZ NULL,
  created          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments (user_id, created DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status, created DESC);

-- Ro'yxatdan o'tishda o'quvchining ustozi ismi (bot: markazdan keyingi savol)
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS teacher_name TEXT NOT NULL DEFAULT '';
