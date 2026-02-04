import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useIndexedDB } from '../hooks/useIndexedDB';
import { getWorkoutCountInDays, formatWeightProgression } from '../lib/workoutStats';
import { getMockWorkoutLogs, getMockWorkoutCount, getMockWeightProgressions } from '../lib/mockData';
import { sessions } from '../config/sessions';
import { ArrowUp, ArrowDown, Minus, Sparkles } from 'lucide-react';

interface DashboardProps {
  onSelectSession?: (sessionId: string) => void;
}

export function Dashboard({ onSelectSession }: DashboardProps) {
  const { dbReady, getAllLogs } = useIndexedDB();
  const [workoutCount, setWorkoutCount] = useState<number | null>(null);
  const [progressions, setProgressions] = useState<Map<string, {current: number; previous: number | null; exerciseName: string; timestamp?: number}>>(new Map());
  const [loading, setLoading] = useState(true);
  
  const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true';

  useEffect(() => {
    if (!dbReady && !useMockData) {
      return;
    }

    const loadData = async () => {
      setLoading(true);
      
      if (useMockData) {
        // Use mock data
        const mockCount = getMockWorkoutCount();
        const mockProgressions = getMockWeightProgressions();
        setWorkoutCount(mockCount);
        setProgressions(mockProgressions);
        setLoading(false);
      } else {
        // Use real data
        try {
          const allLogs = await getAllLogs();
          const count = getWorkoutCountInDays(allLogs, 7);
          setWorkoutCount(count);
          
          // Calculate weight progressions
          const progressionMap = new Map<string, {current: number; previous: number | null; exerciseName: string}>();
          
          // Get all exercises from sessions config (both weight and time)
          const exerciseMap = new Map<string, { name: string; metricType: 'weight' | 'time' }>();
          sessions.forEach(session => {
            session.supersets.forEach(superset => {
              superset.exercises.forEach(exercise => {
                const metricType = exercise.metricType || 'weight';
                if (!exerciseMap.has(exercise.id)) {
                  exerciseMap.set(exercise.id, { name: exercise.name, metricType });
                }
              });
            });
          });
          
          // For each exercise, get the two most recent completed entries
          for (const [exerciseId, { name: exerciseName, metricType }] of exerciseMap.entries()) {
            // Filter to only completed exercises, sorted by timestamp
            const completedLogs = allLogs
              .filter(log => log.exerciseId === exerciseId && log.completed === true)
              .sort((a, b) => b.timestamp - a.timestamp);
            
            if (completedLogs.length > 0) {
              const current = completedLogs[0].value;
              const previous = completedLogs.length > 1 ? completedLogs[1].value : null;
              const timestamp = completedLogs[0].timestamp; // Timestamp of the progression
              
              // Only include if there's a previous value AND current is higher than previous
              // For weight: higher weight = better
              // For time: longer time (more seconds) = better
              if (previous !== null && current > previous) {
                progressionMap.set(exerciseId, { current, previous, exerciseName, timestamp });
              }
            }
          }
          
          setProgressions(progressionMap);
        } catch (error) {
          console.error('Failed to load dashboard data:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadData();
  }, [dbReady, getAllLogs, useMockData]);

  if (loading) {
    return (
      <div className="space-y-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const progressionArray = Array.from(progressions.entries())
    .map(([exerciseId, data]) => ({ exerciseId, ...data }))
    .sort((a, b) => {
      // Sort by most recent first (by timestamp)
      const aTime = a.timestamp || 0;
      const bTime = b.timestamp || 0;
      if (bTime !== aTime) {
        return bTime - aTime;
      }
      // Fallback to alphabetical if timestamps are equal
      return a.exerciseName.localeCompare(b.exerciseName);
    })
    .slice(0, 5); // Limit to latest 5 progressions

  return (
    <div className="space-y-4 mb-6">
      {/* Workouts Last 7 Days Stat */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Workouts Last 7 Days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{workoutCount ?? 0}</div>
          <CardDescription className="mt-1">
            {workoutCount === 0 
              ? 'Start logging workouts to see your progress'
              : workoutCount === 1 
              ? 'Great start! Keep it up!'
              : 'Keep up the momentum!'}
          </CardDescription>
        </CardContent>
      </Card>

      {/* Weight Progressions */}
      {progressionArray.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Weight Progressions</CardTitle>
            <CardDescription>Completed successfully with higher weight/time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {progressionArray.map(({ exerciseId, exerciseName, current, previous }) => {
                // Determine if this is a time-based exercise
                let isTime = false;
                for (const session of sessions) {
                  for (const superset of session.supersets) {
                    const exercise = superset.exercises.find(e => e.id === exerciseId);
                    if (exercise && exercise.metricType === 'time') {
                      isTime = true;
                      break;
                    }
                  }
                  if (isTime) break;
                }
                
                const unit = isTime ? 's' : ' kg';
                const { display, trend } = formatWeightProgression(current, previous, unit);
                return (
                  <div key={exerciseId} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{exerciseName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{display}</div>
                    </div>
                    <div className="ml-4">
                      {trend === 'up' && <ArrowUp className="h-4 w-4 text-green-600" />}
                      {trend === 'down' && <ArrowDown className="h-4 w-4 text-red-600" />}
                      {trend === 'same' && <Minus className="h-4 w-4 text-muted-foreground" />}
                      {trend === 'new' && <Sparkles className="h-4 w-4 text-blue-600" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Weight Progressions</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Complete exercises successfully with higher weight/time to see progressions here
            </CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
