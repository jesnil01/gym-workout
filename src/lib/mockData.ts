import type { WorkoutLogEntry } from '../db/indexedDB';

/**
 * Generate mock workout logs for the last 7 days
 * Includes realistic progressions and workout patterns
 */
export function getMockWorkoutLogs(): WorkoutLogEntry[] {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  // Generate workouts spread across last 7 days
  // Day 0 (today): Session A
  // Day 1 (yesterday): Session B
  // Day 2: Session S
  // Day 3: Session A
  // Day 4: Session B
  // Day 5: (no workout)
  // Day 6: Session S
  
  const mockLogs: WorkoutLogEntry[] = [];
  
  // Helper to create logs for a session on a specific day
  const createSessionLogs = (sessionId: string, daysAgo: number, exercises: Array<{id: string, value: number}>) => {
    const timestamp = now - (daysAgo * oneDay);
    exercises.forEach(exercise => {
      mockLogs.push({
        exerciseId: exercise.id,
        value: exercise.value,
        completed: true,
        timestamp: timestamp + Math.random() * 10000, // Spread within the day
        sessionId
      });
    });
  };
  
  // Day 0 (today) - Session A - Latest weights
  createSessionLogs('A', 0, [
    { id: 'bench', value: 67.5 },
    { id: 'barbell_row', value: 57.5 },
    { id: 'incline_db_press', value: 22.5 },
    { id: 'lat_pulldown', value: 47.5 },
    { id: 'lateral_raise', value: 7.5 },
    { id: 'face_pull', value: 15 },
    { id: 'barbell_curl', value: 20 },
    { id: 'triceps_pushdown', value: 25 }
  ]);
  
  // Day 1 (yesterday) - Session B
  createSessionLogs('B', 1, [
    { id: 'squat', value: 87.5 },
    { id: 'lat_pulldown_neutral', value: 45 },
    { id: 'rdl', value: 70 },
    { id: 'seated_row', value: 40 },
    { id: 'reverse_lunge', value: 15 },
    { id: 'plank', value: 45 },
    { id: 'alt_db_curl', value: 10 },
    { id: 'overhead_triceps', value: 12.5 }
  ]);
  
  // Day 2 - Session S
  createSessionLogs('S', 2, [
    { id: 'bench', value: 65 },
    { id: 'barbell_row', value: 55 },
    { id: 'squat', value: 85 },
    { id: 'lat_pulldown', value: 45 },
    { id: 'barbell_curl', value: 20 },
    { id: 'triceps_pushdown', value: 25 }
  ]);
  
  // Day 3 - Session A - Previous weights
  createSessionLogs('A', 3, [
    { id: 'bench', value: 65 },
    { id: 'barbell_row', value: 55 },
    { id: 'incline_db_press', value: 20 },
    { id: 'lat_pulldown', value: 45 },
    { id: 'lateral_raise', value: 7.5 },
    { id: 'face_pull', value: 15 },
    { id: 'barbell_curl', value: 20 },
    { id: 'triceps_pushdown', value: 25 }
  ]);
  
  // Day 4 - Session B
  createSessionLogs('B', 4, [
    { id: 'squat', value: 85 },
    { id: 'lat_pulldown_neutral', value: 45 },
    { id: 'rdl', value: 70 },
    { id: 'seated_row', value: 40 },
    { id: 'reverse_lunge', value: 15 },
    { id: 'plank', value: 45 },
    { id: 'alt_db_curl', value: 10 },
    { id: 'overhead_triceps', value: 12.5 }
  ]);
  
  // Day 6 - Session S - Older weights
  createSessionLogs('S', 6, [
    { id: 'bench', value: 60 },
    { id: 'barbell_row', value: 50 },
    { id: 'squat', value: 80 },
    { id: 'lat_pulldown', value: 40 },
    { id: 'barbell_curl', value: 17.5 },
    { id: 'triceps_pushdown', value: 22.5 }
  ]);
  
  return mockLogs.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Get mock workout count for last 7 days
 */
export function getMockWorkoutCount(): number {
  return 5; // Sessions on days 0, 1, 2, 3, 4, 6 (day 5 has no workout)
}

/**
 * Get mock weight progressions
 * Returns Map of exerciseId -> {current, previous, exerciseName, timestamp}
 * Only includes exercises that were completed successfully AND show an increase
 * Excludes new exercises (no previous value)
 */
export function getMockWeightProgressions(): Map<string, {current: number; previous: number | null; exerciseName: string; timestamp: number}> {
  const progressions = new Map();
  
  // Only include exercises with completed=true AND current > previous (exclude new exercises)
  // Based on mock data: Day 0 has higher weights than Day 2/3
  
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  // Bench: 67.5 (Day 0) > 65 (Day 2) - INCLUDE - Most recent
  progressions.set('bench', {
    current: 67.5,
    previous: 65,
    exerciseName: 'Bench Press',
    timestamp: now - (0 * oneDay) // Day 0 (today)
  });
  
  // Squat: 87.5 (Day 1) > 85 (Day 2) - INCLUDE
  progressions.set('squat', {
    current: 87.5,
    previous: 85,
    exerciseName: 'Back Squat',
    timestamp: now - (1 * oneDay) // Day 1 (yesterday)
  });
  
  // Barbell Row: 57.5 (Day 0) > 55 (Day 2) - INCLUDE
  progressions.set('barbell_row', {
    current: 57.5,
    previous: 55,
    exerciseName: 'Barbell Row',
    timestamp: now - (0 * oneDay) // Day 0 (today)
  });
  
  // Lat Pulldown: 47.5 (Day 0) > 45 (Day 2) - INCLUDE
  progressions.set('lat_pulldown', {
    current: 47.5,
    previous: 45,
    exerciseName: 'Lat Pulldown',
    timestamp: now - (0 * oneDay) // Day 0 (today)
  });
  
  // Incline DB Press: 22.5 (Day 0) > 20 (Day 3) - INCLUDE
  progressions.set('incline_db_press', {
    current: 22.5,
    previous: 20,
    exerciseName: 'Incline Dumbbell Press',
    timestamp: now - (0 * oneDay) // Day 0 (today)
  });
  
  // Note: lateral_raise (7.5 = 7.5) and face_pull (15, no previous) are excluded
  // because they don't show an increase or have no previous value
  
  return progressions;
}
