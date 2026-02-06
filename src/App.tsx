import { useState, useEffect } from 'react';
import { SessionList } from './components/SessionList';
import { SessionView } from './components/SessionView';
import { useIndexedDB } from './hooks/useIndexedDB';
import { sessions } from './config/sessions';
import { ThemeProvider } from './components/theme-provider';
import { VersionDisplay } from './components/VersionDisplay';
import { AnimatedBackground } from './components/AnimatedBackground';

function App() {
  const [currentView, setCurrentView] = useState<'list' | 'session'>('list');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const { dbReady, error, saveExerciseData } = useIndexedDB();

  // Initialize exercises in database on first load
  useEffect(() => {
    if (dbReady) {
      // Extract all unique exercises from sessions and save them
      const exerciseMap = new Map<string, { id: string; name: string }>();
      sessions.forEach(session => {
        session.supersets.forEach(superset => {
          superset.exercises.forEach(exercise => {
            if (!exerciseMap.has(exercise.id)) {
              exerciseMap.set(exercise.id, {
                id: exercise.id,
                name: exercise.name
              });
            }
          });
        });
      });

      // Save all exercises to database
      exerciseMap.forEach(exercise => {
        saveExerciseData(exercise).catch(err => {
          console.error(`Failed to save exercise ${exercise.id}:`, err);
        });
      });
    }
  }, [dbReady, saveExerciseData]);

  const handleSelectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setCurrentView('session');
  };

  const handleBack = () => {
    setCurrentView('list');
    setSelectedSessionId(null);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-destructive mb-4">Error: {error}</p>
          <p className="text-muted-foreground">Please refresh the page to try again.</p>
        </div>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider defaultTheme="light" storageKey="gym-workout-theme">
      <div className="relative min-h-screen">
        <AnimatedBackground />
        <div className="App min-h-screen flex flex-col relative z-10">
          <div className="flex-1">
            {currentView === 'list' ? (
              <SessionList onSelectSession={handleSelectSession} />
            ) : selectedSessionId ? (
              <SessionView sessionId={selectedSessionId} onBack={handleBack} />
            ) : null}
          </div>
          <VersionDisplay />
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
