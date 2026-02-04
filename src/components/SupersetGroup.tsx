import { ExerciseCard } from './ExerciseCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import type { Superset } from '../config/sessions';

interface SupersetGroupProps {
  superset: Superset;
  sessionId: string;
  onExerciseUpdate: (exerciseId: string, value: number | null, completed: boolean) => void;
  sectionNumber: number;
}

export function SupersetGroup({ superset, sessionId, onExerciseUpdate, sectionNumber }: SupersetGroupProps) {
  return (
    <div className="mb-6">
      <Card className="mb-3 border-l-4 border-l-primary bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Superset {sectionNumber}</CardTitle>
          <CardDescription>
            Rest: {superset.rest}s between exercises
          </CardDescription>
        </CardHeader>
      </Card>
      <div className="space-y-3">
        {superset.exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            sessionId={sessionId}
            onExerciseUpdate={onExerciseUpdate}
          />
        ))}
      </div>
    </div>
  );
}
