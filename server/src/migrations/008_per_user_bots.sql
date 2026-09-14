-- Har bir tashkilotchi o'z Telegram boti bilan: token + username sozlamalarda saqlanadi,
-- botga /start bilan kirgan har kim (deep-link'siz) shu tashkilotchiga bog'lanadi.
ALTER TABLE registration_settings
  ADD COLUMN IF NOT EXISTS bot_token    TEXT NULL,
  ADD COLUMN IF NOT EXISTS bot_username TEXT NOT NULL DEFAULT '';

-- Bot sessiyalari endi (bot egasi, chat) bo'yicha — bitta odam bir nechta tashkilotchi botidan foydalanishi mumkin.
-- Sessiyalar vaqtinchalik — eski yozuvlar tozalanadi.
DELETE FROM bot_sessions;
ALTER TABLE bot_sessions DROP CONSTRAINT IF EXISTS bot_sessions_pkey;
ALTER TABLE bot_sessions ADD COLUMN IF NOT EXISTS owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE bot_sessions ADD PRIMARY KEY (owner_id, chat_id);
