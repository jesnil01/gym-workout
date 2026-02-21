import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIndexedDB } from '../hooks/useIndexedDB';
import { useSessionsContext } from '../contexts/SessionsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ThemeToggle } from './theme-toggle';
import { formatTime, formatPace } from '../lib/utils';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import type { WorkoutLogEntry } from '../db/indexedDB';
import type { SessionV2 } from '../schema/sessionSchema';

/**
 * Parse session key to extract date and sessionId
 * Format: YYYY-M-D-sessionId
 */
function parseSessionKey(sessionKey: string): { year: number; month: number; day: number; sessionId: string } | null {
  const parts = sessionKey.split('-');
  if (parts.length < 4) return null;
  
  const sessionId = parts.slice(3).join('-'); // Handle sessionIds with dashes
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  
  if (isNaN(year) || isNaN(month) || isNaN(day) || !sessionId) {
    return null;
  }
  
  return { year, month, day, sessionId };
}

/**
 * Check if a timestamp falls on a specific date
 */
function isSameDate(timestamp: number, year: number, month: number, day: number): boolean {
  const date = new Date(timestamp);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month &&
    date.getDate() === day
  );
}

/**
 * Format session date for display
 */
function formatSessionDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

/**
 * Get color classes for session
 */
function getSessionColor(sessionId: string): { border: string; bg: string } {
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
}

export function SessionDetail() {
  const { sessionKey } = useParams<{ sessionKey: string }>();
  const navigate = useNavigate();
  const { sessions } = useSessionsContext();
  const { dbReady, getAllLogs } = useIndexedDB();
  const [session, setSession] = useState<SessionV2 | null>(null);
  const [sessionLogs, setSessionLogs] = useState<WorkoutLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true';

  useEffect(() => {
    if (!sessionKey) {
      setError('Invalid session key');
      setLoading(false);
      return;
    }

    const parsed = parseSessionKey(sessionKey);
    if (!parsed) {
      setError('Invalid session key format');
      setLoading(false);
      return;
    }

    // Find the session config
    const foundSession = sessions.find(s => s.id === parsed.sessionId);
    if (!foundSession) {
      setError('Session not found');
      setLoading(false);
      return;
    }

    setSession(foundSession);

    if (!dbReady && !useMockData) {
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let allLogs: WorkoutLogEntry[];
        
        if (useMockData) {
          const { getMockWorkoutLogs } = await import('../lib/mockData');
          allLogs = getMockWorkoutLogs();
        } else {
          allLogs = await getAllLogs();
        }

        // Filter logs for this specific session and date
        const filteredLogs = allLogs.filter(log => 
          log.sessionId === parsed.sessionId &&
          log.completed === true &&
          isSameDate(log.timestamp, parsed.year, parsed.month, parsed.day)
        );

        // For cardio sessions, we might have only one log entry
        // For regular sessions, we'll have multiple exercise logs
        setSessionLogs(filteredLogs);
      } catch (err) {
        console.error('Failed to load session details:', err);
        setError('Failed to load session details');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [sessionKey, sessions, dbReady, getAllLogs, useMockData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading session details...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-destructive mb-4">{error || 'Session not found'}</p>
          <Button onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const isCardio = session.id === 'running' || session.id === 'floorball';
  const cardioLog = isCardio ? sessionLogs.find(log => log.type === 'cardio') : null;
  const colors = getSessionColor(session.id);
  const sessionDate = sessionLogs.length > 0 
    ? sessionLogs[0].timestamp 
    : Date.now();

  // Create a map of exerciseId to logged value
  const exerciseLogMap = new Map<string, { value: number; completed: boolean }>();
  sessionLogs.forEach(log => {
    if (!isCardio || log.type !== 'cardio') {
      exerciseLogMap.set(log.exerciseId, {
        value: log.value,
        completed: log.completed
      });
    }
  });

  return (
    <div className="min-h-screen pb-20 relative">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background shadow-md border-b">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="h-9 w-9"
                aria-label="Back to home"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-bold text-foreground flex-1 text-center">
                Session Details
              </h1>
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pt-4">
          {/* Session Header */}
          <Card className={`mb-4 ${colors.border} ${colors.bg}`}>
            <CardHeader>
              <CardTitle className="text-xl">{session.name}</CardTitle>
              <CardDescription>{formatSessionDate(sessionDate)}</CardDescription>
            </CardHeader>
          </Card>

          {/* Cardio Session */}
          {isCardio && cardioLog && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Cardio Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {cardioLog.time !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Time</span>
                    <span className="font-medium">{formatTime(cardioLog.time)}</span>
                  </div>
                )}
                {cardioLog.pace !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Pace</span>
                    <span className="font-medium">{formatPace(cardioLog.pace)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-sm">Completed</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Regular Session - Exercises */}
          {!isCardio && (
            <div className="space-y-4">
              {session.blocks.map((block, blockIndex) => {
                if (block.type !== 'superset') return null;

                return (
                  <Card key={`block-${blockIndex}`} className="mb-4">
                    <CardHeader>
                      <CardTitle className="text-base">Superset {blockIndex + 1}</CardTitle>
                      <CardDescription>
                        Rest: {block.rest.afterRoundSeconds}s between rounds
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {block.exercises.map((exercise) => {
                          const log = exerciseLogMap.get(exercise.id);
                          const isTimeBased = exercise.target.type === 'time';
                          const unit = isTimeBased ? 's' : ' kg';
                          
                          return (
                            <div
                              key={exercise.id}
                              className="pb-4 border-b last:border-0 last:pb-0"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{exercise.name}</div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {exercise.sets} sets × {
                                      exercise.target.type === 'reps' 
                                        ? `${exercise.target.reps} reps`
                                        : exercise.target.type === 'time'
                                        ? `${exercise.target.seconds}s`
                                        : exercise.target.type === 'range'
                                        ? `${exercise.target.min}-${exercise.target.max} reps`
                                        : 'AMRAP'
                                    }
                                  </div>
                                </div>
                                {log && (
                                  <div className="flex items-center gap-2 ml-4">
                                    {log.completed ? (
                                      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                                    ) : (
                                      <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                                    )}
                                  </div>
                                )}
                              </div>
                              {log && (
                                <div className="mt-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground">Logged Value</span>
                                    <span className="font-medium text-sm">
                                      {isTimeBased ? formatTime(log.value) : `${log.value}${unit}`}
                                    </span>
                                  </div>
                                </div>
                              )}
                              {!log && (
                                <div className="mt-2 text-xs text-muted-foreground italic">
                                  No data logged for this exercise
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!isCardio && sessionLogs.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground text-center">
                  No exercise data found for this session
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
