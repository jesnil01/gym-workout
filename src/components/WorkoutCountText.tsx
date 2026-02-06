import { useState, useEffect } from 'react';
import { useIndexedDB } from '../hooks/useIndexedDB';
import { getWorkoutCountInDays } from '../lib/workoutStats';
import { getMockWorkoutCount } from '../lib/mockData';

export function WorkoutCountText() {
  const { dbReady, getAllLogs } = useIndexedDB();
  const [workoutCount, setWorkoutCount] = useState<number | null>(null);
  
  const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true';

  useEffect(() => {
    if (!dbReady && !useMockData) {
      return;
    }

    const loadCount = async () => {
      try {
        let count: number;
        
        if (useMockData) {
          count = getMockWorkoutCount();
        } else {
          const allLogs = await getAllLogs();
          count = getWorkoutCountInDays(allLogs, 7);
        }
        
        setWorkoutCount(count);
      } catch (error) {
        console.error('Failed to load workout count:', error);
        setWorkoutCount(0);
      }
    };

    loadCount();
  }, [dbReady, getAllLogs, useMockData]);

  if (workoutCount === null) {
    return null;
  }

  return (
    <p className="text-center text-sm md:text-base text-muted-foreground mb-6">
      You've worked out {workoutCount} {workoutCount === 1 ? 'time' : 'times'} in the last 7 days
    </p>
  );
}
