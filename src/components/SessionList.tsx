import { useState } from 'react';
import { sessions } from '../config/sessions';
import { Button } from './ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ThemeToggle } from './theme-toggle';
import { Dashboard } from './Dashboard';
import { AnimatedTitle } from './AnimatedTitle';
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
  const { dbReady, saveBodyWeight } = useIndexedDB();

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

  return (
    <div className="min-h-screen p-4 pb-20 relative">
      <div className="max-w-md mx-auto">
        <div className="flex justify-end mt-4 mb-4">
          <ThemeToggle />
        </div>
        
        {/* Animated Title */}
        <AnimatedTitle fontFamily="'Poppins', sans-serif" color="white" />
        
        {/* Backup Notification */}
        <BackupNotification />
        
        {/* Dashboard */}
        <Dashboard />
        
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
