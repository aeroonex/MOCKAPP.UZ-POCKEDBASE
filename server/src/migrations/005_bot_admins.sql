-- Admin bot paneli: bir nechta admin chat (hammasiga bir vaqtda yuboriladi) va bir martalik taklif havolalari

CREATE TABLE IF NOT EXISTS bot_admins (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_id   BIGINT NOT NULL,
  title     TEXT NOT NULL DEFAULT '',
  username  TEXT NOT NULL DEFAULT '',
  added_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, chat_id)
);

-- Taklif kodi: /start adm_<code>; used_at belgilangach yoki expires_at o'tgach yaroqsiz
CREATE TABLE IF NOT EXISTS admin_invites (
  code         TEXT PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  used_at      TIMESTAMPTZ NULL,
  used_chat_id BIGINT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_invites_user ON admin_invites (user_id, created_at DESC);

-- Eski (yagona) admin chatni yangi jadvalga ko'chiramiz
INSERT INTO bot_admins (user_id, chat_id, title)
SELECT user_id, admin_chat_id, admin_chat_title FROM registration_settings WHERE admin_chat_id IS NOT NULL
ON CONFLICT (user_id, chat_id) DO NOTHING;
