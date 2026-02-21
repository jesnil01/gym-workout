import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useIndexedDB } from '../hooks/useIndexedDB';
import { formatWeightProgression, getCompletedSessions, type CompletedSession } from '../lib/workoutStats';
import { getMockWeightProgressions, getMockCompletedSessions, getMockBodyWeights } from '../lib/mockData';
import { sessions } from '../config/sessions';
import { ArrowUp, ArrowDown, Minus, Sparkles, Scale } from 'lucide-react';
import type { BodyWeightEntry } from '../db/indexedDB';
import { formatTime, formatPace, getMondayOfThisWeek } from '../lib/utils';

interface DashboardProps {
  refreshKey?: number;
}

export function Dashboard({ refreshKey }: DashboardProps) {
  const { dbReady, getAllLogs, getAllBodyWeights } = useIndexedDB();
  const [progressions, setProgressions] = useState<Map<string, {current: number; previous: number | null; exerciseName: string; timestamp?: number}>>(new Map());
  const [completedSessions, setCompletedSessions] = useState<CompletedSession[]>([]);
  const [bodyWeightEntries, setBodyWeightEntries] = useState<BodyWeightEntry[]>([]);
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
        const mockProgressions = getMockWeightProgressions();
        const mockSessions = getMockCompletedSessions();
        const mockBodyWeights = getMockBodyWeights();
        setProgressions(mockProgressions);
        setCompletedSessions(mockSessions);
        setBodyWeightEntries(mockBodyWeights);
        setLoading(false);
      } else {
        // Use real data
        try {
          const allLogs = await getAllLogs();
          
          // Get completed sessions
          const completedSessionsList = getCompletedSessions(allLogs);
          setCompletedSessions(completedSessionsList);
          
          // Get body weight entries
          const bodyWeights = await getAllBodyWeights();
          setBodyWeightEntries(bodyWeights);
          
          // Calculate weight progressions
          const progressionMap = new Map<string, {current: number; previous: number | null; exerciseName: string; timestamp?: number}>();
          
          // Get all exercises from sessions config (both weight and time)
          const exerciseMap = new Map<string, { name: string; metricType: 'weight' | 'time' }>();
          sessions.forEach(session => {
            session.blocks.forEach(block => {
              if (block.type === 'superset') {
                block.exercises.forEach(step => {
                  const metricType = step.target.type === 'time' ? 'time' : 'weight';
                  if (!exerciseMap.has(step.id)) {
                    exerciseMap.set(step.id, { name: step.name, metricType });
                  }
                });
              }
            });
          });
          
          // For each exercise, get the two most recent completed entries
          for (const [exerciseId, { name: exerciseName, metricType: _metricType }] of exerciseMap.entries()) {
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
  }, [dbReady, getAllLogs, getAllBodyWeights, useMockData, refreshKey]);

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

  // Helper function to get color classes for session
  const getSessionColor = (sessionId: string): { border: string; bg: string } => {
    switch (sessionId) {
      case 'A':
        return { border: 'border-l-4 border-l-blue-400', bg: 'bg-blue-50/50 dark:bg-blue-950/30' };
      case 'B':
        return { border: 'border-l-4 border-l-green-400', bg: 'bg-green-50/50 dark:bg-green-950/30' };
      case 'S':
        return { border: 'border-l-4 border-l-purple-400', bg: 'bg-purple-50/50 dark:bg-purple-950/30' };
      case 'running':
        return { border: 'border-l-4 border-l-red-400', bg: 'bg-red-50/50 dark:bg-red-950/30' };
      case 'floorball':
        return { border: 'border-l-4 border-l-orange-400', bg: 'bg-orange-50/50 dark:bg-orange-950/30' };
      default:
        return { border: 'border-l-4 border-l-gray-400', bg: 'bg-gray-50/50 dark:bg-gray-950/30' };
    }
  };

  // Week goals: count sessions from Monday this week
  const mondayThisWeek = getMondayOfThisWeek();
  const cardioThisWeek = completedSessions.filter(
    (s) => s.timestamp >= mondayThisWeek && s.type === 'cardio'
  ).length;
  const gymThisWeek = completedSessions.filter(
    (s) => s.timestamp >= mondayThisWeek && s.type !== 'cardio'
  ).length;
  const cardioProgress = Math.min(1, cardioThisWeek / 1);
  const gymProgress = Math.min(1, gymThisWeek / 2);

  // Helper function to format session date
  const formatSessionDate = (timestamp: number): string => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const date = new Date(timestamp);
    const today = new Date(now);
    const yesterday = new Date(now - oneDay);
    
    // Reset time to compare dates only
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    
    if (dateOnly.getTime() === todayOnly.getTime()) {
      return 'Today';
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
      return 'Yesterday';
    } else {
      // Format as "Feb 3" or similar
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Circular progress indicator (0–1) with count in center
  const ProgressCircle = ({
    progress,
    countLabel,
    label,
    title,
  }: {
    progress: number;
    countLabel: string;
    label: string;
    title: string;
  }) => {
    const size = 56;
    const stroke = 4;
    const r = (size - stroke) / 2;
    const circumference = 2 * Math.PI * r;
    const offset = circumference * (1 - progress);
    const cx = size / 2;
    const cy = size / 2;
    return (
      <div className="flex flex-col items-center gap-1" title={title}>
        <svg width={size} height={size} className="shrink-0 text-foreground" aria-hidden>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-muted-foreground/40"
          />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
            className="text-primary transition-[stroke-dashoffset]"
          />
          <text
            x={cx}
            y={cy}
            dominantBaseline="middle"
            textAnchor="middle"
            fill="currentColor"
            className="text-sm font-medium"
          >
            {countLabel}
          </text>
        </svg>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4 mb-6">

      {/* Session goal circles */}
      <div className="flex items-center gap-6">
        <ProgressCircle
          progress={cardioProgress}
          countLabel={`${cardioThisWeek}/1`}
          label="Cardio"
          title={`Cardio this week: ${cardioThisWeek}/1`}
        />
        <ProgressCircle
          progress={gymProgress}
          countLabel={`${gymThisWeek}/2`}
          label="Gym"
          title={`Gym this week: ${gymThisWeek}/2`}
        />
      </div>

      {/* Session Log */}
      {completedSessions.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Session Log</CardTitle>
            <CardDescription>Recent completed workouts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedSessions.slice(0, 10).map((session) => {
                const colors = getSessionColor(session.sessionId);
                const isCardio = session.type === 'cardio';
                return (
                <div 
                  key={`${session.sessionId}-${session.timestamp}`}
                  className={`flex items-center justify-between py-2.5 px-3 rounded-md border-r border-t border-b ${colors.border} ${colors.bg}`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{session.sessionName}</div>
                    {isCardio && session.time !== undefined ? (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatTime(session.time)}
                        {session.pace !== undefined && ` • Pace: ${formatPace(session.pace)}`}
                        <span className="ml-2">• {formatSessionDate(session.timestamp)}</span>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground mt-0.5">{formatSessionDate(session.timestamp)}</div>
                    )}
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
            <CardTitle className="text-lg">Session Log</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Complete workouts to see your session history here
            </CardDescription>
          </CardContent>
        </Card>
      )}

      {/* Body Weight Log */}
      {bodyWeightEntries.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Weight Log
            </CardTitle>
            <CardDescription>Recent weight entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bodyWeightEntries.slice(0, 10).map((entry) => (
                <div 
                  key={entry.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-md border-r border-t border-b border-l-4 border-l-orange-400 bg-orange-50/50 dark:bg-orange-950/30"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{entry.weight} kg</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{formatSessionDate(entry.timestamp)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Gym Progressions */}
      {progressionArray.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Gym Progressions</CardTitle>
            <CardDescription>Completed successfully with higher weight/time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {progressionArray.map(({ exerciseId, exerciseName, current, previous }) => {
                // Determine if this is a time-based exercise
                let isTime = false;
                for (const session of sessions) {
                  for (const block of session.blocks) {
                    if (block.type === 'superset') {
                      const step = block.exercises.find(e => e.id === exerciseId);
                      if (step && step.target.type === 'time') {
                        isTime = true;
                        break;
                      }
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
      ) : null}
    </div>
  );
}
