-- Kirish sessiyalari va hodisalari: kim, qachon, qaysi paneldan, qayerdan (IP/joylashuv), qurilma
CREATE TABLE IF NOT EXISTS auth_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- kirish turi: asosiy sayt (dashboard), imtihon stansiyasi, superadmin panel
  panel         TEXT NOT NULL DEFAULT 'dashboard' CHECK (panel IN ('dashboard', 'station', 'admin')),
  ip            TEXT NOT NULL DEFAULT '',
  user_agent    TEXT NOT NULL DEFAULT '',
  device        TEXT NOT NULL DEFAULT '',   -- "Chrome · Windows" kabi qisqa
  country       TEXT NOT NULL DEFAULT '',
  city          TEXT NOT NULL DEFAULT '',
  -- oxirgi faollik (har so'rovda yangilanadi) — onlayn holatini shu belgilaydi
  last_seen     TIMESTAMPTZ NOT NULL DEFAULT now(),
  login_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- foydalanuvchi chiqqanda yoki tugatilganda
  ended_at      TIMESTAMPTZ NULL,
  requests      BIGINT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON auth_sessions (user_id, last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_seen ON auth_sessions (last_seen DESC);

-- Kirish urinishlari jurnali (muvaffaqiyatli va muvaffaqiyatsiz) — nazorat va xavfsizlik uchun
CREATE TABLE IF NOT EXISTS login_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  identity    TEXT NOT NULL DEFAULT '',      -- kiritilgan email/username (muvaffaqiyatsizda ham)
  panel       TEXT NOT NULL DEFAULT 'dashboard',
  success     BOOLEAN NOT NULL DEFAULT TRUE,
  reason      TEXT NOT NULL DEFAULT '',      -- muvaffaqiyatsizlik sababi
  ip          TEXT NOT NULL DEFAULT '',
  device      TEXT NOT NULL DEFAULT '',
  country     TEXT NOT NULL DEFAULT '',
  city        TEXT NOT NULL DEFAULT '',
  created     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_login_events_user ON login_events (user_id, created DESC);
CREATE INDEX IF NOT EXISTS idx_login_events_created ON login_events (created DESC);

-- users jadvaliga oxirgi kirish ma'lumotlari (tez ko'rsatish uchun)
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at   TIMESTAMPTZ NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at    TIMESTAMPTZ NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip   TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count     INTEGER NOT NULL DEFAULT 0;

-- Kirishda olingan kamera kadri (ochiq tekshiruv) — faqat admin ko'radi
ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS photo_path TEXT NOT NULL DEFAULT '';
ALTER TABLE login_events ADD COLUMN IF NOT EXISTS photo_path TEXT NOT NULL DEFAULT '';
