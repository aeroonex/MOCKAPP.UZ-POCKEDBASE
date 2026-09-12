-- Mockapp.uz — boshlang'ich sxema (PostgreSQL 16)

CREATE TABLE IF NOT EXISTS users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email               TEXT NOT NULL UNIQUE,
  username            TEXT NOT NULL UNIQUE,
  password_hash       TEXT NOT NULL,
  first_name          TEXT NOT NULL DEFAULT '',
  last_name           TEXT NOT NULL DEFAULT '',
  bio                 TEXT NOT NULL DEFAULT '',
  avatar_url          TEXT NOT NULL DEFAULT '',
  role                TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'developer')),
  tariff_name         TEXT NOT NULL DEFAULT 'Basic' CHECK (tariff_name IN ('Basic', 'Premium')),
  storage_limit_bytes BIGINT NOT NULL DEFAULT 2147483648,
  storage_used_bytes  BIGINT NOT NULL DEFAULT 0,
  verified            BOOLEAN NOT NULL DEFAULT FALSE,
  blocked             BOOLEAN NOT NULL DEFAULT FALSE,
  created             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL = ommaviy (mehmon rejimi) savollar
  user_id       UUID NULL REFERENCES users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('Part 1.1', 'Part 1.2', 'Part 2', 'Part 3')),
  sub_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  question_text TEXT NOT NULL DEFAULT '',
  image_urls    JSONB NOT NULL DEFAULT '[]'::jsonb,
  date          TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used     TIMESTAMPTZ NULL,
  created       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_questions_user_type ON questions (user_id, type);

CREATE TABLE IF NOT EXISTS images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  path       TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  mime       TEXT NOT NULL DEFAULT '',
  created    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_images_user ON images (user_id);

CREATE TABLE IF NOT EXISTS recordings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id      TEXT NOT NULL,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "timestamp"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration      INTEGER NOT NULL DEFAULT 0,
  student_id    TEXT NOT NULL DEFAULT '',
  student_name  TEXT NOT NULL DEFAULT '',
  student_phone TEXT NOT NULL DEFAULT '',
  video_path    TEXT NULL,
  size_bytes    BIGINT NOT NULL DEFAULT 0,
  cloud_url     TEXT NOT NULL DEFAULT '',
  created       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (local_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_recordings_user ON recordings (user_id);

-- updated ustunini avtomatik yangilash
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users', 'questions', 'recordings'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_' || t || '_updated') THEN
      EXECUTE format('CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
    END IF;
  END LOOP;
END $$;
