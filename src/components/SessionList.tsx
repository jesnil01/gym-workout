import { useState } from 'react';
import { sessions } from '../config/sessions';
import { Button } from './ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ThemeToggle } from './theme-toggle';
import { Dashboard } from './Dashboard';
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

  const handleSelectSession = (sessionId: string) => {
    setDialogOpen(false);
    onSelectSession(sessionId);
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-md mx-auto">
        <div className="flex justify-end mt-4 mb-4">
          <ThemeToggle />
        </div>
        
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
      </div>
    </div>
  );
}
