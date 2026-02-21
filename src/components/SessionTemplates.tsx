import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIndexedDB } from '../hooks/useIndexedDB';
import { useSessionsContext } from '../contexts/SessionsContext';
import { getSessionUsageCounts } from '../lib/workoutStats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ThemeToggle } from './theme-toggle';
import { ArrowLeft, Play } from 'lucide-react';
import type { SessionV2 } from '../schema/sessionSchema';

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

/**
 * Format exercise target for display
 */
function formatExerciseTarget(target: SessionV2['blocks'][0]['exercises'][0]['target']): string {
  switch (target.type) {
    case 'reps':
      return `${target.reps} reps`;
    case 'time':
      return `${target.seconds}s`;
    case 'range':
      return `${target.min}-${target.max} reps`;
    case 'amrap':
      return 'AMRAP';
    default:
      return '';
  }
}

export function SessionTemplates() {
  const navigate = useNavigate();
  const { sessions } = useSessionsContext();
  const { dbReady, getAllLogs } = useIndexedDB();
  const [usageCounts, setUsageCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  
  const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true';

  useEffect(() => {
    if (!dbReady && !useMockData) {
      return;
    }

    const loadData = async () => {
      setLoading(true);
      
      try {
        let allLogs;
        if (useMockData) {
          const { getMockWorkoutLogs } = await import('../lib/mockData');
          allLogs = getMockWorkoutLogs();
        } else {
          allLogs = await getAllLogs();
        }
        
        const counts = getSessionUsageCounts(allLogs, sessions);
        setUsageCounts(counts);
      } catch (error) {
        console.error('Failed to load usage counts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dbReady, getAllLogs, useMockData, sessions]);

  const handleStartSession = (sessionId: string) => {
    navigate(`/session/${sessionId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-20 relative">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mt-4 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="h-9 w-9"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold flex-1 text-center">Session Templates</h1>
          <ThemeToggle />
        </div>

        {/* Session Templates */}
        {sessions.length > 0 ? (
          <div className="space-y-4">
            {sessions.map((session) => {
              const colors = getSessionColor(session.id);
              const usageCount = usageCounts.get(session.id) || 0;
              const supersetCount = session.blocks.filter(b => b.type === 'superset').length;
              
              return (
                <Card key={session.id} className={`${colors.border} ${colors.bg}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl">{session.name}</CardTitle>
                        <CardDescription>
                          {supersetCount} superset{supersetCount !== 1 ? 's' : ''}
                          {usageCount > 0 && (
                            <span className="ml-2">• Used {usageCount} time{usageCount !== 1 ? 's' : ''}</span>
                          )}
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartSession(session.id)}
                        className="ml-2"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Start
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {session.blocks.map((block, blockIndex) => {
                        if (block.type !== 'superset') return null;
                        
                        return (
                          <div key={`block-${blockIndex}`} className="pb-4 border-b last:border-0 last:pb-0">
                            <div className="mb-2">
                              <div className="font-medium text-sm">Superset {blockIndex + 1}</div>
                              <div className="text-xs text-muted-foreground">
                                Rest: {block.rest.afterRoundSeconds}s between rounds
                              </div>
                            </div>
                            <div className="mt-2 space-y-2">
                              {block.exercises.map((exercise) => {
                                const targetStr = formatExerciseTarget(exercise.target);
                                return (
                                  <div
                                    key={exercise.id}
                                    className="text-sm pl-3 border-l-2 border-muted"
                                  >
                                    <div className="font-medium">{exercise.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {exercise.sets} sets × {targetStr}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Session Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                No session templates available
              </CardDescription>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
