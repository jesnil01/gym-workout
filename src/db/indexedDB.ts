const DB_NAME = 'GymWorkoutDB';
const DB_VERSION = 2;

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
  value: number;
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
      const oldVersion = event.oldVersion;

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

      // Migration from version 1 to 2: rename weight to value
      if (oldVersion < 2 && db.objectStoreNames.contains(WORKOUT_LOGS_STORE)) {
        const transaction = (event.target as IDBOpenDBRequest).transaction!;
        const store = transaction.objectStore(WORKOUT_LOGS_STORE);
        const request = store.openCursor();

        request.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
          if (cursor) {
            const entry = cursor.value;
            // Migrate weight to value
            if ('weight' in entry && !('value' in entry)) {
              const updatedEntry = {
                ...entry,
                value: entry.weight
              };
              delete updatedEntry.weight;
              cursor.update(updatedEntry);
            }
            cursor.continue();
          }
        };
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
 * @param {number} entry.value - Value (weight in kg or time in seconds)
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
 * Get the last N workout log entries for an exercise
 * @param {string} exerciseId - Exercise ID
 * @param {number} limit - Maximum number of entries to return
 * @returns {Promise<Array>} - Array of workout log entries (most recent first)
 */
export async function getLastNExerciseEntries(exerciseId: string, limit: number): Promise<WorkoutLogEntry[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WORKOUT_LOGS_STORE], 'readonly');
    const store = transaction.objectStore(WORKOUT_LOGS_STORE);
    const index = store.index('exerciseId');
    const request = index.openCursor(IDBKeyRange.only(exerciseId), 'prev');

    const entries: WorkoutLogEntry[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor && entries.length < limit) {
        entries.push(cursor.value as WorkoutLogEntry);
        cursor.continue();
      } else {
        resolve(entries);
      }
    };

    request.onerror = () => reject(new Error('Failed to get last N exercise entries'));
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

/**
 * Get all workout logs within a date range
 * @param {number} startDate - Start timestamp (inclusive)
 * @param {number} endDate - End timestamp (inclusive)
 * @returns {Promise<Array>} - Array of workout log entries
 */
export async function getWorkoutsInDateRange(startDate: number, endDate: number): Promise<WorkoutLogEntry[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WORKOUT_LOGS_STORE], 'readonly');
    const store = transaction.objectStore(WORKOUT_LOGS_STORE);
    const index = store.index('timestamp');
    const range = IDBKeyRange.bound(startDate, endDate);
    const request = index.getAll(range);

    request.onsuccess = () => {
      const logs = (request.result as WorkoutLogEntry[]).sort((a, b) => b.timestamp - a.timestamp);
      resolve(logs);
    };

    request.onerror = () => reject(new Error('Failed to get workouts in date range'));
  });
}

/**
 * Get all workout log entries
 * @returns {Promise<Array>} - Array of all workout log entries
 */
export async function getAllWorkoutLogs(): Promise<WorkoutLogEntry[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WORKOUT_LOGS_STORE], 'readonly');
    const store = transaction.objectStore(WORKOUT_LOGS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const logs = (request.result as WorkoutLogEntry[]).sort((a, b) => b.timestamp - a.timestamp);
      resolve(logs);
    };

    request.onerror = () => reject(new Error('Failed to get all workout logs'));
  });
}
