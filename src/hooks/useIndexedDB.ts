import { useState, useEffect, useCallback } from 'react';
import { initDB, saveWorkoutLog, getLastExerciseEntry, getSessionHistory, saveExercise, type Exercise, type WorkoutLogEntry } from '../db/indexedDB';

export function useIndexedDB() {
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initDB()
      .then(() => {
        setDbReady(true);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
        console.error('Failed to initialize database:', err);
      });
  }, []);

  const saveLog = useCallback(async (entry: Omit<WorkoutLogEntry, 'id' | 'timestamp'>): Promise<number> => {
    try {
      const id = await saveWorkoutLog(entry);
      return id;
    } catch (err) {
      console.error('Failed to save workout log:', err);
      throw err;
    }
  }, []);

  const getLastEntry = useCallback(async (exerciseId: string): Promise<WorkoutLogEntry | null> => {
    try {
      return await getLastExerciseEntry(exerciseId);
    } catch (err) {
      console.error('Failed to get last exercise entry:', err);
      return null;
    }
  }, []);

  const getHistory = useCallback(async (sessionId: string): Promise<WorkoutLogEntry[]> => {
    try {
      return await getSessionHistory(sessionId);
    } catch (err) {
      console.error('Failed to get session history:', err);
      return [];
    }
  }, []);

  const saveExerciseData = useCallback(async (exercise: Exercise): Promise<void> => {
    try {
      await saveExercise(exercise);
    } catch (err) {
      console.error('Failed to save exercise:', err);
      throw err;
    }
  }, []);

  return {
    dbReady,
    error,
    saveLog,
    getLastEntry,
    getHistory,
    saveExerciseData
  };
}
