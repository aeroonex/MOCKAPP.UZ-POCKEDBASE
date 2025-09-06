-- Jadvallar allaqachon mavjud bo'lsa, ularni o'chirish (faqat rivojlanish uchun)
DROP TABLE IF EXISTS public.speaking_questions;
DROP TABLE IF EXISTS public.mood_entries;

-- speaking_questions jadvalini yaratish
CREATE TABLE public.speaking_questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) NOT NULL, -- Yangi: Foydalanuvchi ID'si
    type text NOT NULL,
    date timestamp with time zone DEFAULT now() NOT NULL,
    last_used timestamp with time zone,
    question_text text,
    sub_questions jsonb, -- Array of strings for Part 1.1, Part 1.2
    image_urls jsonb -- Array of strings for image URLs
);

ALTER TABLE public.speaking_questions ENABLE ROW LEVEL SECURITY;

-- Yangi RLS siyosatlari: Faqat o'zining savollarini ko'rish, qo'shish, yangilash, o'chirish
CREATE POLICY "Allow read access for authenticated users to their own questions" ON public.speaking_questions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow insert access for authenticated users to their own questions" ON public.speaking_questions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow update access for authenticated users to their own questions" ON public.speaking_questions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow delete access for authenticated users to their own questions" ON public.speaking_questions FOR DELETE USING (auth.uid() = user_id);


-- mood_entries jadvalini yaratish
CREATE TABLE public.mood_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) NOT NULL, -- Yangi: Foydalanuvchi ID'si
    mood text NOT NULL,
    text text NOT NULL,
    date timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;

-- Yangi RLS siyosatlari: Faqat o'zining kayfiyat yozuvlarini ko'rish, qo'shish, yangilash, o'chirish
CREATE POLICY "Allow read access for authenticated users to their own mood entries" ON public.mood_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow insert access for authenticated users to their own mood entries" ON public.mood_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow update access for authenticated users to their own mood entries" ON public.mood_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow delete access for authenticated users to their own mood entries" ON public.mood_entries FOR DELETE USING (auth.uid() = user_id);