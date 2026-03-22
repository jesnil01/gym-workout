import { useState, useEffect, useCallback } from 'react';
import {
  initDB,
  runLoggedSessionsBackfill,
  saveWorkoutLog,
  getLastExerciseEntry,
  getLastNExerciseEntries,
  getSessionHistory,
  saveExercise,
  getWorkoutsInDateRange,
  getAllWorkoutLogs,
  getAllLoggedSessions,
  getLoggedSession,
  getWorkoutLogsBySessionInstanceId,
  getAllExercises,
  exportBackup,
  importBackup,
  saveBodyWeight,
  getAllBodyWeights,
  saveUserProfile,
  getUserProfile,
  exportAICoachData,
  saveCoachFeedback,
  getAllCoachFeedback,
  deleteCoachFeedback,
  updateWorkoutLog,
  deleteWorkoutLog,
  saveSessionEntries,
  updateLoggedSessionDate,
  type Exercise,
  type WorkoutLogEntry,
  type BackupData,
  type ImportResult,
  type BodyWeightEntry,
  type UserProfile,
  type CoachFeedbackEntry,
  type LoggedSession
} from '../db/indexedDB';
import type { AICoachExportData } from '../lib/aiCoachExport';

export function useIndexedDB() {
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initDB()
      .then(() => runLoggedSessionsBackfill())
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

  const getAllLoggedSessionsData = useCallback(async (): Promise<LoggedSession[]> => {
    try {
      return await getAllLoggedSessions();
    } catch (err) {
      console.error('Failed to get logged sessions:', err);
      return [];
    }
  }, []);

  const updateLoggedSessionDateData = useCallback(
    async (sessionInstanceId: string, newOccurredAtNoon: number): Promise<void> => {
      await updateLoggedSessionDate(sessionInstanceId, newOccurredAtNoon);
    },
    []
  );

  const getLoggedSessionData = useCallback(async (id: string) => {
    try {
      return await getLoggedSession(id);
    } catch (err) {
      console.error('Failed to get logged session:', err);
      return null;
    }
  }, []);

  const getWorkoutLogsBySessionInstanceIdData = useCallback(async (sessionInstanceId: string) => {
    try {
      return await getWorkoutLogsBySessionInstanceId(sessionInstanceId);
    } catch (err) {
      console.error('Failed to get logs for session:', err);
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

  const importBackupData = useCallback(async (backupData: BackupData): Promise<ImportResult> => {
    try {
      return await importBackup(backupData);
    } catch (err) {
      console.error('Failed to import backup:', err);
      throw err;
    }
  }, []);

  const saveBodyWeightData = useCallback(async (weight: number): Promise<number> => {
    try {
      return await saveBodyWeight(weight);
    } catch (err) {
      console.error('Failed to save body weight:', err);
      throw err;
    }
  }, []);

  const getAllBodyWeightsData = useCallback(async (): Promise<BodyWeightEntry[]> => {
    try {
      return await getAllBodyWeights();
    } catch (err) {
      console.error('Failed to get body weights:', err);
      return [];
    }
  }, []);

  const saveUserProfileData = useCallback(async (profile: UserProfile): Promise<void> => {
    try {
      await saveUserProfile(profile);
    } catch (err) {
      console.error('Failed to save user profile:', err);
      throw err;
    }
  }, []);

  const getUserProfileData = useCallback(async (): Promise<UserProfile | null> => {
    try {
      return await getUserProfile();
    } catch (err) {
      console.error('Failed to get user profile:', err);
      return null;
    }
  }, []);

  const exportAICoachDataFunc = useCallback(async (): Promise<AICoachExportData> => {
    try {
      return await exportAICoachData();
    } catch (err) {
      console.error('Failed to export AI coach data:', err);
      throw err;
    }
  }, []);

  const saveCoachFeedbackData = useCallback(async (feedback: string): Promise<number> => {
    try {
      return await saveCoachFeedback(feedback);
    } catch (err) {
      console.error('Failed to save coach feedback:', err);
      throw err;
    }
  }, []);

  const getAllCoachFeedbackData = useCallback(async (): Promise<CoachFeedbackEntry[]> => {
    try {
      return await getAllCoachFeedback();
    } catch (err) {
      console.error('Failed to get coach feedback:', err);
      return [];
    }
  }, []);

  const deleteCoachFeedbackData = useCallback(async (id: number): Promise<void> => {
    try {
      await deleteCoachFeedback(id);
    } catch (err) {
      console.error('Failed to delete coach feedback:', err);
      throw err;
    }
  }, []);

  const updateLog = useCallback(async (id: number, updates: Partial<WorkoutLogEntry>): Promise<void> => {
    try {
      await updateWorkoutLog(id, updates);
    } catch (err) {
      console.error('Failed to update workout log:', err);
      throw err;
    }
  }, []);

  const deleteLog = useCallback(async (id: number): Promise<void> => {
    try {
      await deleteWorkoutLog(id);
    } catch (err) {
      console.error('Failed to delete workout log:', err);
      throw err;
    }
  }, []);

  const saveSessionEntriesData = useCallback(async (entries: Array<Omit<WorkoutLogEntry, 'id' | 'timestamp'>>): Promise<void> => {
    try {
      await saveSessionEntries(entries);
    } catch (err) {
      console.error('Failed to save session entries:', err);
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
    exportBackup: exportBackupData,
    importBackup: importBackupData,
    saveBodyWeight: saveBodyWeightData,
    getAllBodyWeights: getAllBodyWeightsData,
    saveUserProfile: saveUserProfileData,
    getUserProfile: getUserProfileData,
    exportAICoachData: exportAICoachDataFunc,
    saveCoachFeedback: saveCoachFeedbackData,
    getAllCoachFeedback: getAllCoachFeedbackData,
    deleteCoachFeedback: deleteCoachFeedbackData,
    updateLog,
    deleteLog,
    saveSessionEntries: saveSessionEntriesData,
    getAllLoggedSessions: getAllLoggedSessionsData,
    updateLoggedSessionDate: updateLoggedSessionDateData,
    getLoggedSession: getLoggedSessionData,
    getWorkoutLogsBySessionInstanceId: getWorkoutLogsBySessionInstanceIdData
  };
}
