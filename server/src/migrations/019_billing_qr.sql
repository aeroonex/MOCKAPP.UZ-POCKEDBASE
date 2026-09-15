-- To'lov QR kodi (Paynet/Click/Payme — bank ilovasi kamerasi bilan skanerlanadi).
-- Bo'sh bo'lsa eski holat: karta raqami ko'rsatiladi.
ALTER TABLE billing_settings ADD COLUMN IF NOT EXISTS qr_url TEXT NOT NULL DEFAULT '';
