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
  onExerciseUpdate: (exerciseId: string, value: number | null, completed: boolean) => void;
}

export function ExerciseCard({ exercise, sessionId, onExerciseUpdate }: ExerciseCardProps) {
  const { getLastEntry, getLastNEntries } = useIndexedDB();
  const isTimeBased = exercise.metricType === 'time';
  const [value, setValue] = useState('');
  const [completed, setCompleted] = useState(false);
  const [lastEntries, setLastEntries] = useState<Array<{ value: number; completed: boolean; timestamp: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load last 3 entries for this exercise
    const loadLastEntries = async () => {
      try {
        const entries = await getLastNEntries(exercise.id, 3);
        if (entries.length > 0) {
          setLastEntries(entries.map(e => ({
            value: e.value,
            completed: e.completed,
            timestamp: e.timestamp
          })));
          // Pre-fill value with last used value
          setValue(entries[0].value.toString());
        }
      } catch (err) {
        console.error(`Failed to load last entries for ${exercise.id}:`, err);
      } finally {
        setLoading(false);
      }
    };

    loadLastEntries();
  }, [exercise.id, getLastNEntries]);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    // Update parent state (not DB)
    const parsedValue = isTimeBased
      ? (newValue && !isNaN(parseInt(newValue)) && parseInt(newValue) > 0 ? parseInt(newValue) : null)
      : (newValue && !isNaN(parseFloat(newValue)) && parseFloat(newValue) > 0 ? parseFloat(newValue) : null);

    onExerciseUpdate(exercise.id, parsedValue, completed);
  };

  const handleCompletedChange = (checked: boolean) => {
    setCompleted(checked);

    // Update parent state (not DB)
    const parsedValue = isTimeBased
      ? (value && !isNaN(parseInt(value)) && parseInt(value) > 0 ? parseInt(value) : null)
      : (value && !isNaN(parseFloat(value)) && parseFloat(value) > 0 ? parseFloat(value) : null);

    onExerciseUpdate(exercise.id, parsedValue, checked);
  };

  const formatValue = (val: number): string => {
    return isTimeBased ? `${val}s` : `${val}kg`;
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
          {isTimeBased ? `${exercise.sets} sets` : `${exercise.sets} × ${exercise.reps}`}
        </CardDescription>
        {lastEntries.length > 0 && (
          <CardDescription className="text-xs mt-1 space-y-1">
            {lastEntries.map((entry, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <span>{entry.completed ? '✅' : '❌'}</span>
                <span>{formatValue(entry.value)}</span>
                <span className="text-muted-foreground">
                  {new Date(entry.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor={`value-${exercise.id}`}>
            {isTimeBased ? 'Time (seconds)' : 'Weight (kg)'}
          </Label>
          <Input
            id={`value-${exercise.id}`}
            type="number"
            inputMode={isTimeBased ? "numeric" : "decimal"}
            step={isTimeBased ? "1" : "0.5"}
            min="0"
            value={value}
            onChange={handleValueChange}
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
