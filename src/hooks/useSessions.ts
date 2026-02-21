import { useState, useEffect } from 'react';
import { useIndexedDB } from './useIndexedDB';
import { getAllSessions } from '../db/indexedDB';
import type { SessionV2 } from '../schema/sessionSchema';

export function useSessions() {
  const { dbReady } = useIndexedDB();
  const [sessions, setSessions] = useState<SessionV2[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dbReady) return;
    getAllSessions()
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [dbReady]);

  return { sessions, loading };
}
