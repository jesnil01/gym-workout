import type { WorkoutLogEntry, Exercise, BodyWeightEntry, CoachFeedbackEntry } from '../db/indexedDB';
import type { SupersetBlock, SessionV2 } from '../schema/sessionSchema';

export interface AICoachExportData {
  exportDate: string;
  user: {
    goal: string;
    facts: string;
  };
  workoutSessions: WorkoutSession[];
  exerciseProgressions: Record<string, ExerciseProgression[]>;
  bodyWeightLog: BodyWeightLogEntry[];
  statistics: Statistics;
  sessionStructure: SessionStructure[];
  coachFeedback: CoachFeedbackEntry[];
}

export interface WorkoutSession {
  date: string;
  sessionId: string;
  sessionName: string;
  exercises: WorkoutExercise[];
  cardio?: {
    type: string;
    time?: number;
    pace?: number;
  };
}

interface WorkoutExercise {
  exerciseId: string;
  exerciseName: string;
  value: number;
  unit: string;
  allSetsCompletedSuccessfully: boolean;
}

export interface ExerciseProgression {
  date: string;
  value: number;
  sessionId: string;
}

export interface BodyWeightLogEntry {
  date: string;
  weight: number;
}

export interface Statistics {
  workoutCounts: {
    totalGymSessions: number;
    totalCardioSessions: number;
    totalAllSessions: number;
    gymSessionsLast7Days: number;
    gymSessionsLast30Days: number;
    gymSessionsLast90Days: number;
    cardioSessionsLast7Days: number;
    cardioSessionsLast30Days: number;
    cardioSessionsLast90Days: number;
  };
  frequency: {
    averageGymSessionsPerWeek: number;
    averageGymSessionsPerMonth: number;
    averageCardioSessionsPerWeek: number;
    averageCardioSessionsPerMonth: number;
  };
  sessionBreakdown: {
    sessionA: SessionBreakdownEntry;
    sessionB: SessionBreakdownEntry;
    sessionS: SessionBreakdownEntry;
    cardio: {
      running: SessionBreakdownEntry;
      floorball: SessionBreakdownEntry;
    };
  };
  recentActivity: {
    lastGymSessionDate: string | null;
    lastCardioSessionDate: string | null;
  };
  weeklySummaries: WeeklySummary[];
}

interface SessionBreakdownEntry {
  total: number;
  last7Days: number;
  last30Days: number;
  last90Days: number;
}

interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  gymSessions: number;
  cardioSessions: number;
}

export interface SessionStructure {
  id: string;
  name: string;
  supersets: Array<{
    rest: number;
    exercises: Array<{
      id: string;
      name: string;
      sets: number;
      reps: number | string;
      metricType?: 'weight' | 'time';
    }>;
  }>;
}

/**
 * Get the start of the week (Monday) for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

/**
 * Get the end of the week (Sunday) for a given date
 */
function getWeekEnd(date: Date): Date {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return weekEnd;
}

/**
 * Format timestamp to ISO date string
 */
function formatDate(timestamp: number): string {
  return new Date(timestamp).toISOString().split('T')[0];
}

/**
 * Group workout logs by unique date + sessionId combinations
 */
export function groupWorkoutSessions(
  logs: WorkoutLogEntry[],
  exercises: Exercise[],
  sessions: SessionV2[]
): WorkoutSession[] {
  const exerciseMap = new Map<string, string>();
  exercises.forEach(ex => {
    exerciseMap.set(ex.id, ex.name);
  });

  const sessionNameMap = new Map<string, string>();
  sessions.forEach(session => {
    sessionNameMap.set(session.id, session.name);
  });
  sessionNameMap.set('running', 'Running');
  sessionNameMap.set('floorball', 'Floorball');

  // Group by date + sessionId
  const sessionMap = new Map<string, {
    sessionId: string;
    timestamp: number;
    exercises: Map<string, WorkoutExercise>;
    cardio?: {
      type: string;
      time?: number;
      pace?: number;
    };
  }>();

  logs.forEach(log => {
    const date = new Date(log.timestamp);
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${log.sessionId}`;

    if (!sessionMap.has(dateKey)) {
      sessionMap.set(dateKey, {
        sessionId: log.sessionId,
        timestamp: log.timestamp,
        exercises: new Map(),
      });
    }

    const session = sessionMap.get(dateKey)!;

    // Handle cardio sessions
    if (log.type === 'cardio') {
      session.cardio = {
        type: log.sessionId,
        time: log.time,
        pace: log.pace,
      };
      // Update timestamp to most recent for cardio
      if (log.timestamp > session.timestamp) {
        session.timestamp = log.timestamp;
      }
    } else {
      // Handle regular exercises
      const exerciseName = exerciseMap.get(log.exerciseId) || log.exerciseId;
      // Regular exercises use kg, cardio uses seconds (but cardio is handled above)
      const unit = 'kg';
      
      session.exercises.set(log.exerciseId, {
        exerciseId: log.exerciseId,
        exerciseName,
        value: log.value,
        unit,
        allSetsCompletedSuccessfully: log.completed,
      });

      // Use earliest timestamp for regular sessions
      if (log.timestamp < session.timestamp) {
        session.timestamp = log.timestamp;
      }
    }
  });

  // Convert to array and format
  return Array.from(sessionMap.values())
    .map(session => ({
      date: formatDate(session.timestamp),
      sessionId: session.sessionId,
      sessionName: sessionNameMap.get(session.sessionId) || `Session ${session.sessionId}`,
      exercises: Array.from(session.exercises.values()),
      ...(session.cardio && { cardio: session.cardio }),
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Create exercise progressions
 */
export function createExerciseProgressions(
  logs: WorkoutLogEntry[]
): Record<string, ExerciseProgression[]> {
  const progressions: Record<string, ExerciseProgression[]> = {};

  logs.forEach(log => {
    if (log.type === 'cardio') return;

    if (!progressions[log.exerciseId]) {
      progressions[log.exerciseId] = [];
    }

    progressions[log.exerciseId].push({
      date: formatDate(log.timestamp),
      value: log.value,
      sessionId: log.sessionId,
    });
  });

  // Sort each progression chronologically
  Object.keys(progressions).forEach(exerciseId => {
    progressions[exerciseId].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  });

  return progressions;
}

/**
 * Format body weight log
 */
export function formatBodyWeightLog(weights: BodyWeightEntry[]): BodyWeightLogEntry[] {
  return weights.map(entry => ({
    date: formatDate(entry.timestamp),
    weight: entry.weight,
  })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Calculate comprehensive statistics
 */
export function calculateStatistics(
  logs: WorkoutLogEntry[],
  sessions: WorkoutSession[]
): Statistics {
  const now = Date.now();
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = now - (90 * 24 * 60 * 60 * 1000);

  // Separate gym and cardio sessions
  const gymSessions = sessions.filter(s => !s.cardio);
  const cardioSessions = sessions.filter(s => s.cardio);

  // Count totals
  const totalGymSessions = gymSessions.length;
  const totalCardioSessions = cardioSessions.length;
  const totalAllSessions = totalGymSessions + totalCardioSessions;

  // Count by time period
  const gymSessionsLast7Days = gymSessions.filter(s => 
    new Date(s.date).getTime() >= sevenDaysAgo
  ).length;
  const gymSessionsLast30Days = gymSessions.filter(s => 
    new Date(s.date).getTime() >= thirtyDaysAgo
  ).length;
  const gymSessionsLast90Days = gymSessions.filter(s => 
    new Date(s.date).getTime() >= ninetyDaysAgo
  ).length;

  const cardioSessionsLast7Days = cardioSessions.filter(s => 
    new Date(s.date).getTime() >= sevenDaysAgo
  ).length;
  const cardioSessionsLast30Days = cardioSessions.filter(s => 
    new Date(s.date).getTime() >= thirtyDaysAgo
  ).length;
  const cardioSessionsLast90Days = cardioSessions.filter(s => 
    new Date(s.date).getTime() >= ninetyDaysAgo
  ).length;

  // Calculate frequency
  const oldestSession = sessions.length > 0 
    ? new Date(sessions[sessions.length - 1].date).getTime()
    : now;
  const daysSinceFirstSession = Math.max(1, (now - oldestSession) / (24 * 60 * 60 * 1000));
  const weeksSinceFirstSession = daysSinceFirstSession / 7;
  const monthsSinceFirstSession = daysSinceFirstSession / 30;

  const averageGymSessionsPerWeek = weeksSinceFirstSession > 0 
    ? totalGymSessions / weeksSinceFirstSession 
    : 0;
  const averageGymSessionsPerMonth = monthsSinceFirstSession > 0 
    ? totalGymSessions / monthsSinceFirstSession 
    : 0;
  const averageCardioSessionsPerWeek = weeksSinceFirstSession > 0 
    ? totalCardioSessions / weeksSinceFirstSession 
    : 0;
  const averageCardioSessionsPerMonth = monthsSinceFirstSession > 0 
    ? totalCardioSessions / monthsSinceFirstSession 
    : 0;

  // Session breakdown
  const sessionBreakdown = {
    sessionA: countSessionType(sessions, 'A', sevenDaysAgo, thirtyDaysAgo, ninetyDaysAgo),
    sessionB: countSessionType(sessions, 'B', sevenDaysAgo, thirtyDaysAgo, ninetyDaysAgo),
    sessionS: countSessionType(sessions, 'S', sevenDaysAgo, thirtyDaysAgo, ninetyDaysAgo),
    cardio: {
      running: countCardioType(sessions, 'running', sevenDaysAgo, thirtyDaysAgo, ninetyDaysAgo),
      floorball: countCardioType(sessions, 'floorball', sevenDaysAgo, thirtyDaysAgo, ninetyDaysAgo),
    },
  };

  // Recent activity
  const lastGymSession = gymSessions.length > 0 ? gymSessions[0].date : null;
  const lastCardioSession = cardioSessions.length > 0 ? cardioSessions[0].date : null;

  // Weekly summaries
  const weeklySummaries = generateWeeklySummaries(sessions);

  return {
    workoutCounts: {
      totalGymSessions,
      totalCardioSessions,
      totalAllSessions,
      gymSessionsLast7Days,
      gymSessionsLast30Days,
      gymSessionsLast90Days,
      cardioSessionsLast7Days,
      cardioSessionsLast30Days,
      cardioSessionsLast90Days,
    },
    frequency: {
      averageGymSessionsPerWeek,
      averageGymSessionsPerMonth,
      averageCardioSessionsPerWeek,
      averageCardioSessionsPerMonth,
    },
    sessionBreakdown,
    recentActivity: {
      lastGymSessionDate: lastGymSession,
      lastCardioSessionDate: lastCardioSession,
    },
    weeklySummaries,
  };
}

/**
 * Count sessions by type
 */
function countSessionType(
  sessions: WorkoutSession[],
  sessionId: string,
  sevenDaysAgo: number,
  thirtyDaysAgo: number,
  ninetyDaysAgo: number
): SessionBreakdownEntry {
  const filtered = sessions.filter(s => s.sessionId === sessionId && !s.cardio);
  
  return {
    total: filtered.length,
    last7Days: filtered.filter(s => new Date(s.date).getTime() >= sevenDaysAgo).length,
    last30Days: filtered.filter(s => new Date(s.date).getTime() >= thirtyDaysAgo).length,
    last90Days: filtered.filter(s => new Date(s.date).getTime() >= ninetyDaysAgo).length,
  };
}

/**
 * Count cardio sessions by type
 */
function countCardioType(
  sessions: WorkoutSession[],
  cardioType: string,
  sevenDaysAgo: number,
  thirtyDaysAgo: number,
  ninetyDaysAgo: number
): SessionBreakdownEntry {
  const filtered = sessions.filter(s => s.cardio && s.cardio.type === cardioType);
  
  return {
    total: filtered.length,
    last7Days: filtered.filter(s => new Date(s.date).getTime() >= sevenDaysAgo).length,
    last30Days: filtered.filter(s => new Date(s.date).getTime() >= thirtyDaysAgo).length,
    last90Days: filtered.filter(s => new Date(s.date).getTime() >= ninetyDaysAgo).length,
  };
}

/**
 * Generate weekly summaries
 */
function generateWeeklySummaries(sessions: WorkoutSession[]): WeeklySummary[] {
  if (sessions.length === 0) return [];

  // Group sessions by week
  const weekMap = new Map<string, {
    weekStart: Date;
    weekEnd: Date;
    gymSessions: number;
    cardioSessions: number;
  }>();

  sessions.forEach(session => {
    const date = new Date(session.date);
    const weekStart = getWeekStart(date);
    const weekEnd = getWeekEnd(date);
    const weekKey = `${weekStart.getTime()}`;

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, {
        weekStart,
        weekEnd,
        gymSessions: 0,
        cardioSessions: 0,
      });
    }

    const week = weekMap.get(weekKey)!;
    if (session.cardio) {
      week.cardioSessions++;
    } else {
      week.gymSessions++;
    }
  });

  // Convert to array and format
  return Array.from(weekMap.values())
    .map(week => ({
      weekStart: formatDate(week.weekStart.getTime()),
      weekEnd: formatDate(week.weekEnd.getTime()),
      gymSessions: week.gymSessions,
      cardioSessions: week.cardioSessions,
    }))
    .sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime());
}

/**
 * Format session structure for export (v2 blocks -> legacy SessionStructure format)
 */
export function formatSessionStructure(sessions: SessionV2[]): SessionStructure[] {
  return sessions.map(session => ({
    id: session.id,
    name: session.name,
    supersets: session.blocks
      .filter((block): block is SupersetBlock => block.type === 'superset')
      .map(block => ({
        rest: block.rest.afterRoundSeconds,
        exercises: block.exercises.map(step => {
          const reps: number | string =
            step.target.type === 'reps'
              ? step.target.reps
              : step.target.type === 'range'
                ? `${step.target.min}-${step.target.max}`
                : step.target.type === 'time'
                  ? `${step.target.seconds}s`
                  : 10;
          const metricType: 'weight' | 'time' = step.target.type === 'time' ? 'time' : 'weight';
          return {
            id: step.id,
            name: step.name,
            sets: step.sets,
            reps,
            metricType,
          };
        }),
      })),
  }));
}
