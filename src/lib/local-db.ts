import { openDB, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import { SpeakingQuestion, MoodEntry, RecordedSession, Part1_1Question, Part1_2Question, Part2Question, Part3Question } from './types';
import { api, auth } from "@/lib/api";
import { showError } from '@/utils/toast';
import i18n from '@/i18n';

const DB_NAME = 'edumock_uz_db';
const DB_VERSION = 1;
const STORE_MOODS = 'mood_entries';
const STORE_RECORDINGS = 'recordings';

// IndexedDB uchun
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
  return auth.model?.id || null;
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
  try {
    // Ommaviy (mehmon) savollar uchun scope=public, aks holda joriy foydalanuvchi savollari.
    const scope = userId ? "" : "scope=public&";
    const data = await api.get<any[]>(`/api/questions?${scope}type=${encodeURIComponent(questionData.type)}`);

    if (!data || data.length === 0) return false;

  // Client-side comparison based on question type
  switch (questionData.type) {
    case "Part 1.1":
    case "Part 1.2": {
      const newNormalizedSubQuestions = normalizeSubQuestions((questionData as Part1_1Question | Part1_2Question).sub_questions);
      if (!newNormalizedSubQuestions) return false;

      return data.some((existingQ: any) => {
        if (excludeId && existingQ.id === excludeId) return false; // O'zini tekshirmaslik
        const existingNormalizedSubQuestions = normalizeSubQuestions((existingQ as any).sub_questions);
        return existingNormalizedSubQuestions === newNormalizedSubQuestions;
      });
    }
    case "Part 2":
    case "Part 3": {
      const newQuestionText = (questionData as Part2Question | Part3Question).question_text?.trim();
      if (!newQuestionText) return false; // Yangi matn bo'sh bo'lsa, takrorlanish bo'lishi mumkin emas

      return data.some((existingQ: any) => {
        if (excludeId && existingQ.id === excludeId) return false; // O'zini tekshirmaslik
        return String(existingQ.question_text || "").trim() === newQuestionText;
      });
    }
    default:
      return false;
  }
  } catch (e: any) {
    console.error("Error checking for duplicate questions:", e?.message || e);
    return false;
  }
};

export const getQuestions = async (): Promise<SpeakingQuestion[]> => {
  const userId = auth.model?.id;
  const isGuestMode = localStorage.getItem("isGuestMode") === "true"; // Mehmon rejimini tekshirish

  try {
    let path = "";

    if (isGuestMode && !userId) {
      path = "/api/questions?scope=public";
    } else if (userId) {
      path = "/api/questions";
    } else {
      return [];
    }

    const data = await api.get<any[]>(path);

    return data as unknown as SpeakingQuestion[];
  } catch (e: any) {
    showError(i18n.t("add_question_page.error_loading_entries", { message: e?.message || String(e) }));
    return [];
  }
};

export const addQuestion = async (question: Omit<SpeakingQuestion, 'id' | 'date' | 'user_id'>): Promise<SpeakingQuestion | null> => {
  const userId = auth.model?.id;

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

  try {
    const data = await api.post<any>("/api/questions", question);
    return data as unknown as SpeakingQuestion;
  } catch (e: any) {
    showError(i18n.t("add_question_page.error_saving_entry", { message: e?.message || String(e) }));
    return null;
  }
};

export const updateQuestion = async (updatedQuestion: SpeakingQuestion): Promise<SpeakingQuestion | null> => {
  const userId = auth.model?.id;

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

  try {
    // ensure ownership on client side
    if (updatedQuestion.user_id !== userId) {
      showError(i18n.t("add_question_page.error_saving_entry", { message: "Forbidden" }));
      return null;
    }
    const { id, user_id: _owner, date: _date, last_used: _lastUsed, isSimilar: _similar, ...fields } = updatedQuestion as any;
    const data = await api.patch<any>(`/api/questions/${id}`, fields);
    return data as unknown as SpeakingQuestion;
  } catch (e: any) {
    showError(i18n.t("add_question_page.error_saving_entry", { message: e?.message || String(e) }));
    return null;
  }
};

// Yangi funksiya: Faqat `last_used` maydonini yangilash uchun
export const updateQuestionCooldown = async (questionId: string): Promise<boolean> => {
  const userId = auth.model?.id;

  if (!userId) {
    console.warn("Cannot update cooldown without an authenticated user.");
    // Mehmon rejimida ommaviy savollar uchun cooldownni yangilashga hojat yo'q
    return true;
  }

  try {
    await api.post(`/api/questions/${questionId}/use`);
    return true;
  } catch (e: any) {
    console.error(`Error updating cooldown for question ${questionId}:`, e?.message || e);
    return false;
  }
};

export const deleteQuestion = async (id: string): Promise<boolean> => {
  const userId = auth.model?.id;

  if (!userId) {
    console.warn("Attempted to delete a question in guest mode. This action is blocked.");
    return false;
  }

  try {
    await api.delete(`/api/questions/${id}`);
    return true;
  } catch (e: any) {
    showError(i18n.t("add_question_page.error_deleting_entry", { message: e?.message || String(e) }));
    return false;
  }
};

export const resetQuestionCooldowns = async (): Promise<boolean> => {
  const userId = auth.model?.id;

  try {
    const isGuestMode = localStorage.getItem("isGuestMode") === "true";

    if (!userId) {
      // Mehmon rejimida ommaviy savollarni serverda o'zgartirib bo'lmaydi
      return isGuestMode;
    }

    await api.post("/api/questions/reset-cooldowns");

    return true;
  } catch (e: any) {
    showError(i18n.t("add_question_page.error_saving_entry", { message: e?.message || String(e) }));
    return false;
  }
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
  cloud_url?: string; // Cloud'ga yuklangan videoning ommaviy URL manzili
  registration_id?: string; // Ro'yxatdagi o'quvchi bilan bog'lanish
  attempt?: number; // Nechinchi urinish
}

// Yangi: Supabase jadvaliga yozuv metama'lumotlarini kiritish yoki yangilash
export const upsertRecordingMetadataToCloud = async (recording: Omit<RecordedSession, 'video_url' | 'isLocalBlobAvailable'>): Promise<void> => {
  try {
    // Backend local_id bo'yicha upsert qiladi (videosiz, faqat metama'lumot).
    await api.put(`/api/recordings/${encodeURIComponent(recording.id)}/meta`, {
      timestamp: recording.timestamp,
      duration: recording.duration,
      student_id: recording.student_id ?? "",
      student_name: recording.student_name ?? "",
      student_phone: recording.student_phone ?? "",
      registration_id: recording.registration_id ?? "",
    });
  } catch (e: any) {
    console.error("Error upserting recording metadata:", e?.message || e);
    showError(i18n.t("records_page.error_uploading_to_cloud", { message: e?.message || String(e) }));
  }
};

// Serverdagi yozuvni o'chirish
const deleteCloudRecording = async (recordingLocalId: string, _userId: string): Promise<boolean> => {
  try {
    await api.delete(`/api/recordings/${encodeURIComponent(recordingLocalId)}`);
    return true;
  } catch (e: any) {
    console.error("[Delete Cloud] Error deleting from server:", e?.message || e);
    showError(i18n.t("records_page.error_deleting_from_cloud", { message: e?.message || String(e) }));
    return false;
  }
};

export const getLocalRecordings = async (): Promise<RecordedSession[]> => {
  const db = await initDB();
  const storedRecordings: StoredRecording[] = await db.getAll(STORE_RECORDINGS);
  const userId = await getUserId();

  let allRecordings: RecordedSession[] = [];

  if (userId) {
    // Authenticated user: serverdagi yozuvlar ro'yxatini olish
    let data: any[] = [];
    try {
      data = await api.get<any[]>("/api/recordings");
    } catch (e: any) {
      showError(i18n.t("records_page.error_loading_recordings", { message: e?.message || String(e) }));
      data = [];
    }

    if (data) {
      const cloudRecordingIds = new Set(data.map(rec => rec.local_id));
      const tx = db.transaction(STORE_RECORDINGS, 'readwrite');
      const store = tx.objectStore(STORE_RECORDINGS);

      // Filter and potentially delete stale local recordings
      const filteredLocalRecordings: StoredRecording[] = [];
      for (const sRec of storedRecordings) {
        if (sRec.user_id === userId) {
          // Only consider local recordings belonging to the current user
          if (sRec.cloud_url && !cloudRecordingIds.has(sRec.id)) {
            // This local recording has a cloud url but is not on the server anymore.
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

      // Now, combine the fresh server data with the filtered local data
      const combinedIds = new Set<string>();

      // Add cloud recordings first
      data.forEach(rec => {
        const localId = rec.local_id;
        if (!localId) return;
        combinedIds.add(localId);
        const localVersion = filteredLocalRecordings.find(sRec => sRec.id === localId);
        const cloudUrl = rec.video_url ? api.fileUrl(rec.video_url) : (rec.cloud_url ? api.fileUrl(rec.cloud_url) : undefined);

        allRecordings.push({
          id: localId,
          user_id: rec.user_id,
          timestamp: rec.timestamp,
          duration: Number(rec.duration || 0),
          student_id: rec.student_id || undefined,
          student_name: rec.student_name || undefined,
          student_phone: rec.student_phone || undefined,
          video_url: localVersion ? URL.createObjectURL(localVersion.videoBlob) : cloudUrl,
          cloud_url: cloudUrl,
          isLocalBlobAvailable: !!localVersion,
          registration_id: rec.registration_id || localVersion?.registration_id || undefined,
          tg_backup_at: rec.tg_backup_at || null,
          video_deleted_at: rec.video_deleted_at || null,
        });
      });

      // Add local-only recordings that are not in cloud
      filteredLocalRecordings.forEach(sRec => {
        if (!combinedIds.has(sRec.id)) {
          allRecordings.push({
            ...sRec,
            video_url: URL.createObjectURL(sRec.videoBlob),
            isLocalBlobAvailable: true, // It's a local recording, so blob is available
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

export const syncCloudStorageUsage = async (
  userId: string,
  currentUsedBytes?: number | null
): Promise<number> => {
  try {
    // Server recordings jadvalidan qayta hisoblab, users.storage_used_bytes ni yangilaydi.
    void userId;
    void currentUsedBytes;
    const res = await api.get<{ used_bytes: number; limit_bytes: number }>("/api/storage");
    return Number(res?.used_bytes || 0);
  } catch (e: any) {
    console.error("[syncCloudStorageUsage] Failed:", e?.message || e);
    return 0;
  }
};

export const getRecordingBlob = async (id: string): Promise<Blob | undefined> => {
  const db = await initDB();
  const recording = await db.get(STORE_RECORDINGS, id);
  return recording?.videoBlob;
};

/**
 * Videoni serverga yuklaydi (multipart, jarayon bilan). Records sahifasi va avtomatik yuklash ishlatadi.
 * Qaytadi: serverdagi videoning to'liq URL'i.
 */
export const uploadRecordingToCloud = async (
  recordingId: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<string> => {
  const db = await initDB();
  const rec: StoredRecording | undefined = await db.get(STORE_RECORDINGS, recordingId);
  if (!rec?.videoBlob) throw new Error(i18n.t("records_page.error_no_video_data"));
  const blob = rec.videoBlob;
  const file = new File([blob], `${rec.id}.webm`, { type: blob.type || "video/webm" });
  // Maydonlar fayldan OLDIN yuborilishi shart — server ularni oqim boshlanishidan oldin o'qiydi.
  const form = new FormData();
  form.append("local_id", rec.id);
  form.append("timestamp", rec.timestamp);
  form.append("duration", String(rec.duration));
  if (rec.student_id) form.append("student_id", rec.student_id);
  if (rec.student_name) form.append("student_name", rec.student_name);
  if (rec.student_phone) form.append("student_phone", rec.student_phone);
  if (rec.registration_id) form.append("registration_id", rec.registration_id);
  if (rec.attempt) form.append("attempt", String(rec.attempt));
  form.append("size_bytes", String(blob.size));
  form.append("video", file);

  const created = await api.upload<{ video_url?: string }>("/api/recordings", form, onProgress);
  const url = created?.video_url ? api.fileUrl(created.video_url) : "";
  if (!url) throw new Error(i18n.t("records_page.error_getting_public_url"));
  await updateLocalRecordingCloudUrl(rec.id, url);
  return url;
};

/**
 * Ro'yxatdagi o'quvchi bilan topshirilgan test tugagach — videoni fonda serverga yuklaydi
 * (toast bilan xabar beradi; xato bo'lsa Yozuvlar sahifasidan qo'lda yuklash mumkin).
 */
export const autoUploadRecording = async (recordingId: string): Promise<void> => {
  if (!auth.model) return;
  const { setProgress, removeProgress } = await import("@/utils/uploadProgress");
  const { toast } = await import("sonner");
  const toastId = toast.loading(i18n.t("records_page.auto_upload_started"));
  setProgress(recordingId, 0);
  try {
    await uploadRecordingToCloud(recordingId, (loaded, total) => {
      const pct = total ? Math.round((loaded / total) * 100) : 0;
      setProgress(recordingId, pct);
      toast.loading(i18n.t("records_page.auto_upload_progress", { percent: pct }), { id: toastId });
    });
    setProgress(recordingId, 100);
    toast.success(i18n.t("records_page.auto_upload_done"), { id: toastId, duration: 6000 });
  } catch (e: any) {
    toast.error(i18n.t("records_page.auto_upload_failed", { message: e?.message || String(e) }), { id: toastId, duration: 8000 });
  } finally {
    removeProgress(recordingId);
  }
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
    cloud_url: undefined, // Initially, no cloud url
  };

  await db.add(STORE_RECORDINGS, newRecording);
  return newRecordingId;
};

export const updateLocalRecordingCloudUrl = async (id: string, cloudUrl: string): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(STORE_RECORDINGS, 'readwrite');
  const store = tx.objectStore(STORE_RECORDINGS);
  const recording = await store.get(id);

  if (recording) {
    recording.cloud_url = cloudUrl;
    await store.put(recording);
  }

  await tx.done;
};

export const deleteLocalRecording = async (id: string): Promise<boolean> => {
  const db = await initDB();
  const userId = await getUserId();

  let localRecording = await db.get(STORE_RECORDINGS, id);
  let cloudMetadataExists = false;
  let cloudDeletionSuccessful = true; // Assume true if no cloud interaction needed or successful

  console.log(`[Delete] Starting deletion for recording ID: ${id}.`);

  if (!userId) {
    // If not authenticated, we can only delete local-only recordings.
    // If localRecording has a cloud_url, we cannot delete it from cloud.
    if (localRecording && !localRecording.cloud_url) {
      await db.delete(STORE_RECORDINGS, id);
      console.log(`[Delete] Successfully deleted local-only recording from IndexedDB for ID: ${id} (unauthenticated user).`);
      return true;
    } else if (localRecording && localRecording.cloud_url) {
      showError(i18n.t("records_page.error_deleting_from_cloud", { message: "Foydalanuvchi ID topilmadi. Bulutdan o'chirib bo'lmaydi." }));
      console.error(`[Delete] Cannot delete cloud-linked recording ${id} without authentication.`);
      return false;
    } else {
      console.warn(`[Delete] Recording with ID ${id} not found locally and user not authenticated for cloud check.`);
      return false;
    }
  }

  // User is authenticated.
  // First, check if it exists on the server.
  try {
    await api.get(`/api/recordings/${encodeURIComponent(id)}`);
    cloudMetadataExists = true;
    console.log(`[Delete] Recording ID ${id} found on server. Attempting cloud deletion.`);
    cloudDeletionSuccessful = await deleteCloudRecording(id, userId);
  } catch {
    console.log(`[Delete] Recording ID ${id} not found on server.`);
    cloudDeletionSuccessful = true;
  }

  let localDeletionPerformed = false;
  if (localRecording) {
    if (cloudDeletionSuccessful) {
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
  return localDeletionPerformed || (cloudMetadataExists && cloudDeletionSuccessful);
};