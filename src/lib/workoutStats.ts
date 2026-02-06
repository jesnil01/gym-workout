import type { WorkoutLogEntry } from '../db/indexedDB';
import { sessions } from '../config/sessions';

export interface CompletedSession {
  sessionId: string;
  sessionName: string;
  timestamp: number;
}

/**
 * Get unique workout sessions count in the last N days
 * A workout is defined as a unique combination of sessionId + date
 */
export function getWorkoutCountInDays(logs: WorkoutLogEntry[], days: number): number {
  const now = Date.now();
  const daysAgo = now - (days * 24 * 60 * 60 * 1000);
  
  // Filter logs within date range
  const recentLogs = logs.filter(log => log.timestamp >= daysAgo);
  
  // Group by sessionId + date (day)
  const uniqueWorkouts = new Set<string>();
  
  recentLogs.forEach(log => {
    const date = new Date(log.timestamp);
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${log.sessionId}`;
    uniqueWorkouts.add(dateKey);
  });
  
  return uniqueWorkouts.size;
}

/**
 * Format weight/time progression display
 */
export function formatWeightProgression(
  current: number,
  previous: number | null,
  unit: string = ' kg'
): { display: string; trend: 'up' | 'down' | 'same' | 'new' } {
  if (previous === null) {
    return {
      display: `${current}${unit} (New!)`,
      trend: 'new'
    };
  }
  
  if (current > previous) {
    const diff = current - previous;
    return {
      display: `${current}${unit} (was ${previous}${unit}, +${diff}${unit})`,
      trend: 'up'
    };
  } else if (current < previous) {
    const diff = previous - current;
    return {
      display: `${current}${unit} (was ${previous}${unit}, -${diff}${unit})`,
      trend: 'down'
    };
  } else {
    return {
      display: `${current}${unit} (same)`,
      trend: 'same'
    };
  }
}

/**
 * Get completed sessions from workout logs
 * Groups logs by unique sessionId + date combinations
 * Returns array of completed sessions sorted by most recent first
 */
export function getCompletedSessions(logs: WorkoutLogEntry[]): CompletedSession[] {
  // Create a map to store unique sessions by sessionId + date
  const sessionMap = new Map<string, { sessionId: string; timestamp: number }>();
  
  // Create a map of sessionId to sessionName
  const sessionNameMap = new Map<string, string>();
  sessions.forEach(session => {
    sessionNameMap.set(session.id, session.name);
  });
  
  // Group logs by sessionId + date
  logs.forEach(log => {
    // Only include completed exercises
    if (!log.completed) {
      return;
    }
    
    const date = new Date(log.timestamp);
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${log.sessionId}`;
    
    // If this session+date combo doesn't exist, or this log is earlier (use earliest timestamp for the day)
    if (!sessionMap.has(dateKey)) {
      sessionMap.set(dateKey, {
        sessionId: log.sessionId,
        timestamp: log.timestamp
      });
    } else {
      // Use the earliest timestamp from that day
      const existing = sessionMap.get(dateKey)!;
      if (log.timestamp < existing.timestamp) {
        existing.timestamp = log.timestamp;
      }
    }
  });
  
  // Convert to array and add session names
  const completedSessions: CompletedSession[] = Array.from(sessionMap.values())
    .map(({ sessionId, timestamp }) => ({
      sessionId,
      sessionName: sessionNameMap.get(sessionId) || `Session ${sessionId}`,
      timestamp
    }))
    .sort((a, b) => b.timestamp - a.timestamp); // Sort by most recent first
  
  return completedSessions;
}
