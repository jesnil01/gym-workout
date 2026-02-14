import { useState, useEffect } from 'react';
import { useIndexedDB } from '../hooks/useIndexedDB';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { ThemeToggle } from './theme-toggle';
import type { UserProfile } from '../db/indexedDB';

interface ProfileViewProps {
  onBack: () => void;
}

export function ProfileView({ onBack }: ProfileViewProps) {
  const [goal, setGoal] = useState<string>('');
  const [facts, setFacts] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { getUserProfile, saveUserProfile } = useIndexedDB();

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const profile = await getUserProfile();
        if (profile) {
          setGoal(profile.goal || '');
          setFacts(profile.facts || '');
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
        setError('Failed to load profile. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [getUserProfile]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const profile: UserProfile = {
        id: 'user',
        goal: goal || '',
        facts: facts || ''
      };

      await saveUserProfile(profile);
      setSaveSuccess(true);
      // Clear success message after 2 seconds
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to save profile:', err);
      setError('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 mb-12">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background shadow-md border-b">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-lg"
              aria-label="Back to sessions"
            >
              ← Back
            </Button>
            <h1 className="text-xl font-bold text-foreground flex-1 text-center">
              Profile
            </h1>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4 max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Profile Configuration</CardTitle>
            <CardDescription>
              Enter your fitness goals and facts about yourself
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goal-textarea">Goal</Label>
              <Textarea
                id="goal-textarea"
                placeholder="Enter your fitness goals..."
                value={goal}
                onChange={(e) => {
                  setGoal(e.target.value);
                  setError(null);
                  setSaveSuccess(false);
                }}
                className="min-h-[120px]"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="facts-textarea">Facts About Me</Label>
              <Textarea
                id="facts-textarea"
                placeholder="Enter facts about yourself..."
                value={facts}
                onChange={(e) => {
                  setFacts(e.target.value);
                  setError(null);
                  setSaveSuccess(false);
                }}
                className="min-h-[120px]"
                disabled={isSaving}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {saveSuccess && (
              <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                <AlertDescription className="text-green-800 dark:text-green-200">
                  Profile saved successfully!
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full"
              size="lg"
            >
              {isSaving ? 'Saving...' : 'Save Profile'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
