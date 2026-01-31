const DB_NAME = 'GymWorkoutDB';
const DB_VERSION = 1;

const EXERCISES_STORE = 'exercises';
const WORKOUT_LOGS_STORE = 'workoutLogs';

let dbInstance: IDBDatabase | null = null;

export interface Exercise {
  id: string;
  name: string;
}

export interface WorkoutLogEntry {
  id?: number;
  exerciseId: string;
  weight: number;
  completed: boolean;
  timestamp: number;
  sessionId: string;
}

/**
 * Initialize or upgrade the IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */
export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open database'));
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create exercises object store
      if (!db.objectStoreNames.contains(EXERCISES_STORE)) {
        const exerciseStore = db.createObjectStore(EXERCISES_STORE, {
          keyPath: 'id'
        });
        exerciseStore.createIndex('name', 'name', { unique: false });
      }

      // Create workoutLogs object store
      if (!db.objectStoreNames.contains(WORKOUT_LOGS_STORE)) {
        const logStore = db.createObjectStore(WORKOUT_LOGS_STORE, {
          keyPath: 'id',
          autoIncrement: true
        });
        logStore.createIndex('exerciseId', 'exerciseId', { unique: false });
        logStore.createIndex('sessionId', 'sessionId', { unique: false });
        logStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Save exercise metadata to the database
 * @param {Object} exercise - Exercise object with id and name
 * @returns {Promise<void>}
 */
export async function saveExercise(exercise: Exercise): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([EXERCISES_STORE], 'readwrite');
    const store = transaction.objectStore(EXERCISES_STORE);
    const request = store.put(exercise);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to save exercise'));
  });
}

/**
 * Save a workout log entry
 * @param {Object} entry - Workout log entry
 * @param {string} entry.exerciseId - Exercise ID
 * @param {number} entry.weight - Weight used
 * @param {boolean} entry.completed - Whether exercise was completed successfully
 * @param {string} entry.sessionId - Session ID
 * @returns {Promise<number>} - Returns the auto-generated ID
 */
export async function saveWorkoutLog(entry: Omit<WorkoutLogEntry, 'id' | 'timestamp'>): Promise<number> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WORKOUT_LOGS_STORE], 'readwrite');
    const store = transaction.objectStore(WORKOUT_LOGS_STORE);
    
    const logEntry = {
      ...entry,
      timestamp: Date.now()
    };

    const request = store.add(logEntry);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Failed to save workout log'));
  });
}

/**
 * Get the most recent workout log entry for an exercise
 * @param {string} exerciseId - Exercise ID
 * @returns {Promise<Object|null>} - Most recent entry or null if none exists
 */
export async function getLastExerciseEntry(exerciseId: string): Promise<WorkoutLogEntry | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WORKOUT_LOGS_STORE], 'readonly');
    const store = transaction.objectStore(WORKOUT_LOGS_STORE);
    const index = store.index('exerciseId');
    const request = index.openCursor(IDBKeyRange.only(exerciseId), 'prev');

    let lastEntry = null;

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor) {
        lastEntry = cursor.value as WorkoutLogEntry;
        resolve(lastEntry);
      } else {
        resolve(null);
      }
    };

    request.onerror = () => reject(new Error('Failed to get last exercise entry'));
  });
}

/**
 * Get all workout logs for a specific session
 * @param {string} sessionId - Session ID
 * @returns {Promise<Array>} - Array of workout log entries
 */
export async function getSessionHistory(sessionId: string): Promise<WorkoutLogEntry[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WORKOUT_LOGS_STORE], 'readonly');
    const store = transaction.objectStore(WORKOUT_LOGS_STORE);
    const index = store.index('sessionId');
    const request = index.getAll(sessionId);

    request.onsuccess = () => {
      // Sort by timestamp descending (most recent first)
      const logs = (request.result as WorkoutLogEntry[]).sort((a, b) => b.timestamp - a.timestamp);
      resolve(logs);
    };

    request.onerror = () => reject(new Error('Failed to get session history'));
  });
}
