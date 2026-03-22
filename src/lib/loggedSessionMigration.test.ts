import { describe, expect, it } from 'vitest';
import {
  backfillLoggedSessionsFromLogs,
  localCalendarParts,
  occurredAtNoonLocal,
  isSessionInstanceIdParam
} from './loggedSessionMigration';
import type { WorkoutLogEntry } from '../db/indexedDB';

function idGen(): () => string {
  let n = 0;
  return () => {
    n += 1;
    return `00000000-0000-4000-8000-${(100000000000 + n).toString(16).padStart(12, '0')}`;
  };
}

describe('backfillLoggedSessionsFromLogs', () => {
  it('returns empty for no logs', () => {
    const r = backfillLoggedSessionsFromLogs([], idGen());
    expect(r.loggedSessions).toEqual([]);
    expect(r.assignments.size).toBe(0);
  });

  it('groups two logs same template same local day', () => {
    const noon = occurredAtNoonLocal(2024, 2, 15);
    const logs: WorkoutLogEntry[] = [
      {
        id: 1,
        exerciseId: 'x1',
        sessionId: 'A',
        value: 50,
        attempted: true,
        completed: true,
        timestamp: noon,
        sessionInstanceId: undefined
      },
      {
        id: 2,
        exerciseId: 'x2',
        sessionId: 'A',
        value: 60,
        attempted: true,
        completed: true,
        timestamp: noon + 3600_000,
        sessionInstanceId: undefined
      }
    ];
    const gen = idGen();
    const r = backfillLoggedSessionsFromLogs(logs, gen);
    expect(r.loggedSessions).toHaveLength(1);
    expect(r.loggedSessions[0].templateSessionId).toBe('A');
    expect(r.loggedSessions[0].occurredAt).toBe(occurredAtNoonLocal(2024, 2, 15));
    expect(r.assignments.get(1)).toBe(r.loggedSessions[0].id);
    expect(r.assignments.get(2)).toBe(r.loggedSessions[0].id);
  });

  it('splits two logs same template different local days', () => {
    const d1 = occurredAtNoonLocal(2024, 2, 15);
    const d2 = occurredAtNoonLocal(2024, 2, 16);
    const logs: WorkoutLogEntry[] = [
      {
        id: 1,
        exerciseId: 'x1',
        sessionId: 'A',
        value: 50,
        attempted: true,
        completed: true,
        timestamp: d1,
        sessionInstanceId: undefined
      },
      {
        id: 2,
        exerciseId: 'x1',
        sessionId: 'A',
        value: 51,
        attempted: true,
        completed: true,
        timestamp: d2,
        sessionInstanceId: undefined
      }
    ];
    const r = backfillLoggedSessionsFromLogs(logs, idGen());
    expect(r.loggedSessions).toHaveLength(2);
    expect(r.assignments.get(1)).not.toBe(r.assignments.get(2));
  });

  it('separates two templates on same day', () => {
    const noon = occurredAtNoonLocal(2024, 5, 1);
    const logs: WorkoutLogEntry[] = [
      {
        id: 1,
        exerciseId: 'x1',
        sessionId: 'A',
        value: 50,
        attempted: true,
        completed: true,
        timestamp: noon,
        sessionInstanceId: undefined
      },
      {
        id: 2,
        exerciseId: 'y1',
        sessionId: 'B',
        value: 40,
        attempted: true,
        completed: true,
        timestamp: noon,
        sessionInstanceId: undefined
      }
    ];
    const r = backfillLoggedSessionsFromLogs(logs, idGen());
    expect(r.loggedSessions).toHaveLength(2);
    expect(r.assignments.get(1)).not.toBe(r.assignments.get(2));
  });

  it('skips logs that already have sessionInstanceId', () => {
    const noon = occurredAtNoonLocal(2024, 1, 1);
    const logs: WorkoutLogEntry[] = [
      {
        id: 1,
        exerciseId: 'x1',
        sessionId: 'A',
        value: 50,
        attempted: true,
        completed: true,
        timestamp: noon,
        sessionInstanceId: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee'
      },
      {
        id: 2,
        exerciseId: 'x2',
        sessionId: 'A',
        value: 51,
        attempted: true,
        completed: true,
        timestamp: noon,
        sessionInstanceId: undefined
      }
    ];
    const r = backfillLoggedSessionsFromLogs(logs, idGen());
    expect(r.loggedSessions).toHaveLength(1);
    expect(r.assignments.has(1)).toBe(false);
    expect(r.assignments.get(2)).toBeDefined();
  });

  it('occurredAt matches local noon for fixed UTC timestamp', () => {
    const ts = Date.UTC(2024, 5, 10, 8, 30, 0);
    const { y, m, d } = localCalendarParts(ts);
    const ls = backfillLoggedSessionsFromLogs(
      [
        {
          id: 1,
          exerciseId: 'x',
          sessionId: 'running',
          value: 100,
          attempted: true,
          completed: true,
          timestamp: ts,
          type: 'cardio',
          time: 100
        }
      ],
      idGen()
    );
    expect(ls.loggedSessions[0].occurredAt).toBe(occurredAtNoonLocal(y, m, d));
  });
});

describe('isSessionInstanceIdParam', () => {
  it('returns true for UUID v4', () => {
    expect(isSessionInstanceIdParam('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('returns false for legacy composite key', () => {
    expect(isSessionInstanceIdParam('2024-2-15-A')).toBe(false);
  });
});
