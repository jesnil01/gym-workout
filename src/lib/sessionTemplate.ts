import type { SessionV2 } from '../schema/sessionSchema';

/**
 * Running and floorball are logged as sessions but are not stored in the editable session templates list.
 */
function cardioPlaceholder(id: 'running' | 'floorball'): SessionV2 {
  const name = id === 'running' ? 'Running' : 'Floorball';
  return {
    id,
    name,
    version: 2,
    blocks: [
      {
        type: 'superset',
        rest: { betweenExercisesSeconds: 0, afterRoundSeconds: 60 },
        exercises: [
          {
            id,
            name,
            sets: 1,
            target: { type: 'time', seconds: 60 },
            tempo: undefined
          }
        ]
      }
    ]
  };
}

/**
 * Resolve a session template for detail/history views.
 * Cardio templates exist only as log sessionIds, not in the sessions store.
 */
export function resolveSessionTemplate(templateId: string, sessions: SessionV2[]): SessionV2 | null {
  const fromConfig = sessions.find((s) => s.id === templateId);
  if (fromConfig) return fromConfig;
  if (templateId === 'running') return cardioPlaceholder('running');
  if (templateId === 'floorball') return cardioPlaceholder('floorball');
  return null;
}
