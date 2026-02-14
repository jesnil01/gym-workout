const DB_NAME = 'GymWorkoutDB';
const DB_VERSION = 6;

const EXERCISES_STORE = 'exercises';
const WORKOUT_LOGS_STORE = 'workoutLogs';
const BODY_WEIGHT_STORE = 'bodyWeight';
const PROFILE_STORE = 'profile';
const COACH_FEEDBACK_STORE = 'coachFeedback';

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
  type?: 'cardio';
  time?: number; // Time in seconds
  pace?: number; // Pace per km in minutes (only for running)
}

export interface BodyWeightEntry {
  id?: number;
  weight: number; // Weight in kg with one decimal precision
  timestamp: number;
}

export interface UserProfile {
  id: 'user'; // Always 'user' for singleton pattern
  goal: string;
  facts: string;
}

export interface CoachFeedbackEntry {
  id?: number;
  feedback: string;
  timestamp: number;
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

      // Create bodyWeight object store
      if (!db.objectStoreNames.contains(BODY_WEIGHT_STORE)) {
        const bodyWeightStore = db.createObjectStore(BODY_WEIGHT_STORE, {
          keyPath: 'id',
          autoIncrement: true
        });
        bodyWeightStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Create profile object store (singleton pattern)
      if (!db.objectStoreNames.contains(PROFILE_STORE)) {
        db.createObjectStore(PROFILE_STORE, {
          keyPath: 'id'
        });
      }

      // Create coachFeedback object store
      if (!db.objectStoreNames.contains(COACH_FEEDBACK_STORE)) {
        const coachFeedbackStore = db.createObjectStore(COACH_FEEDBACK_STORE, {
          keyPath: 'id',
          autoIncrement: true
        });
        coachFeedbackStore.createIndex('timestamp', 'timestamp', { unique: false });
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

/**
 * Get all exercises from the database
 * @returns {Promise<Array>} - Array of all exercises
 */
export async function getAllExercises(): Promise<Exercise[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([EXERCISES_STORE], 'readonly');
    const store = transaction.objectStore(EXERCISES_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const exercises = request.result as Exercise[];
      resolve(exercises);
    };

    request.onerror = () => reject(new Error('Failed to get all exercises'));
  });
}

export interface BackupData {
  version: string;
  exportDate: number;
  exercises: Exercise[];
  workoutLogs: WorkoutLogEntry[];
}

/**
 * Export all database data as a backup object
 * @returns {Promise<BackupData>} - Backup data object with all exercises and workout logs
 */
export async function exportBackup(): Promise<BackupData> {
  const [exercises, workoutLogs] = await Promise.all([
    getAllExercises(),
    getAllWorkoutLogs()
  ]);

  return {
    version: '1.0.0',
    exportDate: Date.now(),
    exercises,
    workoutLogs
  };
}

export interface ImportResult {
  success: boolean;
  exercisesImported: number;
  workoutLogsImported: number;
  error?: string;
}

/**
 * Import backup data into the database
 * @param {BackupData} backupData - Backup data to import
 * @returns {Promise<ImportResult>} - Import result with counts
 */
export async function importBackup(backupData: BackupData): Promise<ImportResult> {
  try {
    // Validate backup data structure
    if (!backupData.exercises || !backupData.workoutLogs) {
      throw new Error('Invalid backup file format');
    }

    let exercisesImported = 0;
    let workoutLogsImported = 0;

    // Import exercises
    for (const exercise of backupData.exercises) {
      try {
        await saveExercise(exercise);
        exercisesImported++;
      } catch (err) {
        console.error(`Failed to import exercise ${exercise.id}:`, err);
        // Continue with other exercises
      }
    }

    // Import workout logs with preserved timestamps
    const db = await initDB();
    for (const log of backupData.workoutLogs) {
      try {
        // Preserve original timestamp from backup
        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction([WORKOUT_LOGS_STORE], 'readwrite');
          const store = transaction.objectStore(WORKOUT_LOGS_STORE);
          
          const logEntry = {
            ...log,
            timestamp: log.timestamp || Date.now() // Use original timestamp or current time if missing
          };

          const request = store.add(logEntry);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(new Error('Failed to import workout log'));
        });
        workoutLogsImported++;
      } catch (err) {
        console.error(`Failed to import workout log:`, err);
        // Continue with other logs
      }
    }

    return {
      success: true,
      exercisesImported,
      workoutLogsImported
    };
  } catch (err) {
    return {
      success: false,
      exercisesImported: 0,
      workoutLogsImported: 0,
      error: err instanceof Error ? err.message : 'Failed to import backup'
    };
  }
}

/**
 * Save body weight entry to the database
 * @param {number} weight - Weight in kg (must have max one decimal place)
 * @returns {Promise<number>} - Returns the auto-generated ID
 */
export async function saveBodyWeight(weight: number): Promise<number> {
  // Validate weight is positive
  if (weight <= 0) {
    throw new Error('Weight must be greater than 0');
  }

  // Validate weight has maximum one decimal place
  // Check if (weight * 10) is an integer
  if ((weight * 10) % 1 !== 0) {
    throw new Error('Weight must have maximum one decimal place (e.g., 75.5)');
  }

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([BODY_WEIGHT_STORE], 'readwrite');
    const store = transaction.objectStore(BODY_WEIGHT_STORE);
    
    const entry: BodyWeightEntry = {
      weight,
      timestamp: Date.now()
    };

    const request = store.add(entry);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Failed to save body weight'));
  });
}

/**
 * Get all body weight entries sorted by timestamp (descending)
 * @returns {Promise<BodyWeightEntry[]>} - Array of body weight entries
 */
export async function getAllBodyWeights(): Promise<BodyWeightEntry[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([BODY_WEIGHT_STORE], 'readonly');
    const store = transaction.objectStore(BODY_WEIGHT_STORE);
    const index = store.index('timestamp');
    const request = index.getAll();

    request.onsuccess = () => {
      const entries = request.result as BodyWeightEntry[];
      // Sort by timestamp descending (most recent first)
      entries.sort((a, b) => b.timestamp - a.timestamp);
      resolve(entries);
    };

    request.onerror = () => reject(new Error('Failed to get body weights'));
  });
}

/**
 * Save user profile to the database
 * @param {UserProfile} profile - User profile object with goal and facts
 * @returns {Promise<void>}
 */
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROFILE_STORE], 'readwrite');
    const store = transaction.objectStore(PROFILE_STORE);
    
    const profileEntry: UserProfile = {
      id: 'user',
      goal: profile.goal || '',
      facts: profile.facts || ''
    };

    const request = store.put(profileEntry);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to save user profile'));
  });
}

/**
 * Get user profile from the database
 * @returns {Promise<UserProfile | null>} - User profile or null if none exists
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROFILE_STORE], 'readonly');
    const store = transaction.objectStore(PROFILE_STORE);
    const request = store.get('user');

    request.onsuccess = () => {
      const profile = request.result as UserProfile | undefined;
      resolve(profile || null);
    };

    request.onerror = () => reject(new Error('Failed to get user profile'));
  });
}

/**
 * Save coach feedback entry to the database
 * @param {string} feedback - Feedback text from AI coach
 * @returns {Promise<number>} - Returns the auto-generated ID
 */
export async function saveCoachFeedback(feedback: string): Promise<number> {
  // Validate feedback is not empty
  if (!feedback || feedback.trim().length === 0) {
    throw new Error('Feedback cannot be empty');
  }

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([COACH_FEEDBACK_STORE], 'readwrite');
    const store = transaction.objectStore(COACH_FEEDBACK_STORE);
    
    const entry: CoachFeedbackEntry = {
      feedback: feedback.trim(),
      timestamp: Date.now()
    };

    const request = store.add(entry);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Failed to save coach feedback'));
  });
}

/**
 * Get all coach feedback entries sorted by timestamp (descending)
 * @returns {Promise<CoachFeedbackEntry[]>} - Array of coach feedback entries
 */
export async function getAllCoachFeedback(): Promise<CoachFeedbackEntry[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([COACH_FEEDBACK_STORE], 'readonly');
    const store = transaction.objectStore(COACH_FEEDBACK_STORE);
    const index = store.index('timestamp');
    const request = index.getAll();

    request.onsuccess = () => {
      const entries = request.result as CoachFeedbackEntry[];
      // Sort by timestamp descending (most recent first)
      entries.sort((a, b) => b.timestamp - a.timestamp);
      resolve(entries);
    };

    request.onerror = () => reject(new Error('Failed to get coach feedback'));
  });
}

/**
 * Delete coach feedback entry from the database
 * @param {number} id - ID of the feedback entry to delete
 * @returns {Promise<void>}
 */
export async function deleteCoachFeedback(id: number): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([COACH_FEEDBACK_STORE], 'readwrite');
    const store = transaction.objectStore(COACH_FEEDBACK_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to delete coach feedback'));
  });
}

/**
 * Export all data in AI coach friendly format
 * @returns {Promise<import('../lib/aiCoachExport').AICoachExportData>} - AI coach export data
 */
export async function exportAICoachData(): Promise<import('../lib/aiCoachExport').AICoachExportData> {
  // Use dynamic import to avoid circular dependencies
  const aiCoachExport = await import('../lib/aiCoachExport');

  const [exercises, workoutLogs, bodyWeights, userProfile, coachFeedback] = await Promise.all([
    getAllExercises(),
    getAllWorkoutLogs(),
    getAllBodyWeights(),
    getUserProfile(),
    getAllCoachFeedback()
  ]);

  // Transform data
  const workoutSessions = aiCoachExport.groupWorkoutSessions(workoutLogs, exercises);
  const exerciseProgressions = aiCoachExport.createExerciseProgressions(workoutLogs);
  const bodyWeightLog = aiCoachExport.formatBodyWeightLog(bodyWeights);
  const statistics = aiCoachExport.calculateStatistics(workoutLogs, workoutSessions);
  const sessionStructure = aiCoachExport.formatSessionStructure();

  return {
    exportDate: new Date().toISOString(),
    user: {
      goal: userProfile?.goal || '',
      facts: userProfile?.facts || '',
    },
    workoutSessions,
    exerciseProgressions,
    bodyWeightLog,
    statistics,
    sessionStructure,
    coachFeedback,
  };
}
