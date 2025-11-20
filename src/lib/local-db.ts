import { openDB, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import { SpeakingQuestion, MoodEntry, RecordedSession } from './types';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import i18n from '@/i18n';

const DB_NAME = 'edumock_uz_db';
const DB_VERSION = 1;
const STORE_MOODS = 'mood_entries';
const STORE_RECORDINGS = 'recordings'; // IndexedDB uchun

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
  const isGuestMode = localStorage.getItem("isGuestMode") === "true"; // Mehmon rejimini tekshirish

  let query = supabase.from('questions').select('*');

  if (isGuestMode) {
    // Mehmon rejimida faqat user_id NULL bo'lgan savollarni ko'rsatish
    query = query.is('user_id', null);
  } else if (userId) {
    // Tizimga kirgan foydalanuvchi uchun faqat o'zining savollarini ko'rsatish
    query = query.eq('user_id', userId);
  } else {
    // Tizimga kirmagan va mehmon rejimida bo'lmagan foydalanuvchi uchun savollar yo'q
    return [];
  }

  const { data, error } = await query;

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
  supabase_url?: string; // Supabase'ga yuklangan videoning ommaviy URL manzili
}

// Yangi: Supabase jadvaliga yozuv metama'lumotlarini qo'shish
const insertRecordingMetadataToSupabase = async (recording: Omit<RecordedSession, 'video_url'>): Promise<void> => {
  const { error } = await supabase
    .from('recordings_metadata')
    .insert({
      id: recording.id,
      user_id: recording.user_id,
      timestamp: recording.timestamp,
      duration: recording.duration,
      student_id: recording.student_id,
      student_name: recording.student_name,
      student_phone: recording.student_phone,
      supabase_url: recording.supabase_url,
    });

  if (error) {
    console.error("Error inserting recording metadata to Supabase:", error.message);
    showError(i18n.t("records_page.error_uploading_to_cloud", { message: error.message }));
  }
};

// Yangi: Supabase jadvalidagi yozuv metama'lumotlarini yangilash
const updateRecordingMetadataInSupabase = async (recordingId: string, supabaseUrl: string): Promise<void> => {
  const userId = await getUserId();
  if (!userId) return;

  const { error } = await supabase
    .from('recordings_metadata')
    .update({ supabase_url: supabaseUrl })
    .eq('id', recordingId)
    .eq('user_id', userId);

  if (error) {
    console.error("Error updating recording metadata in Supabase:", error.message);
    showError(i18n.t("records_page.error_uploading_to_cloud", { message: error.message }));
  }
};

// Yangi: Supabase jadvalidan yozuv metama'lumotlarini o'chirish
const deleteRecordingMetadataFromSupabase = async (recordingId: string): Promise<void> => {
  const userId = await getUserId();
  if (!userId) return;

  const { error } = await supabase
    .from('recordings_metadata')
    .delete()
    .eq('id', recordingId)
    .eq('user_id', userId);

  if (error) {
    console.error("Error deleting recording metadata from Supabase:", error.message);
    showError(i18n.t("records_page.error_deleting_from_cloud", { message: error.message }));
  }
};


export const getLocalRecordings = async (): Promise<RecordedSession[]> => {
  const db = await initDB();
  const storedRecordings: StoredRecording[] = await db.getAll(STORE_RECORDINGS);
  
  const userId = await getUserId();
  let allRecordings: RecordedSession[] = [];

  if (userId) {
    // Authenticated user: Fetch from Supabase metadata table first
    const { data, error } = await supabase
      .from('recordings_metadata')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      showError(i18n.t("records_page.error_loading_recordings", { message: error.message }));
    } else if (data) {
      allRecordings = data.map(rec => ({
        id: rec.id,
        user_id: rec.user_id,
        timestamp: rec.timestamp,
        duration: rec.duration,
        student_id: rec.student_id || undefined,
        student_name: rec.student_name || undefined,
        student_phone: rec.student_phone || undefined,
        video_url: rec.supabase_url, // Supabase URL'ni video_url sifatida ishlatamiz
        supabase_url: rec.supabase_url,
      }));
    }

    // Filter out local recordings that are already uploaded to Supabase
    const uploadedSupabaseIds = new Set(allRecordings.map(r => r.id));
    const unuploadedLocalRecordings = storedRecordings.filter(rec => !uploadedSupabaseIds.has(rec.id));

    // Add unuploaded local recordings to the list
    unuploadedLocalRecordings.forEach(rec => {
      allRecordings.push({
        ...rec,
        video_url: URL.createObjectURL(rec.videoBlob),
      });
    });

  } else {
    // Guest mode or not logged in: Fetch only from IndexedDB
    storedRecordings.forEach(rec => {
      allRecordings.push({
        ...rec,
        video_url: URL.createObjectURL(rec.videoBlob),
      });
    });
  }
  
  return allRecordings;
};

export const getRecordingBlob = async (id: string): Promise<Blob | undefined> => {
  const db = await initDB();
  const recording = await db.get(STORE_RECORDINGS, id);
  return recording?.videoBlob;
};

export const addLocalRecording = async (
  recording: Omit<RecordedSession, 'id' | 'timestamp' | 'user_id' | 'video_url'> & { videoBlob: Blob, supabase_url?: string }
): Promise<string> => {
  const db = await initDB();
  const newRecordingId = uuidv4();
  const currentTimestamp = new Date().toISOString();
  const userId = await getUserId() || 'local_user';

  const newRecording: StoredRecording = {
    ...recording,
    id: newRecordingId,
    timestamp: currentTimestamp,
    user_id: userId,
    videoBlob: recording.videoBlob,
    supabase_url: recording.supabase_url,
  };
  await db.add(STORE_RECORDINGS, newRecording);

  // Agar foydalanuvchi tizimga kirgan bo'lsa va supabase_url mavjud bo'lsa, metama'lumotlarni Supabase jadvaliga ham qo'shamiz
  if (userId !== 'local_user' && recording.supabase_url) {
    await insertRecordingMetadataToSupabase({
      id: newRecordingId,
      user_id: userId,
      timestamp: currentTimestamp,
      duration: recording.duration,
      student_id: recording.student_id,
      student_name: recording.student_name,
      student_phone: recording.student_phone,
      supabase_url: recording.supabase_url,
    });
  }

  return newRecordingId;
};

export const updateLocalRecordingSupabaseUrl = async (id: string, supabaseUrl: string): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(STORE_RECORDINGS, 'readwrite');
  const store = tx.objectStore(STORE_RECORDINGS);
  const recording = await store.get(id);
  if (recording) {
    recording.supabase_url = supabaseUrl;
    await store.put(recording);

    // Agar foydalanuvchi tizimga kirgan bo'lsa, Supabase jadvalidagi URL manzilini ham yangilaymiz
    const userId = await getUserId();
    if (userId !== 'local_user') {
      await updateRecordingMetadataInSupabase(id, supabaseUrl);
    }
  }
  await tx.done;
};

export const deleteLocalRecording = async (id: string) => {
  const db = await initDB();
  const recording = await db.get(STORE_RECORDINGS, id);

  if (recording?.supabase_url) {
    const userId = await getUserId();
    if (userId) {
      const filePath = `${userId}/${id}.webm`; // Assuming .webm format and user_id/recording_id.webm path
      const { error: deleteError } = await supabase.storage
        .from('recordings')
        .remove([filePath]);

      if (deleteError) {
        showError(i18n.t("records_page.error_deleting_from_cloud", { message: deleteError.message }));
      } else {
        // Supabase Storage'dan o'chirilgandan so'ng, metama'lumotlarni ham o'chiramiz
        await deleteRecordingMetadataFromSupabase(id);
      }
    }
  }
  await db.delete(STORE_RECORDINGS, id);
};