import type { CompletedSession } from './workoutStats';

export interface WorkoutStatus {
  daysSinceLastWorkout: number;
  hasWorkoutToday: boolean;
  hasWorkoutYesterday: boolean;
  streak: number;
}

/**
 * Calculate workout status from completed sessions
 * @param {CompletedSession[]} completedSessions - Array of completed sessions
 * @returns {WorkoutStatus} - Workout status object
 */
export function getWorkoutStatus(completedSessions: CompletedSession[]): WorkoutStatus {
  const oneDay = 24 * 60 * 60 * 1000;
  
  // Get today's date boundaries (start of day)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();
  const todayEnd = todayStart + oneDay;
  
  // Get yesterday's date boundaries
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStart = yesterday.getTime();
  const yesterdayEnd = yesterdayStart + oneDay;
  
  // Check for workouts today and yesterday
  const hasWorkoutToday = completedSessions.some(
    session => session.timestamp >= todayStart && session.timestamp < todayEnd
  );
  
  const hasWorkoutYesterday = completedSessions.some(
    session => session.timestamp >= yesterdayStart && session.timestamp < yesterdayEnd
  );
  
  // Calculate days since last workout
  let daysSinceLastWorkout = 999; // Default to large number if no workouts
  if (completedSessions.length > 0) {
    const lastWorkoutTimestamp = completedSessions[0].timestamp; // Already sorted by most recent
    const lastWorkoutDate = new Date(lastWorkoutTimestamp);
    lastWorkoutDate.setHours(0, 0, 0, 0);
    
    const todayDate = new Date(today);
    const diffTime = todayDate.getTime() - lastWorkoutDate.getTime();
    daysSinceLastWorkout = Math.floor(diffTime / oneDay);
  }
  
  // Calculate streak (consecutive days with workouts)
  let streak = 0;
  if (completedSessions.length > 0) {
    const uniqueDates = new Set<string>();
    completedSessions.forEach(session => {
      const date = new Date(session.timestamp);
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      uniqueDates.add(dateKey);
    });
    
    // Sort dates and check for consecutive days
    const sortedDates = Array.from(uniqueDates)
      .map(dateStr => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month, day).getTime();
      })
      .sort((a, b) => b - a);
    
    const todayTime = today.getTime();
    let currentDate = todayTime;
    let consecutiveDays = 0;
    
    for (const workoutDate of sortedDates) {
      const diffDays = Math.floor((currentDate - workoutDate) / oneDay);
      if (diffDays === consecutiveDays) {
        consecutiveDays++;
        currentDate = workoutDate;
      } else {
        break;
      }
    }
    
    streak = consecutiveDays;
  }
  
  return {
    daysSinceLastWorkout,
    hasWorkoutToday,
    hasWorkoutYesterday,
    streak
  };
}

/**
 * Get a random encouraging message based on workout status
 * @param {WorkoutStatus} status - Workout status object
 * @param {number} totalSessions - Total number of completed sessions
 * @returns {string} - Encouraging message
 */
export function getWorkoutMessage(status: WorkoutStatus, totalSessions: number): string {
  // No workouts ever
  if (totalSessions === 0) {
    const messages = [
      "Ready to start your fitness journey?",
      "Let's begin! Your first workout awaits!",
      "Time to make gains! Start now!",
      "Your fitness journey starts today!",
      "Ready to crush your first session?"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  // Worked out today
  if (status.hasWorkoutToday) {
    const messages = [
      "Wow, great job!",
      "You're on fire today!",
      "Crushing it! Keep going!",
      "Amazing work! You're unstoppable!",
      "Incredible! The gains are real!",
      "Absolutely killing it today!"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  // Worked out yesterday
  if (status.hasWorkoutYesterday && status.daysSinceLastWorkout === 1) {
    const messages = [
      "Great work yesterday! Your body is building now",
      "Rest day = growth day. Your muscles are recovering!",
      "Yesterday's gains are being locked in right now!",
      "Sleep well tonight - recovery is where the magic happens",
      "You crushed it yesterday! Today is for rebuilding stronger",
      "Rest is training too. Your body is getting stronger as you recover",
      "Yesterday's workout is paying dividends today. Rest up!",
      "Recovery mode activated! This is when you actually grow",
      "Nice session yesterday! Fuel up and rest - gains incoming!",
      "Your muscles are repairing and getting stronger right now. Rest well!"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  // 2 days since last workout - ENCOURAGE (every third day goal)
  if (status.daysSinceLastWorkout === 2) {
    const messages = [
      "Time for another session! Let's go!",
      "Ready to get back at it?",
      "Let's keep the rhythm going!",
      "Your muscles are ready - time to train!",
      "Two days rest? Perfect timing for gains!",
      "Rest day complete - let's get after it!"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  // 3+ days since last workout
  if (status.daysSinceLastWorkout >= 3) {
    const messages = [
      "It's been a while - time to get back!",
      "Your muscles are calling!",
      "Let's restart the engine!",
      "Ready to make today count?",
      "Time to get back on track!",
      "Don't let the momentum fade - let's go!"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  // Fallback (shouldn't reach here, but just in case)
  return "Ready to make today count?";
}
