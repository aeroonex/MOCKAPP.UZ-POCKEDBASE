import { openDB, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import { SpeakingQuestion, MoodEntry, RecordedSession } from './types';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import i18n from '@/i18n';

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

const getUserId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
};

export const getSupabaseQuestions = async (): Promise<SpeakingQuestion[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  let filterString = 'user_id.is.null'; // Har doim ommaviy savollarni qo'shish

  if (userId) {
    filterString = `user_id.eq.${userId},${filterString}`; // Agar foydalanuvchi tizimga kirgan bo'lsa, uning savollarini ham qo'shish
  }

  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .or(filterString);

  if (error) {
    showError(i18n.t("add_question_page.error_loading_entries", { message: error.message }));
    return [];
  }
  return data as SpeakingQuestion[];
};

export const addSupabaseQuestion = async (question: Omit<SpeakingQuestion, 'id' | 'date' | 'user_id'>): Promise<SpeakingQuestion | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  if (!userId) {
    showError(i18n.t("add_question_page.error_saving_entry", { message: "Foydalanuvchi ID topilmadi. Mehmon rejimida savol qo'shib bo'lmaydi." }));
    return null;
  }

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
    showError(i18n.t("add_question_page.error_saving_entry", { message: error.message }));
    return null;
  }
  return data as SpeakingQuestion;
};

export const updateSupabaseQuestion = async (updatedQuestion: SpeakingQuestion): Promise<SpeakingQuestion | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  let query = supabase
    .from('questions')
    .update(updatedQuestion)
    .eq('id', updatedQuestion.id);

  if (userId) {
    // Authenticated user can only update their own questions
    query = query.eq('user_id', userId);
  } else {
    // Guest user can only update public sample questions (user_id is NULL)
    query = query.eq('user_id', null);
  }

  const { data, error } = await query.select().single();

  if (error) {
    showError(i18n.t("add_question_page.error_saving_entry", { message: error.message }));
    return null;
  }
  return data as SpeakingQuestion;
};

export const deleteSupabaseQuestion = async (id: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  let query = supabase
    .from('questions')
    .delete()
    .eq('id', id);

  if (userId) {
    query = query.eq('user_id', userId);
  } else {
    // Guest users cannot delete any questions, even public ones.
    // This prevents guests from modifying the sample data.
    showError(i18n.t("add_question_page.error_deleting_entry", { message: "Mehmon rejimida savolni o'chirib bo'lmaydi." }));
    return false;
  }

  const { error } = await query;

  if (error) {
    showError(i18n.t("add_question_page.error_deleting_entry", { message: error.message }));
    return false;
  }
  return true;
};

export const resetSupabaseQuestionCooldowns = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  let query = supabase
    .from('questions')
    .update({ last_used: null });

  if (userId) {
    query = query.eq('user_id', userId);
  } else {
    // Guest user can reset cooldowns for public sample questions
    query = query.eq('user_id', null);
  }

  const { error } = await query;

  if (error) {
    showError(i18n.t("add_question_page.error_saving_entry", { message: error.message }));
    return false;
  }
  return true;
};

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