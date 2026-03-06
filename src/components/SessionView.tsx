import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SupersetGroup } from './SupersetGroup';
import { useSessionsContext } from '../contexts/SessionsContext';
import { useIndexedDB } from '../hooks/useIndexedDB';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { PageHeader } from './PageHeader';
import type { SessionV2 } from '../schema/sessionSchema';

interface SessionEntry {
  exerciseId: string;
  value: number | null;
  attempted: boolean;
  completed: boolean;
  sessionId: string;
}

/**
 * Get date key for localStorage (YYYY-M-D format)
 */
function getDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function SessionView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { sessions } = useSessionsContext();
  const [session, setSession] = useState<SessionV2 | null>(null);
  const [sessionEntries, setSessionEntries] = useState<Record<string, SessionEntry>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [restoredFromStorage, setRestoredFromStorage] = useState(false);
  const { saveSessionEntries } = useIndexedDB();

  useEffect(() => {
    if (!sessionId) return;
    const foundSession = sessions.find(s => s.id === sessionId);
    setSession(foundSession ?? null);
    setSaveError(null);
    
    // Try to restore from localStorage (only if data is from today)
    const storageKey = `gym-workout-session-${sessionId}-${getDateKey()}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSessionEntries(parsed);
        setRestoredFromStorage(true);
      } else {
        // Reset session entries when session changes and no saved data
        setSessionEntries({});
        setRestoredFromStorage(false);
      }
    } catch (err) {
      console.warn('Failed to restore session state:', err);
      setSessionEntries({});
      setRestoredFromStorage(false);
    }
  }, [sessionId, sessions]);

  // Save session entries to localStorage on every update (debounced)
  useEffect(() => {
    if (!sessionId || Object.keys(sessionEntries).length === 0) return;
    
    const timeoutId = setTimeout(() => {
      const storageKey = `gym-workout-session-${sessionId}-${getDateKey()}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(sessionEntries));
      } catch (err) {
        console.warn('Failed to save session state to localStorage:', err);
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [sessionEntries, sessionId]);

  const handleExerciseUpdate = (exerciseId: string, value: number | null, attempted: boolean, completed: boolean) => {
    if (!sessionId) return;
    setSessionEntries(prev => ({
      ...prev,
      [exerciseId]: {
        exerciseId,
        value,
        attempted,
        completed,
        sessionId
      }
    }));
  };

  const handleCompleteSession = async () => {
    // Filter out entries without valid value
    const validEntries = Object.values(sessionEntries).filter(
      entry => entry.value !== null && !isNaN(entry.value) && entry.value > 0
    );

    if (validEntries.length === 0) {
      setSaveError('Please log at least one exercise before completing the session.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Save all entries atomically using the new function
      await saveSessionEntries(
        validEntries.map(entry => ({
          exerciseId: entry.exerciseId,
          value: entry.value!,
          attempted: entry.attempted,
          completed: entry.completed,
          sessionId: entry.sessionId
        }))
      );

      // Clear localStorage after successful save
      const storageKey = `gym-workout-session-${sessionId}-${getDateKey()}`;
      try {
        localStorage.removeItem(storageKey);
      } catch (err) {
        console.warn('Failed to clear localStorage:', err);
      }

      // Success - navigate back
      navigate('/');
    } catch (err) {
      console.error('Failed to save session:', err);
      setSaveError('Failed to save session. Please try again.');
      setIsSaving(false);
    }
  };

  if (!session || !sessionId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground">Session not found</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-32 mb-12 relative">
      <div className="max-w-md mx-auto">
        <PageHeader title={session.name} />

        {/* Content */}
        <div className="pt-4">
        {session.blocks.map((block, index) =>
          block.type === 'superset' ? (
            <SupersetGroup
              key={`${sessionId}-superset-${index}`}
              block={block}
              sessionId={sessionId!}
              onExerciseUpdate={handleExerciseUpdate}
              sectionNumber={index + 1}
            />
          ) : null
        )}
        </div>
      </div>

      {/* Complete Session Button - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-20 p-4">
        {restoredFromStorage && (
          <Alert className="mb-3">
            <AlertDescription>
              Your previous session data has been restored. You can continue where you left off.
            </AlertDescription>
          </Alert>
        )}
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
