import { ExerciseCard } from './ExerciseCard';
import { Card, CardDescription, CardHeader, CardTitle } from './ui/card';
import type { SupersetBlock } from '../schema/sessionSchema';

interface SupersetGroupProps {
  block: SupersetBlock;
  sessionId: string;
  onExerciseUpdate: (exerciseId: string, value: number | null, completed: boolean) => void;
  sectionNumber: number;
}

export function SupersetGroup({ block, sessionId, onExerciseUpdate, sectionNumber }: SupersetGroupProps) {
  return (
    <div className="mb-6">
      <Card className="mb-3 border-l-4 border-l-primary bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Superset {sectionNumber}</CardTitle>
          <CardDescription>
            Rest: {block.rest.afterRoundSeconds}s between rounds
          </CardDescription>
        </CardHeader>
      </Card>
      <div className="space-y-3">
        {block.exercises.map((step) => (
          <ExerciseCard
            key={step.id}
            step={step}
            sessionId={sessionId}
            onExerciseUpdate={onExerciseUpdate}
          />
        ))}
      </div>
    </div>
  );
}
