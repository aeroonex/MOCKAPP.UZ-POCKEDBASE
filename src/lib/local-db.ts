import { openDB, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import { SpeakingQuestion, MoodEntry, RecordedSession } from './types';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

const DB_NAME = 'edumock_uz_db';
const DB_VERSION = 1;
const STORE_MOODS = 'mood_entries';
const STORE_RECORDINGS = 'recordings';

let db: IDBPDatabase;

async function initDB() {
  if (!db) {
    db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_MOODS)) {
          db.createObjectStore(STORE_MOODS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_RECORDINGS)) {
          db.createObjectStore(STORE_RECORDINGS, { keyPath: 'id' });
        }
      },
    });
  }
  return db;
}

// --- Speaking Questions (Supabase) ---

const getUserId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
};

export const getSupabaseQuestions = async (): Promise<SpeakingQuestion[]> => {
  const { data: { user } } = await supabase.auth.getUser();

  let query;
  if (user) {
    // Agar foydalanuvchi tizimga kirgan bo'lsa, faqat uning savollarini olamiz
    query = supabase.from('questions').select('*').eq('user_id', user.id);
  } else {
    // Agar mehmon bo'lsa (loginsiz), barcha savollarni olamiz
    query = supabase.from('questions').select('*');
  }

  const { data, error } = await query;

  if (error) {
    showError("Savollarni yuklashda xatolik: " + error.message);
    return [];
  }
  return data as SpeakingQuestion[];
};

export const addSupabaseQuestion = async (question: Omit<SpeakingQuestion, 'id' | 'date' | 'user_id'>): Promise<SpeakingQuestion | null> => {
  const userId = await getUserId();
  if (!userId) return null;

  const newQuestion = {
    ...question,
    id: uuidv4(),
    date: new Date().toISOString(),
    user_id: userId,
  };

  const { data, error } = await supabase
    .from('questions')
    .insert(newQuestion)
    .select()
    .single();

  if (error) {
    showError("Savolni saqlashda xatolik: " + error.message);
    return null;
  }
  return data as SpeakingQuestion;
};

export const updateSupabaseQuestion = async (updatedQuestion: SpeakingQuestion): Promise<SpeakingQuestion | null> => {
  const userId = await getUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from('questions')
    .update(updatedQuestion)
    .eq('id', updatedQuestion.id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    showError("Savolni yangilashda xatolik: " + error.message);
    return null;
  }
  return data as SpeakingQuestion;
};

export const deleteSupabaseQuestion = async (id: string): Promise<boolean> => {
  const userId = await getUserId();
  if (!userId) return false;

  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    showError("Savolni o'chirishda xatolik: " + error.message);
    return false;
  }
  return true;
};

export const resetSupabaseQuestionCooldowns = async (): Promise<boolean> => {
  const userId = await getUserId();
  if (!userId) return false;

  const { error } = await supabase
    .from('questions')
    .update({ last_used: null })
    .eq('user_id', userId);

  if (error) {
    showError("Cooldown'larni tiklashda xatolik: " + error.message);
    return false;
  }
  return true;
};


// --- Mood Entries (localStorage for now) ---
export const getLocalMoodEntries = (): MoodEntry[] => {
  const entriesJson = localStorage.getItem(STORE_MOODS);
  return entriesJson ? JSON.parse(entriesJson) : [];
};

export const saveLocalMoodEntries = (entries: MoodEntry[]) => {
  localStorage.setItem(STORE_MOODS, JSON.stringify(entries));
};

export const addLocalMoodEntry = (entry: Omit<MoodEntry, 'id' | 'date' | 'user_id'>): MoodEntry => {
  const newEntry: MoodEntry = {
    ...entry,
    id: uuidv4(),
    date: new Date().toISOString(),
    user_id: 'local_user',
  };
  const entries = getLocalMoodEntries();
  entries.push(newEntry);
  saveLocalMoodEntries(entries);
  return newEntry;
};

export const deleteLocalMoodEntry = (id: string) => {
  let entries = getLocalMoodEntries();
  entries = entries.filter(e => e.id !== id);
  saveLocalMoodEntries(entries);
};

// --- Recordings (IndexedDB for now) ---
interface StoredRecording {
  id: string;
  user_id: string;
  timestamp: string;
  duration: number;
  student_id?: string;
  student_name?: string;
  student_phone?: string;
  videoBlob: Blob;
}

export const getLocalRecordings = async (): Promise<RecordedSession[]> => {
  const db = await initDB();
  const storedRecordings: StoredRecording[] = await db.getAll(STORE_RECORDINGS);
  
  return storedRecordings.map(rec => ({
    ...rec,
    video_url: URL.createObjectURL(rec.videoBlob),
  }));
};

export const addLocalRecording = async (
  recording: Omit<RecordedSession, 'id' | 'timestamp' | 'user_id' | 'video_url'> & { videoBlob: Blob }
): Promise<void> => {
  const db = await initDB();
  const newRecording: StoredRecording = {
    ...recording,
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    user_id: 'local_user',
    videoBlob: recording.videoBlob,
  };
  await db.add(STORE_RECORDINGS, newRecording);
};

export const deleteLocalRecording = async (id: string) => {
  const db = await initDB();
  await db.delete(STORE_RECORDINGS, id);
};