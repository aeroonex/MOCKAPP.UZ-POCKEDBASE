-- Arxiv: natijalari yakunlangan o'quvchilar Ro'yxat/Natijalardan olib, kunlik "pack"larga (archived_at sanasi) guruhlanadi
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;
CREATE INDEX IF NOT EXISTS idx_registrations_archived ON registrations (user_id, archived_at DESC);
