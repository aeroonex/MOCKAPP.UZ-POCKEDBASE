-- A4 chiptalar (PDF): pastki matn (masalan, Telegram kanal) va QR kod havolasi (bo'sh — bot havolasi ishlatiladi)
ALTER TABLE registration_settings
  ADD COLUMN IF NOT EXISTS ticket_footer TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ticket_qr_url TEXT NOT NULL DEFAULT '';
