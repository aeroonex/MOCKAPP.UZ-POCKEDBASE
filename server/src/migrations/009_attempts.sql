-- Speaking urinishlari: ro'yxatdagi o'quvchi ko'pi bilan attempt_limit (sukut 3) marta test topshira oladi
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS attempts      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attempt_limit INTEGER NOT NULL DEFAULT 3;
-- Yozuv qaysi urinishda yozilgani (1..limit)
ALTER TABLE recordings
  ADD COLUMN IF NOT EXISTS attempt INTEGER NULL;
