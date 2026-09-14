-- Superadmin bildirishnoma boti: ulangan chatlar va bir martalik magic tokenlar
CREATE TABLE IF NOT EXISTS admin_bot_chats (
  chat_id  BIGINT PRIMARY KEY,
  title    TEXT NOT NULL DEFAULT '',
  created  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_bot_tokens (
  token    TEXT PRIMARY KEY,
  created  TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at  TIMESTAMPTZ NULL
);
