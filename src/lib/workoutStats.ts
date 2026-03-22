import type { LoggedSession, WorkoutLogEntry } from '../db/indexedDB';
import type { SessionV2 } from '../schema/sessionSchema';

export interface CompletedSession {
  sessionId: string;
  sessionName: string;
  timestamp: number;
  type?: 'cardio';
  time?: number; // Time in seconds
  pace?: number; // Pace per km in minutes (only for running)
  /** Present when row comes from LoggedSession + instance-linked logs */
  instanceId?: string;
}

/**
 * Get unique workout sessions count in the last N days
 * A workout is defined as a unique combination of sessionId + date
 */
export function getWorkoutCountInDays(
  logs: WorkoutLogEntry[],
  days: number,
  loggedSessions: LoggedSession[] = []
): number {
  const now = Date.now();
  const daysAgo = now - days * 24 * 60 * 60 * 1000;

  const recentLogs = logs.filter(
    (log) => log.timestamp >= daysAgo && (log.attempted ?? true) === true
  );

  const lsById = new Map(loggedSessions.map((ls) => [ls.id, ls]));
  const uniqueWorkouts = new Set<string>();

  recentLogs.forEach((log) => {
    if (log.sessionInstanceId && lsById.has(log.sessionInstanceId)) {
      uniqueWorkouts.add(`i:${log.sessionInstanceId}`);
    } else {
      const date = new Date(log.timestamp);
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${log.sessionId}`;
      uniqueWorkouts.add(`l:${dateKey}`);
    }
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
export function getCompletedSessions(
  logs: WorkoutLogEntry[],
  sessions: SessionV2[],
  loggedSessions: LoggedSession[] = []
): CompletedSession[] {
  const sessionNameMap = new Map<string, string>();
  sessions.forEach((session) => {
    sessionNameMap.set(session.id, session.name);
  });
  sessionNameMap.set('running', 'Running');
  sessionNameMap.set('floorball', 'Floorball');

  const lsById = new Map(loggedSessions.map((ls) => [ls.id, ls]));

  const instanceMap = new Map<
    string,
    {
      sessionId: string;
      timestamp: number;
      type?: 'cardio';
      time?: number;
      pace?: number;
      instanceId: string;
    }
  >();

  const legacyMap = new Map<
    string,
    { sessionId: string; timestamp: number; type?: 'cardio'; time?: number; pace?: number }
  >();

  logs.forEach((log) => {
    if (!(log.attempted ?? true) || !log.completed) {
      return;
    }

    if (log.sessionInstanceId && lsById.has(log.sessionInstanceId)) {
      const key = log.sessionInstanceId;
      if (!instanceMap.has(key)) {
        instanceMap.set(key, {
          sessionId: log.sessionId,
          timestamp: log.timestamp,
          type: log.type,
          time: log.time,
          pace: log.pace,
          instanceId: key
        });
      } else {
        const existing = instanceMap.get(key)!;
        if (log.type === 'cardio') {
          if (log.timestamp > existing.timestamp) {
            existing.timestamp = log.timestamp;
            existing.type = log.type;
            existing.time = log.time;
            existing.pace = log.pace;
          }
        } else if (log.timestamp < existing.timestamp) {
          existing.timestamp = log.timestamp;
        }
      }
    } else {
      const date = new Date(log.timestamp);
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${log.sessionId}`;
      if (!legacyMap.has(dateKey)) {
        legacyMap.set(dateKey, {
          sessionId: log.sessionId,
          timestamp: log.timestamp,
          type: log.type,
          time: log.time,
          pace: log.pace
        });
      } else {
        const existing = legacyMap.get(dateKey)!;
        if (log.type === 'cardio') {
          if (log.timestamp > existing.timestamp) {
            existing.timestamp = log.timestamp;
            existing.type = log.type;
            existing.time = log.time;
            existing.pace = log.pace;
          }
        } else if (log.timestamp < existing.timestamp) {
          existing.timestamp = log.timestamp;
        }
      }
    }
  });

  const fromInstances: CompletedSession[] = Array.from(instanceMap.values()).map(
    ({ sessionId, timestamp, type, time, pace, instanceId }) => ({
      sessionId,
      sessionName: sessionNameMap.get(sessionId) || `Session ${sessionId}`,
      timestamp,
      type,
      time,
      pace,
      instanceId
    })
  );

  const fromLegacy: CompletedSession[] = Array.from(legacyMap.values()).map(
    ({ sessionId, timestamp, type, time, pace }) => ({
      sessionId,
      sessionName: sessionNameMap.get(sessionId) || `Session ${sessionId}`,
      timestamp,
      type,
      time,
      pace
    })
  );

  return [...fromInstances, ...fromLegacy].sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Get usage count for each session template
 * Returns a map of sessionId -> count of completed sessions
 */
export function getSessionUsageCounts(
  logs: WorkoutLogEntry[],
  sessions: SessionV2[],
  loggedSessions: LoggedSession[] = []
): Map<string, number> {
  const completedSessions = getCompletedSessions(logs, sessions, loggedSessions);
  const countMap = new Map<string, number>();
  
  completedSessions.forEach(session => {
    const current = countMap.get(session.sessionId) || 0;
    countMap.set(session.sessionId, current + 1);
  });
  
  return countMap;
}
