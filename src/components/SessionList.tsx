import { sessions } from '../config/sessions';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ThemeToggle } from './theme-toggle';

interface SessionListProps {
  onSelectSession: (sessionId: string) => void;
}

export function SessionList({ onSelectSession }: SessionListProps) {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        <div className="flex justify-end mt-4 mb-4">
          <ThemeToggle />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-8 text-center mt-4">
          Select Workout Session
        </h1>
        
        <div className="space-y-4">
          {sessions.map((session) => (
            <Card key={session.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <Button
                variant="ghost"
                className="w-full h-auto p-0"
                onClick={() => onSelectSession(session.id)}
              >
                <CardHeader>
                  <CardTitle className="text-xl">{session.name}</CardTitle>
                  <CardDescription>
                    {session.supersets.length} superset{session.supersets.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
