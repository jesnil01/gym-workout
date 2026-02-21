import type { WorkoutLogEntry, BodyWeightEntry, CoachFeedbackEntry, UserProfile } from '../db/indexedDB';
import type { CompletedSession } from './workoutStats';
import type { SessionV2 } from '../schema/sessionSchema';

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

/**
 * Get mock completed sessions
 * Returns sessions from days 0, 1, 2, 3, 4, 6 (matching existing mock data)
 */
export function getMockCompletedSessions(sessions: SessionV2[]): CompletedSession[] {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  const sessionNameMap = new Map<string, string>();
  sessions.forEach(session => {
    sessionNameMap.set(session.id, session.name);
  });
  
  // Sessions from mock data: Day 0 (A), Day 1 (B), Day 2 (S), Day 3 (A), Day 4 (B), Day 6 (S)
  const mockSessions: CompletedSession[] = [
    {
      sessionId: 'A',
      sessionName: sessionNameMap.get('A') || 'Session A',
      timestamp: now - (0 * oneDay) // Day 0 (today)
    },
    {
      sessionId: 'B',
      sessionName: sessionNameMap.get('B') || 'Session B',
      timestamp: now - (1 * oneDay) // Day 1 (yesterday)
    },
    {
      sessionId: 'S',
      sessionName: sessionNameMap.get('S') || 'Session S',
      timestamp: now - (2 * oneDay) // Day 2
    },
    {
      sessionId: 'A',
      sessionName: sessionNameMap.get('A') || 'Session A',
      timestamp: now - (3 * oneDay) // Day 3
    },
    {
      sessionId: 'B',
      sessionName: sessionNameMap.get('B') || 'Session B',
      timestamp: now - (4 * oneDay) // Day 4
    },
    {
      sessionId: 'S',
      sessionName: sessionNameMap.get('S') || 'Session S',
      timestamp: now - (6 * oneDay) // Day 6
    }
  ];
  
  // Sort by most recent first
  return mockSessions.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Get mock body weight entries
 * Returns body weight entries spread across the last 7 days
 */
export function getMockBodyWeights(): BodyWeightEntry[] {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  // Create mock body weight entries on different days
  // Realistic weight progression: slight variations around 75kg
  const mockWeights: BodyWeightEntry[] = [
    {
      id: 1,
      weight: 75.2,
      timestamp: now - (0 * oneDay) // Today
    },
    {
      id: 2,
      weight: 75.0,
      timestamp: now - (2 * oneDay) // 2 days ago
    },
    {
      id: 3,
      weight: 74.8,
      timestamp: now - (4 * oneDay) // 4 days ago
    },
    {
      id: 4,
      weight: 75.1,
      timestamp: now - (6 * oneDay) // 6 days ago
    }
  ];
  
  // Sort by most recent first
  return mockWeights.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Get mock coach feedback entries
 * Returns coach feedback entries spread across the last 14 days
 */
function getMockCoachFeedback(): CoachFeedbackEntry[] {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  // Create mock coach feedback entries with realistic feedback content
  const mockFeedback: CoachFeedbackEntry[] = [
    {
      id: 1,
      feedback: "Great progress on your bench press! You've increased from 65kg to 67.5kg. Focus on maintaining proper form and consider adding an extra set next week if you feel strong.",
      timestamp: now - (1 * oneDay) // Yesterday
    },
    {
      id: 2,
      feedback: "Your squat form looks solid. The progression from 85kg to 87.5kg shows consistent strength gains. Make sure to keep your core engaged throughout the movement.",
      timestamp: now - (3 * oneDay) // 3 days ago
    },
    {
      id: 3,
      feedback: "I noticed you've been consistent with your workouts - 5 sessions in the last 7 days is excellent! Your body weight has been stable around 75kg, which suggests you're maintaining muscle while potentially losing fat.",
      timestamp: now - (5 * oneDay) // 5 days ago
    },
    {
      id: 4,
      feedback: "Your upper body strength is improving well. The incline dumbbell press increase from 20kg to 22.5kg is impressive. Consider focusing on your back exercises to maintain balance.",
      timestamp: now - (7 * oneDay) // 7 days ago
    },
    {
      id: 5,
      feedback: "Good work on completing Session S! This full-body session helps maintain overall strength. Keep tracking your progress and don't forget to rest adequately between sessions.",
      timestamp: now - (10 * oneDay) // 10 days ago
    },
    {
      id: 6,
      feedback: "Your workout frequency is excellent. Remember to stay hydrated and get enough sleep - these are crucial for recovery and muscle growth. Keep up the great work!",
      timestamp: now - (12 * oneDay) // 12 days ago
    }
  ];
  
  // Sort by most recent first
  return mockFeedback.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Get mock user profile
 * Returns a user profile with realistic goals and facts
 */
function getMockUserProfile(): UserProfile {
  return {
    id: 'user',
    goal: "Build muscle mass and increase overall strength. Target: Bench press 80kg, Squat 100kg, and Deadlift 120kg within 6 months. Maintain current body weight around 75kg while improving body composition.",
    facts: "Age: 28, Height: 178cm, Training experience: 2 years. Prefers compound movements and enjoys strength training. Has a home gym setup with barbell, dumbbells, and basic equipment. Typically trains 4-5 times per week. No injuries or limitations. Focuses on progressive overload and tracking all workouts."
  };
}
