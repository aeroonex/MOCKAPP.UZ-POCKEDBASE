-- Enable Row Level Security for all tables
ALTER TABLE public.speaking_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to manage their own questions" ON public.speaking_questions;
DROP POLICY IF EXISTS "Allow authenticated users to manage their own recordings" ON public.recordings;
DROP POLICY IF EXISTS "Allow authenticated users to manage their own mood entries" ON public.mood_entries;
DROP POLICY IF EXISTS "Allow public read access to question images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload question images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own question images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to manage their own recordings storage" ON storage.objects;


-- Policies for 'speaking_questions' table
CREATE POLICY "Allow authenticated users to manage their own questions"
ON public.speaking_questions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policies for 'recordings' table
CREATE POLICY "Allow authenticated users to manage their own recordings"
ON public.recordings
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policies for 'mood_entries' table
CREATE POLICY "Allow authenticated users to manage their own mood entries"
ON public.mood_entries
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- Policies for 'question-images' bucket in Storage
CREATE POLICY "Allow public read access to question images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'question-images');

CREATE POLICY "Allow authenticated users to upload question images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'question-images' AND
  auth.uid() = (storage.foldername(name))[1]::uuid
);

CREATE POLICY "Allow authenticated users to delete their own question images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'question-images' AND
  auth.uid() = (storage.foldername(name))[1]::uuid
);

-- Policies for 'recordings' bucket in Storage
CREATE POLICY "Allow authenticated users to manage their own recordings storage"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'recordings' AND
  auth.uid() = (storage.foldername(name))[1]::uuid
)
WITH CHECK (
  bucket_id = 'recordings' AND
  auth.uid() = (storage.foldername(name))[1]::uuid
);