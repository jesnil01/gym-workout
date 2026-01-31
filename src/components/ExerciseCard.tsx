import { useState, useEffect } from 'react';
import { useIndexedDB } from '../hooks/useIndexedDB';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import type { Exercise } from '../config/sessions';

interface ExerciseCardProps {
  exercise: Exercise;
  sessionId: string;
  onExerciseUpdate: (exerciseId: string, weight: number | null, completed: boolean) => void;
}

export function ExerciseCard({ exercise, sessionId, onExerciseUpdate }: ExerciseCardProps) {
  const { getLastEntry } = useIndexedDB();
  const [weight, setWeight] = useState('');
  const [completed, setCompleted] = useState(false);
  const [lastWeight, setLastWeight] = useState<number | null>(null);
  const [lastCompleted, setLastCompleted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load last entry for this exercise
    const loadLastEntry = async () => {
      try {
        const lastEntry = await getLastEntry(exercise.id);
        if (lastEntry) {
          setLastWeight(lastEntry.weight);
          setLastCompleted(lastEntry.completed);
          // Pre-fill weight with last used value
          setWeight(lastEntry.weight.toString());
        }
      } catch (err) {
        console.error(`Failed to load last entry for ${exercise.id}:`, err);
      } finally {
        setLoading(false);
      }
    };

    loadLastEntry();
  }, [exercise.id, getLastEntry]);

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWeight = e.target.value;
    setWeight(newWeight);

    // Update parent state (not DB)
    onExerciseUpdate(
      exercise.id,
      newWeight && !isNaN(newWeight) && parseFloat(newWeight) > 0 ? parseFloat(newWeight) : null,
      completed
    );
  };

  const handleCompletedChange = (checked: boolean) => {
    setCompleted(checked);

    // Update parent state (not DB)
    onExerciseUpdate(
      exercise.id,
      weight && !isNaN(weight) && parseFloat(weight) > 0 ? parseFloat(weight) : null,
      checked
    );
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
          <div className="h-10 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-3">
      <CardHeader>
        <CardTitle className="text-lg">{exercise.name}</CardTitle>
        <CardDescription>
          {exercise.sets} × {exercise.reps}
        </CardDescription>
        {lastWeight !== null && (
          <CardDescription className="text-xs mt-1">
            Last: {lastWeight}kg {lastCompleted !== null && (lastCompleted ? '✓' : '✗')}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor={`weight-${exercise.id}`}>Weight (kg)</Label>
          <Input
            id={`weight-${exercise.id}`}
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0"
            value={weight}
            onChange={handleWeightChange}
            className="text-lg h-12"
            placeholder="0"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id={`completed-${exercise.id}`}
            checked={completed}
            onCheckedChange={handleCompletedChange}
          />
          <Label
            htmlFor={`completed-${exercise.id}`}
            className="text-sm font-medium cursor-pointer"
          >
            Completed successfully
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}
