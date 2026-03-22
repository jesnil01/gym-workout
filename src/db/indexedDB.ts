import type { SessionV2 } from '../schema/sessionSchema';
import { SessionSchemaV2 } from '../schema/sessionSchema';
import { sessions as defaultSessions } from '../config/sessions';
import { backfillLoggedSessionsFromLogs } from '../lib/loggedSessionMigration';

const DB_NAME = 'GymWorkoutDB';
const DB_VERSION = 9;

const EXERCISES_STORE = 'exercises';
const WORKOUT_LOGS_STORE = 'workoutLogs';
const BODY_WEIGHT_STORE = 'bodyWeight';
const PROFILE_STORE = 'profile';
const COACH_FEEDBACK_STORE = 'coachFeedback';
const SESSIONS_STORE = 'sessions';
const LOGGED_SESSIONS_STORE = 'loggedSessions';

let dbInstance: IDBDatabase | null = null;

export interface Exercise {
  id: string;
  name: string;
}

export interface WorkoutLogEntry {
  id?: number;
  exerciseId: string;
  value: number;
  attempted: boolean; // indicates exercise was attempted
  completed: boolean; // indicates if all reps were achieved
  timestamp: number;
  sessionId: string;
  /** Stable id for one completed workout (links to LoggedSession) */
  sessionInstanceId?: string;
  type?: 'cardio';
  time?: number; // Time in seconds
  pace?: number; // Pace per km in minutes (only for running)
}

export interface LoggedSession {
  id: string;
  templateSessionId: string;
  occurredAt: number;
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

      // Create sessions object store (v7) and seed with default sessions
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
        const transaction = (event.target as IDBOpenDBRequest).transaction!;
        const store = transaction.objectStore(SESSIONS_STORE);
        for (const session of defaultSessions) {
          store.put(session);
        }
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

      // Migration from version 7 to 8: add attempted field to all existing entries
      if (oldVersion < 8 && db.objectStoreNames.contains(WORKOUT_LOGS_STORE)) {
        const transaction = (event.target as IDBOpenDBRequest).transaction!;
        const store = transaction.objectStore(WORKOUT_LOGS_STORE);
        const request = store.openCursor();

        request.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
          if (cursor) {
            const entry = cursor.value;
            // Add attempted: true to all existing entries (since they exist, they were attempted)
            if (!('attempted' in entry)) {
              const updatedEntry = {
                ...entry,
                attempted: true
              };
              cursor.update(updatedEntry);
            }
            cursor.continue();
          }
        };
      }

      // Version 9: logged sessions + sessionInstanceId index on workout logs
      if (oldVersion < 9) {
        if (!db.objectStoreNames.contains(LOGGED_SESSIONS_STORE)) {
          db.createObjectStore(LOGGED_SESSIONS_STORE, { keyPath: 'id' });
        }
        if (db.objectStoreNames.contains(WORKOUT_LOGS_STORE)) {
          const transaction = (event.target as IDBOpenDBRequest).transaction!;
          const logStore = transaction.objectStore(WORKOUT_LOGS_STORE);
          if (!logStore.indexNames.contains('sessionInstanceId')) {
            logStore.createIndex('sessionInstanceId', 'sessionInstanceId', { unique: false });
          }
        }
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
 * @param {boolean} entry.attempted - Whether exercise was attempted
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

    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(new Error('Failed to save workout log'));
  });
}

/**
 * Save or update a workout log entry (upsert)
 * Checks for existing entry by exerciseId + sessionId + date (same day)
 * If exists: updates existing entry (preserves original timestamp)
 * If not exists: creates new entry
 * @param {Object} entry - Workout log entry
 * @param {IDBObjectStore} store - IndexedDB object store (must be from active transaction)
 * @returns {Promise<number>} - Returns the entry ID (existing or new)
 */
function newSessionInstanceId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `ls-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

async function saveOrUpdateWorkoutLogInTransaction(
  entry: Omit<WorkoutLogEntry, 'id' | 'timestamp'>,
  store: IDBObjectStore
): Promise<number> {
  if (entry.sessionInstanceId) {
    return new Promise((resolve, reject) => {
      const index = store.index('sessionInstanceId');
      const request = index.openCursor(IDBKeyRange.only(entry.sessionInstanceId));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          const log = cursor.value as WorkoutLogEntry;
          if (log.exerciseId === entry.exerciseId && log.id !== undefined) {
            const updatedEntry: WorkoutLogEntry = {
              ...log,
              ...entry,
              timestamp: log.timestamp
            };
            const updateRequest = store.put(updatedEntry);
            updateRequest.onsuccess = () => resolve(log.id!);
            updateRequest.onerror = () => reject(new Error('Failed to update workout log'));
            return;
          }
          cursor.continue();
        } else {
          const logEntry: WorkoutLogEntry = {
            ...entry,
            timestamp: Date.now()
          };
          const addRequest = store.add(logEntry);
          addRequest.onsuccess = () => resolve(addRequest.result as number);
          addRequest.onerror = () => reject(new Error('Failed to save workout log'));
        }
      };

      request.onerror = () => reject(new Error('Failed to query workout logs'));
    });
  }

  return new Promise((resolve, reject) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;

    const index = store.index('exerciseId');
    const request = index.openCursor(IDBKeyRange.only(entry.exerciseId));

    let existingEntry: WorkoutLogEntry | null = null;

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor) {
        const log = cursor.value as WorkoutLogEntry;
        if (
          log.sessionId === entry.sessionId &&
          log.timestamp >= todayStart &&
          log.timestamp < todayEnd
        ) {
          existingEntry = log;
          if (existingEntry.id !== undefined) {
            const updatedEntry: WorkoutLogEntry = {
              ...existingEntry,
              ...entry,
              timestamp: existingEntry.timestamp
            };
            const updateRequest = store.put(updatedEntry);
            updateRequest.onsuccess = () => resolve(existingEntry!.id!);
            updateRequest.onerror = () => reject(new Error('Failed to update workout log'));
          }
          return;
        }
        cursor.continue();
      } else {
        if (!existingEntry) {
          const logEntry: WorkoutLogEntry = {
            ...entry,
            timestamp: Date.now()
          };
          const addRequest = store.add(logEntry);
          addRequest.onsuccess = () => resolve(addRequest.result as number);
          addRequest.onerror = () => reject(new Error('Failed to save workout log'));
        }
      }
    };

    request.onerror = () => reject(new Error('Failed to query workout logs'));
  });
}

/**
 * Save multiple workout log entries atomically in a single transaction
 * Creates one LoggedSession row and links all logs with the same sessionInstanceId.
 */
export async function saveSessionEntries(entries: Array<Omit<WorkoutLogEntry, 'id' | 'timestamp'>>): Promise<void> {
  if (entries.length === 0) {
    return;
  }

  const templateSessionId = entries[0].sessionId;
  const sessionInstanceId = newSessionInstanceId();
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  const occurredAt = d.getTime();
  const loggedSession: LoggedSession = {
    id: sessionInstanceId,
    templateSessionId,
    occurredAt
  };

  const withInstance = entries.map((e) => ({ ...e, sessionInstanceId }));

  const db = await initDB();
  return new Promise((resolve, reject) => {
    let hasError = false;
    const transaction = db.transaction([LOGGED_SESSIONS_STORE, WORKOUT_LOGS_STORE], 'readwrite');
    const lsStore = transaction.objectStore(LOGGED_SESSIONS_STORE);
    const logStore = transaction.objectStore(WORKOUT_LOGS_STORE);

    transaction.oncomplete = () => {
      if (!hasError) {
        resolve();
      }
    };
    transaction.onerror = () => {
      hasError = true;
      reject(transaction.error ?? new Error('Transaction failed'));
    };

    const putReq = lsStore.put(loggedSession);
    putReq.onerror = () => {
      hasError = true;
      reject(new Error('Failed to save logged session'));
    };

    withInstance.forEach((entry) => {
      saveOrUpdateWorkoutLogInTransaction(entry, logStore).catch((err) => {
        if (!hasError) {
          hasError = true;
          reject(err);
        }
      });
    });
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
    const request = index.getAll(exerciseId);

    request.onsuccess = () => {
      const allEntries = request.result as WorkoutLogEntry[];
      if (allEntries.length === 0) {
        resolve(null);
        return;
      }
      // Sort by timestamp descending (most recent first) and return the first one
      const sortedEntries = allEntries.sort((a, b) => b.timestamp - a.timestamp);
      resolve(sortedEntries[0]);
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
    const request = index.getAll(exerciseId);

    request.onsuccess = () => {
      const allEntries = request.result as WorkoutLogEntry[];
      // Sort by timestamp descending (most recent first) and take first N
      const sortedEntries = allEntries
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
      resolve(sortedEntries);
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
 * Update a workout log entry
 * @param {number} id - ID of the log entry to update
 * @param {Partial<WorkoutLogEntry>} updates - Partial entry with fields to update
 * @returns {Promise<void>}
 */
export async function updateWorkoutLog(id: number, updates: Partial<WorkoutLogEntry>): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WORKOUT_LOGS_STORE], 'readwrite');
    const store = transaction.objectStore(WORKOUT_LOGS_STORE);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const existingEntry = getRequest.result as WorkoutLogEntry | undefined;
      if (!existingEntry) {
        reject(new Error('Workout log entry not found'));
        return;
      }

      const updatedEntry = {
        ...existingEntry,
        ...updates
      };

      const putRequest = store.put(updatedEntry);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(new Error('Failed to update workout log'));
    };

    getRequest.onerror = () => reject(new Error('Failed to get workout log entry'));
  });
}

/**
 * Delete a workout log entry
 * @param {number} id - ID of the log entry to delete
 * @returns {Promise<void>}
 */
export async function deleteWorkoutLog(id: number): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WORKOUT_LOGS_STORE], 'readwrite');
    const store = transaction.objectStore(WORKOUT_LOGS_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to delete workout log'));
  });
}

/**
 * Backfill LoggedSession rows and sessionInstanceId on legacy workout logs (idempotent).
 */
export async function runLoggedSessionsBackfill(): Promise<void> {
  const logs = await getAllWorkoutLogs();
  const { loggedSessions, assignments } = backfillLoggedSessionsFromLogs(logs, newSessionInstanceId);
  if (loggedSessions.length === 0) {
    return;
  }

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([LOGGED_SESSIONS_STORE, WORKOUT_LOGS_STORE], 'readwrite');
    const lsStore = transaction.objectStore(LOGGED_SESSIONS_STORE);
    const logStore = transaction.objectStore(WORKOUT_LOGS_STORE);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Logged session migration failed'));

    for (const ls of loggedSessions) {
      lsStore.put(ls);
    }

    for (const [logId, instanceId] of assignments) {
      const getReq = logStore.get(logId);
      getReq.onsuccess = () => {
        const log = getReq.result as WorkoutLogEntry | undefined;
        if (log && log.sessionInstanceId == null) {
          logStore.put({ ...log, sessionInstanceId: instanceId });
        }
      };
    }
  });
}

export async function getLoggedSession(id: string): Promise<LoggedSession | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([LOGGED_SESSIONS_STORE], 'readonly');
    const store = transaction.objectStore(LOGGED_SESSIONS_STORE);
    const request = store.get(id);
    request.onsuccess = () => resolve((request.result as LoggedSession | undefined) ?? null);
    request.onerror = () => reject(new Error('Failed to get logged session'));
  });
}

export async function getAllLoggedSessions(): Promise<LoggedSession[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([LOGGED_SESSIONS_STORE], 'readonly');
    const store = transaction.objectStore(LOGGED_SESSIONS_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as LoggedSession[]);
    request.onerror = () => reject(new Error('Failed to get logged sessions'));
  });
}

export async function getWorkoutLogsBySessionInstanceId(sessionInstanceId: string): Promise<WorkoutLogEntry[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WORKOUT_LOGS_STORE], 'readonly');
    const store = transaction.objectStore(WORKOUT_LOGS_STORE);
    const index = store.index('sessionInstanceId');
    const request = index.getAll(sessionInstanceId);
    request.onsuccess = () => {
      const logs = (request.result as WorkoutLogEntry[]).sort((a, b) => b.timestamp - a.timestamp);
      resolve(logs);
    };
    request.onerror = () => reject(new Error('Failed to get logs for session'));
  });
}

/**
 * Update occurredAt and normalize all log timestamps to that local noon (session day edit).
 */
export async function updateLoggedSessionDate(sessionInstanceId: string, newOccurredAtNoon: number): Promise<void> {
  const all = await getAllLoggedSessions();
  const current = all.find((ls) => ls.id === sessionInstanceId);
  if (!current) {
    throw new Error('Session not found');
  }

  for (const ls of all) {
    if (ls.id === sessionInstanceId) continue;
    if (ls.templateSessionId !== current.templateSessionId) continue;
    const a = new Date(ls.occurredAt);
    const b = new Date(newOccurredAtNoon);
    if (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    ) {
      throw new Error('You already have this session recorded on that date.');
    }
  }

  const logs = await getWorkoutLogsBySessionInstanceId(sessionInstanceId);
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([LOGGED_SESSIONS_STORE, WORKOUT_LOGS_STORE], 'readwrite');
    const lsStore = transaction.objectStore(LOGGED_SESSIONS_STORE);
    const logStore = transaction.objectStore(WORKOUT_LOGS_STORE);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Failed to update session date'));

    const getLs = lsStore.get(sessionInstanceId);
    getLs.onsuccess = () => {
      const ls = getLs.result as LoggedSession | undefined;
      if (!ls) {
        reject(new Error('Session not found'));
        return;
      }
      lsStore.put({ ...ls, occurredAt: newOccurredAtNoon });
      for (const log of logs) {
        if (log.id === undefined) continue;
        logStore.put({ ...log, timestamp: newOccurredAtNoon });
      }
    };
    getLs.onerror = () => reject(new Error('Failed to read session'));
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

/**
 * Get all sessions from the database
 * @returns {Promise<SessionV2[]>} - Array of all sessions
 */
export async function getAllSessions(): Promise<SessionV2[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SESSIONS_STORE], 'readonly');
    const store = transaction.objectStore(SESSIONS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const sessions = request.result as SessionV2[];
      resolve(sessions);
    };

    request.onerror = () => reject(new Error('Failed to get all sessions'));
  });
}

/**
 * Get a session by ID
 * @param {string} id - Session ID
 * @returns {Promise<SessionV2 | null>} - Session or null if not found
 */
async function getSession(id: string): Promise<SessionV2 | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SESSIONS_STORE], 'readonly');
    const store = transaction.objectStore(SESSIONS_STORE);
    const request = store.get(id);

    request.onsuccess = () => {
      const session = request.result as SessionV2 | undefined;
      resolve(session || null);
    };

    request.onerror = () => reject(new Error('Failed to get session'));
  });
}

/**
 * Save a session to the database (validates with Zod)
 * @param {SessionV2} session - Session to save
 * @returns {Promise<void>}
 */
async function saveSession(session: SessionV2): Promise<void> {
  SessionSchemaV2.parse(session);

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SESSIONS_STORE], 'readwrite');
    const store = transaction.objectStore(SESSIONS_STORE);
    const request = store.put(session);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to save session'));
  });
}

export interface BackupData {
  version: string;
  exportDate: number;
  exercises: Exercise[];
  workoutLogs: WorkoutLogEntry[];
  sessions?: SessionV2[];
  /** Present in backups from DB v9+ */
  loggedSessions?: LoggedSession[];
  /** Present in backups from v1.1.0+ */
  bodyWeights?: BodyWeightEntry[];
  userProfile?: UserProfile | null;
  coachFeedback?: CoachFeedbackEntry[];
}

/**
 * Export all database data as a backup object
 * @returns {Promise<BackupData>} - Backup data object with all app data stores
 */
export async function exportBackup(): Promise<BackupData> {
  const [exercises, workoutLogs, sessions, bodyWeights, userProfile, coachFeedback, loggedSessions] =
    await Promise.all([
      getAllExercises(),
      getAllWorkoutLogs(),
      getAllSessions(),
      getAllBodyWeights(),
      getUserProfile(),
      getAllCoachFeedback(),
      getAllLoggedSessions()
    ]);

  return {
    version: '1.2.0',
    exportDate: Date.now(),
    exercises,
    workoutLogs,
    sessions,
    loggedSessions,
    bodyWeights,
    userProfile,
    coachFeedback
  };
}

export interface ImportResult {
  success: boolean;
  exercisesImported: number;
  workoutLogsImported: number;
  sessionsImported?: number;
  bodyWeightsImported?: number;
  coachFeedbackImported?: number;
  profileRestored?: boolean;
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
    let sessionsImported = 0;
    let bodyWeightsImported = 0;
    let coachFeedbackImported = 0;
    let profileRestored = false;

    // Import sessions (if present in backup - optional for backward compatibility)
    if (backupData.sessions && Array.isArray(backupData.sessions) && backupData.sessions.length > 0) {
      const db = await initDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([SESSIONS_STORE], 'readwrite');
        const store = transaction.objectStore(SESSIONS_STORE);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(new Error('Failed to import sessions'));
        for (const session of backupData.sessions!) {
          try {
            const validated = SessionSchemaV2.parse(session);
            store.put(validated);
            sessionsImported++;
          } catch (err) {
            console.error(`Failed to import session ${session.id}:`, err);
          }
        }
      });
    }

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

    // Import logged sessions (before workout logs; optional for old backups)
    if (backupData.loggedSessions && Array.isArray(backupData.loggedSessions) && backupData.loggedSessions.length > 0) {
      const dbLs = await initDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = dbLs.transaction([LOGGED_SESSIONS_STORE], 'readwrite');
        const store = transaction.objectStore(LOGGED_SESSIONS_STORE);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(new Error('Failed to import logged sessions'));
        for (const ls of backupData.loggedSessions!) {
          store.put(ls);
        }
      });
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
            attempted: 'attempted' in log ? log.attempted : true, // Default to true for old backups
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

    // Import body weights (optional; v1.1.0+ backups)
    if (backupData.bodyWeights && Array.isArray(backupData.bodyWeights) && backupData.bodyWeights.length > 0) {
      const dbBw = await initDB();
      for (const bw of backupData.bodyWeights) {
        try {
          if (typeof bw.weight !== 'number' || typeof bw.timestamp !== 'number') continue;
          if (bw.weight <= 0 || (bw.weight * 10) % 1 !== 0) continue;
          await new Promise<void>((resolve, reject) => {
            const transaction = dbBw.transaction([BODY_WEIGHT_STORE], 'readwrite');
            const store = transaction.objectStore(BODY_WEIGHT_STORE);
            const entry: BodyWeightEntry = { weight: bw.weight, timestamp: bw.timestamp };
            const request = store.add(entry);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Failed to import body weight entry'));
          });
          bodyWeightsImported++;
        } catch (err) {
          console.error('Failed to import body weight entry:', err);
        }
      }
    }

    // Import user profile (optional; v1.1.0+ backups)
    if (backupData.userProfile != null && typeof backupData.userProfile === 'object') {
      const p = backupData.userProfile;
      try {
        await saveUserProfile({
          id: 'user',
          goal: typeof p.goal === 'string' ? p.goal : '',
          facts: typeof p.facts === 'string' ? p.facts : ''
        });
        profileRestored = true;
      } catch (err) {
        console.error('Failed to import user profile:', err);
      }
    }

    // Import coach feedback (optional; v1.1.0+ backups)
    if (backupData.coachFeedback && Array.isArray(backupData.coachFeedback) && backupData.coachFeedback.length > 0) {
      const dbCf = await initDB();
      for (const cf of backupData.coachFeedback) {
        try {
          const feedback =
            typeof cf.feedback === 'string' ? cf.feedback.trim() : '';
          if (!feedback || typeof cf.timestamp !== 'number') continue;
          await new Promise<void>((resolve, reject) => {
            const transaction = dbCf.transaction([COACH_FEEDBACK_STORE], 'readwrite');
            const store = transaction.objectStore(COACH_FEEDBACK_STORE);
            const entry: CoachFeedbackEntry = { feedback, timestamp: cf.timestamp };
            const request = store.add(entry);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Failed to import coach feedback'));
          });
          coachFeedbackImported++;
        } catch (err) {
          console.error('Failed to import coach feedback:', err);
        }
      }
    }

    await runLoggedSessionsBackfill().catch((err) =>
      console.error('Post-import logged session backfill:', err)
    );

    return {
      success: true,
      exercisesImported,
      workoutLogsImported,
      sessionsImported,
      bodyWeightsImported,
      coachFeedbackImported,
      profileRestored
    };
  } catch (err) {
    return {
      success: false,
      exercisesImported: 0,
      workoutLogsImported: 0,
      sessionsImported: 0,
      bodyWeightsImported: 0,
      coachFeedbackImported: 0,
      profileRestored: false,
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

    request.onsuccess = () => resolve(request.result as number);
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

    request.onsuccess = () => resolve(request.result as number);
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

  const [exercises, workoutLogs, bodyWeights, userProfile, coachFeedback, sessions, loggedSessions] =
    await Promise.all([
      getAllExercises(),
      getAllWorkoutLogs(),
      getAllBodyWeights(),
      getUserProfile(),
      getAllCoachFeedback(),
      getAllSessions(),
      getAllLoggedSessions()
    ]);

  // Transform data
  const workoutSessions = aiCoachExport.groupWorkoutSessions(workoutLogs, exercises, sessions, loggedSessions);
  const exerciseProgressions = aiCoachExport.createExerciseProgressions(workoutLogs);
  const bodyWeightLog = aiCoachExport.formatBodyWeightLog(bodyWeights);
  const statistics = aiCoachExport.calculateStatistics(workoutLogs, workoutSessions);
  const sessionStructure = aiCoachExport.formatSessionStructure(sessions);

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
