import { openDB, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import { SpeakingQuestion, MoodEntry, RecordedSession, Part1_1Question, Part1_2Question, Part2Question, Part3Question, IeltsTest, CEFRQuestion, CEFRSection, FullCEFRTest, FetchedCEFRQuestion, FetchedCEFRSection } from './types';
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

// Helper to normalize sub_questions for comparison
const normalizeSubQuestions = (subQuestions: string[] | undefined): string => {
  if (!subQuestions) return '';
  return subQuestions.map(q => q.trim()).filter(Boolean).sort().join('|||');
};

// Duplicate check function
export const checkDuplicateQuestion = async (
  questionData: Omit<SpeakingQuestion, 'id' | 'date' | 'user_id'>,
  userId: string | null,
  excludeId?: string // Update uchun, o'zini tekshirmaslik
): Promise<boolean> => {
  let query = supabase.from('questions').select('*');

  if (userId) {
    query = query.eq('user_id', userId);
  } else {
    query = query.is('user_id', null); // Mehmon rejimida faqat user_id NULL bo'lgan savollarni tekshirish
  }

  query = query.eq('type', questionData.type);

  const { data, error } = await query;

  if (error) {
    console.error("Error checking for duplicate questions:", error.message);
    return false; // Xato bo'lsa, takrorlanish yo'q deb hisoblaymiz
  }

  if (!data || data.length === 0) {
    return false; // Bu turdagi savollar yo'q, demak takrorlanish yo'q
  }

  // Client-side comparison based on question type
  switch (questionData.type) {
    case "Part 1.1":
    case "Part 1.2": {
      const newNormalizedSubQuestions = normalizeSubQuestions((questionData as Part1_1Question | Part1_2Question).sub_questions);
      if (!newNormalizedSubQuestions) return false;
      return data.some(existingQ => {
        if (excludeId && existingQ.id === excludeId) return false; // O'zini tekshirmaslik
        const existingNormalizedSubQuestions = normalizeSubQuestions((existingQ as Part1_1Question | Part1_2Question).sub_questions);
        return existingNormalizedSubQuestions === newNormalizedSubQuestions;
      });
    }
    case "Part 2":
    case "Part 3": {
      const newQuestionText = (questionData as Part2Question | Part3Question).question_text?.trim();
      if (!newQuestionText) return false; // Yangi matn bo'sh bo'lsa, takrorlanish bo'lishi mumkin emas
      return data.some(existingQ => {
        if (excludeId && existingQ.id === excludeId) return false; // O'zini tekshirmaslik
        return existingQ.question_text?.trim() === newQuestionText;
      });
    }
    default:
      return false;
  }
};

export const getSupabaseQuestions = async (): Promise<SpeakingQuestion[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;
  const isGuestMode = localStorage.getItem("isGuestMode") === "true"; // Mehmon rejimini tekshirish

  let query = supabase.from('questions').select('*');

  if (isGuestMode && !user) {
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

// Yangi funksiya: CEFR testining to'liq ma'lumotlarini yuklash
export const getCefrTestDetails = async (testId: string): Promise<FullCEFRTest | null> => {
  const { data: testData, error: testError } = await supabase
    .from('cefr_tests')
    .select(`
      *,
      cefr_sections (
        id,
        type,
        order,
        created_at,
        updated_at,
        cefr_questions (
          id,
          section_id,
          question_text,
          audio_url,
          image_urls,
          correct_answer,
          question_type,
          word_limit,
          sub_questions,
          created_at,
          updated_at,
          cefr_options (id, option_text, is_correct, created_at, updated_at),
          cefr_rubrics (id, criterion, description, score_range, created_at, updated_at)
        )
      )
    `)
    .eq('id', testId)
    .single();

  if (testError) {
    console.error("Error loading CEFR test details:", testError.message);
    showError(i18n.t("cefr_start_test_page.error_loading_test_details", { message: testError.message }));
    return null;
  }

  if (!testData) {
    return null;
  }

  // Bo'limlarni tartib raqami bo'yicha saralash
  testData.cefr_sections.sort((a: any, b: any) => a.order - b.order);

  return testData as FullCEFRTest;
};

// Oldingi getCefrTestQuestions funksiyasini olib tashlaymiz, chunki u endi ishlatilmaydi
// export const getCefrTestQuestions = async (testId: string): Promise<SpeakingQuestion[]> => { ... };


export const addSupabaseQuestion = async (question: Omit<SpeakingQuestion, 'id' | 'date' | 'user_id'>): Promise<SpeakingQuestion | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  if (!userId) {
    console.warn("Attempted to add a question without being authenticated. This action is blocked.");
    return null;
  }

  // Check for duplicate before adding
  const isDuplicate = await checkDuplicateQuestion(question, userId);
  if (isDuplicate) {
    showError(i18n.t("add_question_page.error_duplicate_question"));
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

  if (!userId) {
    console.warn("Attempted to update a question without being authenticated. This action is blocked.");
    return null;
  }

  // Check for duplicate before updating, excluding the current question being edited
  const isDuplicate = await checkDuplicateQuestion(updatedQuestion, userId, updatedQuestion.id);
  if (isDuplicate) {
    showError(i18n.t("add_question_page.error_duplicate_question"));
    return null;
  }

  const { data, error } = await supabase
    .from('questions')
    .update(updatedQuestion)
    .eq('id', updatedQuestion.id)
    .eq('user_id', userId) // Ensure user can only update their own questions
    .select()
    .single();

  if (error) {
    showError(i18n.t("add_question_page.error_saving_entry", { message: error.message }));
    return null;
  }
  return data as SpeakingQuestion;
};

// Yangi funksiya: Faqat `last_used` maydonini yangilash uchun
export const updateQuestionCooldown = async (questionId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  if (!userId) {
    console.warn("Cannot update cooldown without an authenticated user.");
    // Mehmon rejimida ommaviy savollar uchun cooldownni yangilashga hojat yo'q
    return true;
  }

  const { error } = await supabase
    .from('questions')
    .update({ last_used: new Date().toISOString() })
    .eq('id', questionId)
    .eq('user_id', userId);

  if (error) {
    console.error(`Error updating cooldown for question ${questionId}:`, error.message);
    // Foydalanuvchiga xato ko'rsatish shart emas, chunki bu fon jarayoni
    return false;
  }
  return true;
};

export const deleteSupabaseQuestion = async (id: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  if (!userId) {
    console.warn("Attempted to delete a question in guest mode. This action is blocked.");
    return false;
  }

  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId); // Ensure user can only delete their own questions

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
    query = query.eq('user_id', userId); // Faqat o'zining savollarini reset qilish
  } else {
    // Guest user can reset cooldowns for public sample questions
    query = query.is('user_id', null);
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
      const supabaseRecordingIds = new Set(data.map(rec => rec.id));
      const tx = db.transaction(STORE_RECORDINGS, 'readwrite');
      const store = tx.objectStore(STORE_RECORDINGS);

      // Filter and potentially delete stale local recordings
      const filteredLocalRecordings: StoredRecording[] = [];
      for (const sRec of storedRecordings) {
        if (sRec.user_id === userId) { // Only consider local recordings belonging to the current user
          if (sRec.supabase_url && !supabaseRecordingIds.has(sRec.id)) {
            // This local recording has a supabase_url but is not in Supabase metadata.
            // It means it was deleted from Supabase (e.g., by another browser). Delete it locally.
            console.log(`[getLocalRecordings] Deleting stale local recording from IndexedDB: ${sRec.id}`);
            await store.delete(sRec.id);
            // Do not add to filteredLocalRecordings
          } else {
            filteredLocalRecordings.push(sRec);
          }
        } else {
          // Keep local recordings that belong to other users (e.g., 'local_user' for guest mode)
          filteredLocalRecordings.push(sRec);
        }
      }
      await tx.done; // Commit the transaction after potential deletions

      // Now, combine the fresh Supabase data with the filtered local data
      const combinedIds = new Set<string>();
      
      // Add Supabase recordings first
      data.forEach(rec => {
        combinedIds.add(rec.id);
        const localVersion = filteredLocalRecordings.find(sRec => sRec.id === rec.id);
        allRecordings.push({
          id: rec.id,
          user_id: rec.user_id,
          timestamp: rec.timestamp,
          duration: rec.duration,
          student_id: rec.student_id || undefined,
          student_name: rec.student_name || undefined,
          student_phone: rec.student_phone || undefined,
          video_url: localVersion ? URL.createObjectURL(localVersion.videoBlob) : rec.supabase_url, // Use local blob URL if available, otherwise Supabase URL
          supabase_url: rec.supabase_url,
          isLocalBlobAvailable: !!localVersion,
        });
      });

      // Add local-only recordings that are not in Supabase
      filteredLocalRecordings.forEach(sRec => {
        if (!combinedIds.has(sRec.id)) {
          allRecordings.push({
            ...sRec,
            video_url: URL.createObjectURL(sRec.videoBlob),
            isLocalBlobAvailable: true,
          });
        }
      });
    }

  } else {
    // Guest mode or not logged in: Fetch only from IndexedDB
    storedRecordings.forEach(rec => {
      if (rec.user_id === 'local_user') { // Only show 'local_user' recordings in guest mode
        allRecordings.push({
          ...rec,
          video_url: URL.createObjectURL(rec.videoBlob),
          isLocalBlobAvailable: true, // It's a local recording, so blob is available
        });
      }
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
  const userId = await getUserId();
  let localRecording = await db.get(STORE_RECORDINGS, id);
  let supabaseMetadataExists = false;
  let supabaseDeletionSuccessful = true; // Assume true if no cloud interaction needed or successful

  console.log(`[Delete] Starting deletion for recording ID: ${id}.`);

  if (!userId) {
    // If not authenticated, we can only delete local-only recordings.
    // If localRecording has a supabase_url, we cannot delete it from cloud.
    if (localRecording && !localRecording.supabase_url) {
      await db.delete(STORE_RECORDINGS, id);
      console.log(`[Delete] Successfully deleted local-only recording from IndexedDB for ID: ${id} (unauthenticated user).`);
      return true;
    } else if (localRecording && localRecording.supabase_url) {
      showError(i18n.t("records_page.error_deleting_from_cloud", { message: "Foydalanuvchi ID topilmadi. Bulutdan o'chirib bo'lmaydi." }));
      console.error(`[Delete] Cannot delete cloud-linked recording ${id} without authentication.`);
      return false;
    } else {
      console.warn(`[Delete] Recording with ID ${id} not found locally and user not authenticated for cloud check.`);
      return false;
    }
  }

  // User is authenticated.
  // First, check if it exists in Supabase metadata.
  const { data: metadata, error: metadataError } = await supabase
    .from('recordings_metadata')
    .select('id, supabase_url')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (metadataError && metadataError.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error(`[Delete] Error fetching metadata for ID ${id} from Supabase:`, metadataError.message);
    showError(i18n.t("records_page.error_deleting_from_cloud", { message: metadataError.message }));
    return false; // Failed to even check Supabase
  }

  if (metadata && metadata.supabase_url) {
    supabaseMetadataExists = true;
    console.log(`[Delete] Recording ID ${id} found in Supabase metadata. Attempting cloud deletion.`);
    supabaseDeletionSuccessful = await deleteCloudRecording(id, userId);
  } else {
    console.log(`[Delete] Recording ID ${id} not found in Supabase metadata or has no supabase_url.`);
    supabaseDeletionSuccessful = true; // No cloud resource to delete, so consider it successful for cloud part
  }

  let localDeletionPerformed = false;
  if (localRecording) {
    if (supabaseDeletionSuccessful) {
      console.log(`[Delete] Proceeding with local deletion for ID: ${id}.`);
      await db.delete(STORE_RECORDINGS, id);
      localDeletionPerformed = true;
      console.log(`[Delete] Successfully deleted local recording for ID: ${id}`);
    } else {
      // Supabase deletion failed, keep local copy
      showError(i18n.t("records_page.error_cloud_delete_failed_local_kept"));
      console.warn(`[Delete] Supabase deletion failed for recording ID ${id}. Local copy kept in IndexedDB.`);
    }
  } else {
    console.log(`[Delete] Recording ID ${id} not found in local IndexedDB.`);
  }

  // Return true if either local deletion happened, or it was a cloud-only recording and cloud deletion succeeded.
  return localDeletionPerformed || (supabaseMetadataExists && supabaseDeletionSuccessful);
};

export const getIeltsTests = async (): Promise<IeltsTest[]> => {
  const { data, error } = await supabase
    .from('ielts_tests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    showError(i18n.t("cefr_tests_page.error_loading_tests", { message: error.message }));
    return [];
  }
  return data as IeltsTest[];
};