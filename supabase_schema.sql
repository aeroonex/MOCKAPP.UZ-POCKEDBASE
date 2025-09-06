-- Jadvallar allaqachon mavjud bo'lsa, ularni o'chirish (faqat rivojlanish uchun)
-- DROP TABLE IF EXISTS public.speaking_questions;
-- DROP TABLE IF EXISTS public.mood_entries;

-- speaking_questions jadvalini yaratish
CREATE TABLE public.speaking_questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type text NOT NULL,
    date timestamp with time zone DEFAULT now() NOT NULL,
    last_used timestamp with time zone,
    question_text text,
    sub_questions jsonb, -- Array of strings for Part 1.1, Part 1.2
    image_urls jsonb -- Array of strings for image URLs
);

ALTER TABLE public.speaking_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for all users" ON public.speaking_questions FOR SELECT USING (true);
CREATE POLICY "Allow insert access for authenticated users" ON public.speaking_questions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow update access for authenticated users" ON public.speaking_questions FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow delete access for authenticated users" ON public.speaking_questions FOR DELETE USING (auth.role() = 'authenticated');


-- mood_entries jadvalini yaratish
CREATE TABLE public.mood_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mood text NOT NULL,
    text text NOT NULL,
    date timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for all users" ON public.mood_entries FOR SELECT USING (true);
CREATE POLICY "Allow insert access for authenticated users" ON public.mood_entries FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow update access for authenticated users" ON public.mood_entries FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow delete access for authenticated users" ON public.mood_entries FOR DELETE USING (auth.role() = 'authenticated');