import { useState } from 'react';
import { sessions } from '../config/sessions';
import { Button } from './ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ThemeToggle } from './theme-toggle';
import { Dashboard } from './Dashboard';
import { Logo } from './Logo';
import { WorkoutSubtitle } from './WorkoutSubtitle';
import { WorkoutCountText } from './WorkoutCountText';
import { BackupNotification } from './BackupNotification';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useIndexedDB } from '../hooks/useIndexedDB';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';

interface SessionListProps {
  onSelectSession: (sessionId: string) => void;
}

export function SessionList({ onSelectSession }: SessionListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [weightDialogOpen, setWeightDialogOpen] = useState(false);
  const [weightValue, setWeightValue] = useState('');
  const [isSavingWeight, setIsSavingWeight] = useState(false);
  const [weightError, setWeightError] = useState<string | null>(null);
  const [cardioDialogOpen, setCardioDialogOpen] = useState(false);
  const [cardioType, setCardioType] = useState<'running' | 'floorball'>('running');
  const [runningHours, setRunningHours] = useState('');
  const [runningMinutes, setRunningMinutes] = useState('');
  const [runningSeconds, setRunningSeconds] = useState('');
  const [runningPace, setRunningPace] = useState('');
  const [isSavingCardio, setIsSavingCardio] = useState(false);
  const [cardioError, setCardioError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { dbReady, saveBodyWeight, saveLog } = useIndexedDB();

  const handleSelectSession = (sessionId: string) => {
    setDialogOpen(false);
    onSelectSession(sessionId);
  };

  const handleWeightSubmit = async () => {
    if (!weightValue.trim()) {
      setWeightError('Please enter your weight');
      return;
    }

    const weight = parseFloat(weightValue);
    
    // Validate weight is positive
    if (isNaN(weight) || weight <= 0) {
      setWeightError('Weight must be greater than 0');
      return;
    }

    // Validate weight has maximum one decimal place
    if ((weight * 10) % 1 !== 0) {
      setWeightError('Weight must have maximum one decimal place (e.g., 75.5)');
      return;
    }

    setIsSavingWeight(true);
    setWeightError(null);

    try {
      await saveBodyWeight(weight);
      // Success - reset form and close modal
      setWeightValue('');
      setWeightDialogOpen(false);
    } catch (err) {
      setWeightError(err instanceof Error ? err.message : 'Failed to save weight');
    } finally {
      setIsSavingWeight(false);
    }
  };

  const handleCardioSubmit = async () => {
    setCardioError(null);

    if (cardioType === 'running') {
      // Validate running inputs
      const hours = parseInt(runningHours) || 0;
      const minutes = parseInt(runningMinutes) || 0;
      const seconds = parseInt(runningSeconds) || 0;
      const pace = parseFloat(runningPace);

      // Check if at least one time field is > 0
      if (hours === 0 && minutes === 0 && seconds === 0) {
        setCardioError('Please enter a time');
        return;
      }

      // Validate pace
      if (isNaN(pace) || pace <= 0) {
        setCardioError('Please enter a valid pace (minutes per km)');
        return;
      }

      const totalSeconds = hours * 3600 + minutes * 60 + seconds;

      setIsSavingCardio(true);

      try {
        await saveLog({
          exerciseId: 'running',
          sessionId: 'running',
          value: totalSeconds,
          completed: true,
          type: 'cardio',
          time: totalSeconds,
          pace: pace
        });

        // Success - reset form and close modal
        setRunningHours('');
        setRunningMinutes('');
        setRunningSeconds('');
        setRunningPace('');
        setCardioDialogOpen(false);
        setRefreshKey(prev => prev + 1);
      } catch (err) {
        setCardioError(err instanceof Error ? err.message : 'Failed to save cardio session');
      } finally {
        setIsSavingCardio(false);
      }
    } else {
      // Floorball - auto-set to 1 hour (3600 seconds)
      setIsSavingCardio(true);

      try {
        await saveLog({
          exerciseId: 'floorball',
          sessionId: 'floorball',
          value: 3600,
          completed: true,
          type: 'cardio',
          time: 3600
        });

        // Success - close modal
        setCardioDialogOpen(false);
        setRefreshKey(prev => prev + 1);
      } catch (err) {
        setCardioError(err instanceof Error ? err.message : 'Failed to save cardio session');
      } finally {
        setIsSavingCardio(false);
      }
    }
  };

  return (
    <div className="min-h-screen p-4 pb-20 relative">
      <div className="max-w-md mx-auto">
        {/* Header with Logo and Theme Toggle */}
        <div className="flex items-center justify-between mt-4 mb-4">
          <Logo fontFamily="'Poppins', sans-serif" />
          <ThemeToggle />
        </div>
        
        {/* Dynamic Workout Title */}
        <WorkoutSubtitle fontFamily="'Poppins', sans-serif" color="white" />
        
        {/* Workout Count Text */}
        <WorkoutCountText />
        
        {/* Backup Notification */}
        <BackupNotification />
        
        {/* Dashboard */}
        <Dashboard refreshKey={refreshKey} />
        
        {/* Start Workout Button */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="w-full py-6 text-lg mb-4">
              Start Workout
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Select Workout Session</DialogTitle>
              <DialogDescription>
                Choose a workout session to begin
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 mt-4">
              {sessions.map((session) => (
                <Card
                  key={session.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleSelectSession(session.id)}
                >
                  <CardHeader>
                    <CardTitle className="text-xl">{session.name}</CardTitle>
                    <CardDescription>
                      {session.supersets.length} superset{session.supersets.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Log Cardio Button */}
        <Dialog open={cardioDialogOpen} onOpenChange={(open) => {
          setCardioDialogOpen(open);
          if (!open) {
            // Reset form when dialog closes
            setCardioType('running');
            setRunningHours('');
            setRunningMinutes('');
            setRunningSeconds('');
            setRunningPace('');
            setCardioError(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full py-6 text-lg mb-4"
              disabled={!dbReady}
            >
              Log Cardio
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Log Cardio Activity</DialogTitle>
              <DialogDescription>
                Select the type of cardio activity
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* Cardio Type Selection */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={cardioType === 'running' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => {
                    setCardioType('running');
                    setCardioError(null);
                  }}
                >
                  Running
                </Button>
                <Button
                  type="button"
                  variant={cardioType === 'floorball' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => {
                    setCardioType('floorball');
                    setCardioError(null);
                  }}
                >
                  Floorball
                </Button>
              </div>

              {/* Running Form */}
              {cardioType === 'running' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="hours-input" className="text-xs text-muted-foreground">Hours</Label>
                        <Input
                          id="hours-input"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={runningHours}
                          onChange={(e) => {
                            setRunningHours(e.target.value);
                            setCardioError(null);
                          }}
                          className="h-10"
                          disabled={isSavingCardio}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="minutes-input" className="text-xs text-muted-foreground">Minutes</Label>
                        <Input
                          id="minutes-input"
                          type="number"
                          min="0"
                          max="59"
                          placeholder="0"
                          value={runningMinutes}
                          onChange={(e) => {
                            setRunningMinutes(e.target.value);
                            setCardioError(null);
                          }}
                          className="h-10"
                          disabled={isSavingCardio}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="seconds-input" className="text-xs text-muted-foreground">Seconds</Label>
                        <Input
                          id="seconds-input"
                          type="number"
                          min="0"
                          max="59"
                          placeholder="0"
                          value={runningSeconds}
                          onChange={(e) => {
                            setRunningSeconds(e.target.value);
                            setCardioError(null);
                          }}
                          className="h-10"
                          disabled={isSavingCardio}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pace-input">Pace (minutes per km)</Label>
                    <Input
                      id="pace-input"
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      min="0"
                      placeholder="5.5"
                      value={runningPace}
                      onChange={(e) => {
                        setRunningPace(e.target.value);
                        setCardioError(null);
                      }}
                      className="text-lg h-12"
                      disabled={isSavingCardio}
                    />
                    <p className="text-xs text-muted-foreground">e.g., 5.5 for 5:30/km</p>
                  </div>
                </div>
              )}

              {/* Floorball Form */}
              {cardioType === 'floorball' && (
                <div className="space-y-2">
                  <Label>Time</Label>
                  <div className="py-4 px-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">1 hour</p>
                    <p className="text-xs text-muted-foreground mt-1">Time is automatically set to 1 hour</p>
                  </div>
                </div>
              )}

              {cardioError && (
                <p className="text-sm text-destructive">{cardioError}</p>
              )}
              <Button
                onClick={handleCardioSubmit}
                disabled={isSavingCardio || !dbReady}
                className="w-full"
                size="lg"
              >
                {isSavingCardio ? 'Saving...' : 'Save Cardio'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Log Weight Button */}
        <Dialog open={weightDialogOpen} onOpenChange={setWeightDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full py-6 text-lg mb-4"
              disabled={!dbReady}
            >
              Log Weight
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Log Body Weight</DialogTitle>
              <DialogDescription>
                Enter your current weight in kg
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="weight-input">Weight (kg)</Label>
                <Input
                  id="weight-input"
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  min="0"
                  placeholder="0.0"
                  value={weightValue}
                  onChange={(e) => {
                    setWeightValue(e.target.value);
                    setWeightError(null);
                  }}
                  className="text-lg h-12"
                  disabled={isSavingWeight}
                />
              </div>
              {weightError && (
                <p className="text-sm text-destructive">{weightError}</p>
              )}
              <Button
                onClick={handleWeightSubmit}
                disabled={isSavingWeight || !dbReady}
                className="w-full"
                size="lg"
              >
                {isSavingWeight ? 'Saving...' : 'Save Weight'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
