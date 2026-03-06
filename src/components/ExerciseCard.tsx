import { useState, useEffect } from 'react';
import { useIndexedDB } from '../hooks/useIndexedDB';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import type { Step } from '../schema/sessionSchema';

interface ExerciseCardProps {
  step: Step;
  sessionId: string; // Passed by parent for session context
  onExerciseUpdate: (exerciseId: string, value: number | null, attempted: boolean, completed: boolean) => void;
}

function formatStepDescription(step: Step): string {
  const sets = `${step.sets} sets`;
  switch (step.target.type) {
    case 'reps':
      return `${sets} × ${step.target.reps} reps`;
    case 'range':
      return `${sets} × ${step.target.min}-${step.target.max} reps`;
    case 'time':
      return `${sets} × ${step.target.seconds}s`;
    case 'amrap':
      return `${sets} AMRAP${step.target.capReps ? ` (cap ${step.target.capReps})` : ''}`;
    default:
      return sets;
  }
}

export function ExerciseCard({ step, sessionId: _sessionId, onExerciseUpdate }: ExerciseCardProps) {
  const { getLastNEntries } = useIndexedDB();
  const isTimeBased = step.target.type === 'time';
  const [value, setValue] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [lastEntries, setLastEntries] = useState<Array<{ value: number; attempted: boolean; completed: boolean; timestamp: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load last 3 entries for this exercise
    const loadLastEntries = async () => {
      try {
        const entries = await getLastNEntries(step.id, 3);
        if (entries.length > 0) {
          setLastEntries(entries.map(e => ({
            value: e.value,
            attempted: e.attempted ?? true, // Default to true for backward compatibility
            completed: e.completed,
            timestamp: e.timestamp
          })));
          // Pre-fill value with last used value
          setValue(entries[0].value.toString());
        }
      } catch (err) {
        console.error(`Failed to load last entries for ${step.id}:`, err);
      } finally {
        setLoading(false);
      }
    };

    loadLastEntries();
  }, [step.id, getLastNEntries]);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    // Update parent state (not DB)
    const parsedValue = isTimeBased
      ? (newValue && !isNaN(parseInt(newValue)) && parseInt(newValue) > 0 ? parseInt(newValue) : null)
      : (newValue && !isNaN(parseFloat(newValue)) && parseFloat(newValue) > 0 ? parseFloat(newValue) : null);

    // Don't auto-set attempted - user must check the checkbox manually
    onExerciseUpdate(step.id, parsedValue, attempted, completed);
  };

  const handleAttemptedChange = (checked: boolean) => {
    setAttempted(checked);

    const parsedValue = isTimeBased
      ? (value && !isNaN(parseInt(value)) && parseInt(value) > 0 ? parseInt(value) : null)
      : (value && !isNaN(parseFloat(value)) && parseFloat(value) > 0 ? parseFloat(value) : null);

    onExerciseUpdate(step.id, parsedValue, checked, completed);
  };

  const handleCompletedChange = (checked: boolean) => {
    setCompleted(checked);

    const parsedValue = isTimeBased
      ? (value && !isNaN(parseInt(value)) && parseInt(value) > 0 ? parseInt(value) : null)
      : (value && !isNaN(parseFloat(value)) && parseFloat(value) > 0 ? parseFloat(value) : null);

    onExerciseUpdate(step.id, parsedValue, attempted, checked);
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

  // Determine card styling based on attempted/completed state
  const cardOpacity = attempted && !completed ? 'opacity-75' : '';
  const cardBorder = completed ? 'border-green-500' : attempted ? 'border-yellow-500' : '';

  return (
    <Card className={`mb-3 ${cardOpacity} ${cardBorder} ${cardBorder ? 'border-2' : ''}`}>
      <CardHeader>
        <CardTitle className="text-lg">{step.name}</CardTitle>
        <CardDescription>
          {formatStepDescription(step)}
        </CardDescription>
        {lastEntries.length > 0 && (
          <CardDescription className="text-xs mt-1 space-y-1">
            {lastEntries.map((entry, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <span>{entry.completed ? '✅' : entry.attempted ? '⚠️' : '❌'}</span>
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
          <Label htmlFor={`value-${step.id}`}>
            {isTimeBased ? 'Time (seconds)' : 'Weight (kg)'}
          </Label>
          <Input
            id={`value-${step.id}`}
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

        <div className="flex flex-col gap-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`attempted-${step.id}`}
              checked={attempted}
              onCheckedChange={handleAttemptedChange}
            />
            <Label
              htmlFor={`attempted-${step.id}`}
              className="text-sm font-medium cursor-pointer"
            >
              Attempted
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`completed-${step.id}`}
              checked={completed}
              onCheckedChange={handleCompletedChange}
            />
            <Label
              htmlFor={`completed-${step.id}`}
              className="text-sm font-medium cursor-pointer"
            >
              Completed all reps
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
