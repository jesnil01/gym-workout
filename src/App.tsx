import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { SessionList } from './components/SessionList';
import { SessionTemplates } from './components/SessionTemplates';
import { SessionDetail } from './components/SessionDetail';
import { SessionView } from './components/SessionView';
import { ProfileView } from './components/ProfileView';
import { useIndexedDB } from './hooks/useIndexedDB';
import { SessionsProvider, useSessionsContext } from './contexts/SessionsContext';
import { ThemeProvider } from './components/theme-provider';
import { VersionDisplay } from './components/VersionDisplay';
import { AnimatedBackground } from './components/AnimatedBackground';

function AppContent() {
  const { sessions, loading } = useSessionsContext();
  const { saveExerciseData } = useIndexedDB();

  useEffect(() => {
    if (!loading && sessions.length > 0) {
      const exerciseMap = new Map<string, { id: string; name: string }>();
      sessions.forEach(session => {
        session.blocks.forEach(block => {
          if (block.type === 'superset') {
            block.exercises.forEach(step => {
              if (!exerciseMap.has(step.id)) {
                exerciseMap.set(step.id, { id: step.id, name: step.name });
              }
            });
          }
        });
      });
      exerciseMap.forEach(exercise => {
        saveExerciseData(exercise).catch(err => {
          console.error(`Failed to save exercise ${exercise.id}:`, err);
        });
      });
    }
  }, [loading, sessions, saveExerciseData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <Routes>
        <Route path="/" element={<SessionList />} />
        <Route path="/templates" element={<SessionTemplates />} />
        <Route path="/sessions/:sessionKey" element={<SessionDetail />} />
        <Route path="/session/:sessionId" element={<SessionView />} />
        <Route path="/profile" element={<ProfileView />} />
      </Routes>
    </div>
  );
}

function App() {
  const { dbReady, error } = useIndexedDB();

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
      <SessionsProvider>
        <div className="relative min-h-screen">
          <AnimatedBackground />
          <div className="App min-h-screen flex flex-col relative z-10">
            <AppContent />
            <VersionDisplay />
          </div>
        </div>
      </SessionsProvider>
    </ThemeProvider>
  );
}

export default App;
