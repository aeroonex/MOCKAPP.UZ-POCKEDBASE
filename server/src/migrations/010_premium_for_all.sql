-- Hamma foydalanuvchi (adminlar ham) Premium tarif, 100 GB xotira — sukut bo'yicha ham
ALTER TABLE users ALTER COLUMN tariff_name SET DEFAULT 'Premium';
ALTER TABLE users ALTER COLUMN storage_limit_bytes SET DEFAULT 107374182400;
UPDATE users SET tariff_name = 'Premium', storage_limit_bytes = 107374182400
WHERE tariff_name <> 'Premium' OR storage_limit_bytes < 107374182400;
