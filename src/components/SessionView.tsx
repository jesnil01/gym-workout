import { useState, useEffect } from 'react';
import { SupersetGroup } from './SupersetGroup';
import { sessions } from '../config/sessions';
import { useIndexedDB } from '../hooks/useIndexedDB';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { ThemeToggle } from './theme-toggle';
import type { Session } from '../config/sessions';

interface SessionViewProps {
  sessionId: string;
  onBack: () => void;
}

interface SessionEntry {
  exerciseId: string;
  weight: number | null;
  completed: boolean;
  sessionId: string;
}

export function SessionView({ sessionId, onBack }: SessionViewProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionEntries, setSessionEntries] = useState<Record<string, SessionEntry>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { saveLog } = useIndexedDB();

  useEffect(() => {
    const foundSession = sessions.find(s => s.id === sessionId);
    setSession(foundSession);
    // Reset session entries when session changes
    setSessionEntries({});
    setSaveError(null);
  }, [sessionId]);

  const handleExerciseUpdate = (exerciseId: string, weight: number | null, completed: boolean) => {
    setSessionEntries(prev => ({
      ...prev,
      [exerciseId]: {
        exerciseId,
        weight,
        completed,
        sessionId
      }
    }));
  };

  const handleCompleteSession = async () => {
    // Filter out entries without valid weight
    const validEntries = Object.values(sessionEntries).filter(
      entry => entry.weight !== null && !isNaN(entry.weight) && entry.weight > 0
    );

    if (validEntries.length === 0) {
      setSaveError('Please log at least one exercise before completing the session.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Save all entries to IndexedDB
      for (const entry of validEntries) {
        await saveLog({
          exerciseId: entry.exerciseId,
          weight: entry.weight!,
          completed: entry.completed,
          sessionId: entry.sessionId
        });
      }

      // Success - navigate back
      onBack();
    } catch (err) {
      console.error('Failed to save session:', err);
      setSaveError('Failed to save session. Please try again.');
      setIsSaving(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground">Session not found</p>
          <Button onClick={onBack} className="mt-4">
            Back to Sessions
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background shadow-md border-b">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-lg"
              aria-label="Back to sessions"
            >
              ← Back
            </Button>
            <h1 className="text-xl font-bold text-foreground flex-1 text-center">
              {session.name}
            </h1>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4">
        {session.supersets.map((superset, index) => (
          <SupersetGroup
            key={`${sessionId}-superset-${index}`}
            superset={superset}
            sessionId={sessionId}
            onExerciseUpdate={handleExerciseUpdate}
            sectionNumber={index + 1}
          />
        ))}
      </div>

      {/* Complete Session Button - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-20 p-4">
        {saveError && (
          <Alert variant="destructive" className="mb-3">
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        )}
        <Button
          onClick={handleCompleteSession}
          disabled={isSaving}
          className="w-full py-6 text-lg"
          size="lg"
        >
          {isSaving ? 'Saving Session...' : 'Complete Session'}
        </Button>
      </div>
    </div>
  );
}
