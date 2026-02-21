import { createContext, useContext, type ReactNode } from 'react';
import { useSessions } from '../hooks/useSessions';
import type { SessionV2 } from '../schema/sessionSchema';

interface SessionsContextValue {
  sessions: SessionV2[];
  loading: boolean;
}

const SessionsContext = createContext<SessionsContextValue | null>(null);

export function SessionsProvider({ children }: { children: ReactNode }) {
  const { sessions, loading } = useSessions();
  return (
    <SessionsContext.Provider value={{ sessions, loading }}>
      {children}
    </SessionsContext.Provider>
  );
}

export function useSessionsContext(): SessionsContextValue {
  const context = useContext(SessionsContext);
  if (!context) {
    throw new Error('useSessionsContext must be used within a SessionsProvider');
  }
  return context;
}
