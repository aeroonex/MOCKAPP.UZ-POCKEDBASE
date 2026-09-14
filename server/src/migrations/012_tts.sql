-- Piper bilan oldindan sintez qilingan savol ovozlari (matn hash bo'yicha, foydalanuvchilar o'rtasida umumiy)
CREATE TABLE IF NOT EXISTS tts_audio (
  hash    TEXT PRIMARY KEY,
  voice   TEXT NOT NULL,
  text    TEXT NOT NULL,
  path    TEXT NOT NULL,
  created TIMESTAMPTZ NOT NULL DEFAULT now()
);
