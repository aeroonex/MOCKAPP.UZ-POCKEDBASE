import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { BaseRecordedSession } from './types';

const DB_NAME = 'MockTestDB';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

// Endi blob o'rniga supabaseUrl saqlanadi
export interface RecordingWithSupabaseUrl extends BaseRecordedSession {
  supabaseUrl: string;
}

interface MockTestDB extends DBSchema {
  [STORE_NAME]: {
    key: string; // timestamp
    value: RecordingWithSupabaseUrl;
  };
}

let dbPromise: Promise<IDBPDatabase<MockTestDB>> | null = null;

const getDb = (): Promise<IDBPDatabase<MockTestDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<MockTestDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'timestamp' });
        }
      },
    });
  }
  return dbPromise;
};

export const addRecordingToDB = async (recording: RecordingWithSupabaseUrl): Promise<void> => {
  const db = await getDb();
  await db.put(STORE_NAME, recording);
};

export const getAllRecordingsFromDB = async (): Promise<RecordingWithSupabaseUrl[]> => {
  const db = await getDb();
  // Get all and sort by timestamp descending to show newest first
  const recordings = await db.getAll(STORE_NAME);
  return recordings.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const deleteRecordingFromDB = async (timestamp: string): Promise<void> => {
  const db = await getDb();
  await db.delete(STORE_NAME, timestamp);
};