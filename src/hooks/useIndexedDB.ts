import { useState, useEffect, useCallback } from 'react';
import { initDB, saveWorkoutLog, getLastExerciseEntry, getLastNExerciseEntries, getSessionHistory, saveExercise, getWorkoutsInDateRange, getAllWorkoutLogs, getAllExercises, exportBackup, type Exercise, type WorkoutLogEntry, type BackupData } from '../db/indexedDB';

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

  const getLastNEntries = useCallback(async (exerciseId: string, limit: number): Promise<WorkoutLogEntry[]> => {
    try {
      return await getLastNExerciseEntries(exerciseId, limit);
    } catch (err) {
      console.error('Failed to get last N exercise entries:', err);
      return [];
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

  const getWorkoutsInRange = useCallback(async (startDate: number, endDate: number): Promise<WorkoutLogEntry[]> => {
    try {
      return await getWorkoutsInDateRange(startDate, endDate);
    } catch (err) {
      console.error('Failed to get workouts in range:', err);
      return [];
    }
  }, []);

  const getAllLogs = useCallback(async (): Promise<WorkoutLogEntry[]> => {
    try {
      return await getAllWorkoutLogs();
    } catch (err) {
      console.error('Failed to get all logs:', err);
      return [];
    }
  }, []);

  const getAllExercisesData = useCallback(async (): Promise<Exercise[]> => {
    try {
      return await getAllExercises();
    } catch (err) {
      console.error('Failed to get all exercises:', err);
      return [];
    }
  }, []);

  const exportBackupData = useCallback(async (): Promise<BackupData> => {
    try {
      return await exportBackup();
    } catch (err) {
      console.error('Failed to export backup:', err);
      throw err;
    }
  }, []);

  return {
    dbReady,
    error,
    saveLog,
    getLastEntry,
    getLastNEntries,
    getHistory,
    saveExerciseData,
    getWorkoutsInRange,
    getAllLogs,
    getAllExercises: getAllExercisesData,
    exportBackup: exportBackupData
  };
}
