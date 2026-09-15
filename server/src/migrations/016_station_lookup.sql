-- Stansiya paroli uchun tez izlash kaliti.
-- Ilgari kirishda BARCHA tashkilotchilarning scrypt xeshlari bitta-bitta tekshirilardi
-- (50 markazda ~4 sekund CPU va libuv thread pool band bo'lardi). Endi parol bo'yicha
-- to'g'ridan-to'g'ri bitta qator topiladi, so'ng scrypt bilan bir marta tasdiqlanadi.
-- Bu kalit parolni tekshirish uchun emas — faqat izlash uchun (tasdiqlash scrypt bilan).
ALTER TABLE registration_settings ADD COLUMN IF NOT EXISTS station_password_lookup TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_station_lookup
  ON registration_settings (station_password_lookup)
  WHERE station_password_lookup IS NOT NULL;

-- Bir foydalanuvchida bir vaqtda faqat bitta "pending" to'lov bo'lishi mumkin
-- (ilgari ikki so'rov bir vaqtda kelsa ikkita yaratilishi mumkin edi).
DELETE FROM payments p
  USING payments q
 WHERE p.user_id = q.user_id AND p.status = 'pending' AND q.status = 'pending' AND p.created < q.created;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_one_pending
  ON payments (user_id) WHERE status = 'pending';
