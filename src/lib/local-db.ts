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
  console.log("[getUserId] Current authenticated user ID:", user?.id || "null");
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
  const { data: { user } = {} } = await supabase.auth.getUser();
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
  videoBlob: Blob; // This is the actual blob stored in IndexedDB
  supabase_url?: string; // Supabase'ga yuklangan videoning ommaviy URL manzili
}

// Yangi: Supabase jadvaliga yozuv metama'lumotlarini kiritish yoki yangilash
export const upsertRecordingMetadataToSupabase = async (recording: Omit<RecordedSession, 'video_url' | 'isLocalBlobAvailable'>): Promise<void> => {
  const { error } = await supabase
    .from('recordings_metadata')
    .upsert({
      id: recording.id,
      user_id: recording.user_id,
      timestamp: recording.timestamp,
      duration: recording.duration,
      student_id: recording.student_id,
      student_name: recording.student_name,
      student_phone: recording.student_phone,
      supabase_url: recording.supabase_url,
    }, { onConflict: 'id' }); // Agar ID mavjud bo'lsa, yangilaydi

  if (error) {
    console.error("Error upserting recording metadata to Supabase:", error.message);
    showError(i18n.t("records_page.error_uploading_to_cloud", { message: error.message }));
  }
};

// Yangi: Supabase jadvalidan yozuv metama'lumotlarini o'chirish
const deleteRecordingMetadataFromSupabase = async (recordingId: string): Promise<boolean> => {
  const userId = await getUserId();
  if (!userId) {
    console.error("[Delete Metadata] Cannot delete recording metadata from Supabase: User not authenticated.");
    return false;
  }

  console.log(`[Delete Metadata] Attempting to delete metadata from Supabase DB for recording ID: ${recordingId}, by user ID: ${userId}`);
  const { error } = await supabase
    .from('recordings_metadata')
    .delete()
    .eq('id', recordingId)
    .eq('user_id', userId);

  if (error) {
    console.error("[Delete Metadata] Error deleting recording metadata from Supabase:", error.message);
    showError(i18n.t("records_page.error_deleting_from_cloud", { message: error.message }));
    return false;
  }
  console.log(`[Delete Metadata] Successfully deleted metadata from Supabase DB for ID: ${recordingId}`);
  return true;
};

// Helper function to encapsulate cloud deletion logic
const deleteCloudRecording = async (recordingId: string, userId: string): Promise<boolean> => {
  console.log(`[Delete Cloud] Attempting to delete from Supabase Storage: ${userId}/${recordingId}.webm`);
  const { error: deleteStorageError } = await supabase.storage
    .from('recordings')
    .remove([`${userId}/${recordingId}.webm`]);

  if (deleteStorageError) {
    console.error(`[Delete Cloud] Error deleting from Supabase Storage for ID ${recordingId}:`, deleteStorageError.message);
    showError(i18n.t("records_page.error_deleting_from_cloud", { message: deleteStorageError.message }));
    return false;
  } else {
    console.log(`[Delete Cloud] Successfully deleted from Supabase Storage: ${userId}/${recordingId}.webm`);
    // Storage'dan o'chirilgandan so'ng, metama'lumotlarni ham o'chiramiz
    const metadataDeleted = await deleteRecordingMetadataFromSupabase(recordingId);
    if (!metadataDeleted) {
      console.error(`[Delete Cloud] Failed to delete metadata from Supabase DB for ID: ${recordingId}.`);
      return false;
    } else {
      console.log(`[Delete Cloud] Successfully deleted metadata from Supabase DB for ID: ${recordingId}`);
      return true;
    }
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
      allRecordings = data.map(rec => {
        // Check if this recording also exists locally in IndexedDB
        const localVersion = storedRecordings.find(sRec => sRec.id === rec.id);
        return {
          id: rec.id,
          user_id: rec.user_id,
          timestamp: rec.timestamp,
          duration: rec.duration,
          student_id: rec.student_id || undefined,
          student_name: rec.student_name || undefined,
          student_phone: rec.student_phone || undefined,
          video_url: rec.supabase_url, // Supabase URL'ni video_url sifatida ishlatamiz
          supabase_url: rec.supabase_url,
          isLocalBlobAvailable: !!localVersion, // If localVersion exists, then local blob is available
        };
      });
    }

    // Add unuploaded local recordings to the list
    // These are recordings that are in IndexedDB but NOT in Supabase metadata
    const uploadedSupabaseIds = new Set(allRecordings.map(r => r.id));
    const unuploadedLocalRecordings = storedRecordings.filter(rec => !uploadedSupabaseIds.has(rec.id));

    unuploadedLocalRecordings.forEach(rec => {
      allRecordings.push({
        ...rec,
        video_url: URL.createObjectURL(rec.videoBlob),
        isLocalBlobAvailable: true, // It's a local recording, so blob is available
      });
    });

  } else {
    // Guest mode or not logged in: Fetch only from IndexedDB
    storedRecordings.forEach(rec => {
      allRecordings.push({
        ...rec,
        video_url: URL.createObjectURL(rec.videoBlob),
        isLocalBlobAvailable: true, // It's a local recording, so blob is available
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
  recording: Omit<RecordedSession, 'id' | 'timestamp' | 'user_id' | 'video_url' | 'isLocalBlobAvailable'> & { videoBlob: Blob }
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
    supabase_url: undefined, // Initially, no supabase_url
  };
  await db.add(STORE_RECORDINGS, newRecording);

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
  }
  await tx.done;
};

export const deleteLocalRecording = async (id: string): Promise<boolean> => {
  const db = await initDB();
  const recording = await db.get(STORE_RECORDINGS, id);

  let supabaseDeletionSuccessful = true; // Assume success if not uploaded to Supabase
  let localDeletionPerformed = false;

  console.log(`[Delete] Starting deletion for recording ID: ${id}. Supabase URL present in IndexedDB: ${!!recording?.supabase_url}`);

  if (!recording) {
    console.warn(`[Delete] Recording with ID ${id} not found in IndexedDB. Checking Supabase metadata.`);
    const userId = await getUserId();
    if (userId) {
      const { data: supabaseMetadata, error: metadataError } = await supabase
        .from('recordings_metadata')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (metadataError && metadataError.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error(`[Delete] Error fetching metadata for ID ${id} from Supabase:`, metadataError.message);
        showError(i18n.t("records_page.error_deleting_from_cloud", { message: metadataError.message }));
        return false; // Failed to even check Supabase
      }

      if (supabaseMetadata) {
        console.log(`[Delete] Found metadata in Supabase for ID ${id} even though not in IndexedDB. Attempting cloud deletion.`);
        supabaseDeletionSuccessful = await deleteCloudRecording(id, userId);
        if (supabaseDeletionSuccessful) {
          console.log(`[Delete] Successfully deleted cloud-only recording metadata for ID: ${id}`);
          return true; // Successfully deleted from cloud
        } else {
          console.error(`[Delete] Failed to delete cloud-only recording for ID: ${id}.`);
          return false; // Cloud deletion failed
        }
      }
    }
    console.log(`[Delete] Recording ID ${id} not found locally or in Supabase metadata. Nothing to delete.`);
    return false; // Not found locally, and not found/deleted from cloud (or no user)
  }

  // If recording is found locally, proceed with deletion logic
  if (recording.supabase_url) {
    const userId = await getUserId();
    if (!userId) {
      console.error(`[Delete] User not authenticated for cloud deletion of ID: ${id}.`);
      showError(i18n.t("records_page.error_deleting_from_cloud", { message: "Foydalanuvchi ID topilmadi. Bulutdan o'chirib bo'lmaydi." }));
      supabaseDeletionSuccessful = false;
    } else {
      console.log(`[Delete] Authenticated user ID for deletion attempt: ${userId}`);
      supabaseDeletionSuccessful = await deleteCloudRecording(id, userId);
    }
  }

  console.log(`[Delete] Supabase deletion successful status: ${supabaseDeletionSuccessful}`);

  // Decision to delete locally:
  // Only delete from IndexedDB if Supabase deletion was successful OR if it was never a cloud recording (local-only)
  if (supabaseDeletionSuccessful || !recording.supabase_url) {
    console.log(`[Delete] Proceeding with local deletion for ID: ${id}.`);
    await db.delete(STORE_RECORDINGS, id);
    localDeletionPerformed = true;
    console.log(`[Delete] Successfully deleted local recording for ID: ${id}`);
  } else {
    // This branch is hit if it was a cloud recording AND Supabase deletion failed.
    showError(i18n.t("records_page.error_cloud_delete_failed_local_kept"));
    console.warn(`[Delete] Supabase deletion failed for recording ID ${id}. Local copy kept in IndexedDB.`);
  }

  return localDeletionPerformed;
};