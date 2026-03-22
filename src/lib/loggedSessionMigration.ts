import type { LoggedSession, WorkoutLogEntry } from '../db/indexedDB';

/**
 * Local calendar components for a timestamp (same interpretation as Date in local TZ).
 */
export function localCalendarParts(timestamp: number): { y: number; m: number; d: number } {
  const date = new Date(timestamp);
  return { y: date.getFullYear(), m: date.getMonth(), d: date.getDate() };
}

/** Canonical "session day" instant: local noon (matches SessionDetail save behavior). */
export function occurredAtNoonLocal(y: number, m: number, d: number): number {
  return new Date(y, m, d, 12, 0, 0).getTime();
}

function groupKeyFromParts(
  y: number,
  m: number,
  d: number,
  templateSessionId: string
): string {
  return `${y}-${m}-${d}-${templateSessionId}`;
}

interface BackfillLoggedSessionsResult {
  loggedSessions: LoggedSession[];
  /** Maps workout log numeric id -> sessionInstanceId */
  assignments: Map<number, string>;
}

/**
 * Pure backfill: group legacy logs (no sessionInstanceId) by template + local calendar day.
 * Logs that already have sessionInstanceId are ignored.
 */
export function backfillLoggedSessionsFromLogs(
  logs: WorkoutLogEntry[],
  generateId: () => string
): BackfillLoggedSessionsResult {
  const assignments = new Map<number, string>();
  const loggedSessions: LoggedSession[] = [];

  const toProcess = logs.filter((l) => l.sessionInstanceId == null && l.id != null);
  const groupMap = new Map<
    string,
    { y: number; m: number; d: number; templateSessionId: string; logIds: number[] }
  >();

  for (const log of toProcess) {
    const { y, m, d } = localCalendarParts(log.timestamp);
    const key = groupKeyFromParts(y, m, d, log.sessionId);
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        y,
        m,
        d,
        templateSessionId: log.sessionId,
        logIds: []
      });
    }
    groupMap.get(key)!.logIds.push(log.id!);
  }

  for (const group of groupMap.values()) {
    const id = generateId();
    const occurredAt = occurredAtNoonLocal(group.y, group.m, group.d);
    loggedSessions.push({
      id,
      templateSessionId: group.templateSessionId,
      occurredAt
    });
    for (const logId of group.logIds) {
      assignments.set(logId, id);
    }
  }

  return { loggedSessions, assignments };
}

/** Detect UUID v4-style ids used for session instance routes. */
export function isSessionInstanceIdParam(param: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    param
  );
}

export function sameLocalCalendarDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}
