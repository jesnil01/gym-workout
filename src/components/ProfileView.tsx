import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIndexedDB } from '../hooks/useIndexedDB';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { ThemeToggle } from './theme-toggle';
import { downloadJSON } from '../lib/backupUtils';
import { Download, Trash2 } from 'lucide-react';
import type { UserProfile, CoachFeedbackEntry } from '../db/indexedDB';

export function ProfileView() {
  const navigate = useNavigate();
  const [goal, setGoal] = useState<string>('');
  const [facts, setFacts] = useState<string>('');
  const [feedbackEntries, setFeedbackEntries] = useState<CoachFeedbackEntry[]>([]);
  const [newFeedback, setNewFeedback] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isAddingFeedback, setIsAddingFeedback] = useState(false);
  const [isDeletingFeedback, setIsDeletingFeedback] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const { getUserProfile, saveUserProfile, exportAICoachData, saveCoachFeedback, getAllCoachFeedback, deleteCoachFeedback, dbReady } = useIndexedDB();

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [profile, feedback] = await Promise.all([
          getUserProfile(),
          getAllCoachFeedback()
        ]);
        if (profile) {
          setGoal(profile.goal || '');
          setFacts(profile.facts || '');
        }
        setFeedbackEntries(feedback);
      } catch (err) {
        console.error('Failed to load profile:', err);
        setError('Failed to load profile. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [getUserProfile, getAllCoachFeedback]);

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

  const handleExportAICoach = async () => {
    if (!dbReady) return;

    setIsExporting(true);
    setError(null);
    setExportSuccess(false);

    try {
      const exportData = await exportAICoachData();
      
      // Generate filename with current date
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const filename = `gym-workout-ai-coach-${year}-${month}-${day}.json`;
      
      downloadJSON(exportData, filename);
      setExportSuccess(true);
      // Clear success message after 3 seconds
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to export AI coach data:', err);
      setError('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleAddFeedback = async () => {
    if (!newFeedback.trim()) return;

    setIsAddingFeedback(true);
    setError(null);

    try {
      await saveCoachFeedback(newFeedback);
      setNewFeedback('');
      // Reload feedback entries
      const feedback = await getAllCoachFeedback();
      setFeedbackEntries(feedback);
    } catch (err) {
      console.error('Failed to add feedback:', err);
      setError('Failed to add feedback. Please try again.');
    } finally {
      setIsAddingFeedback(false);
    }
  };

  const handleDeleteFeedback = async (id: number) => {
    setIsDeletingFeedback(id);
    setError(null);

    try {
      await deleteCoachFeedback(id);
      // Reload feedback entries
      const feedback = await getAllCoachFeedback();
      setFeedbackEntries(feedback);
    } catch (err) {
      console.error('Failed to delete feedback:', err);
      setError('Failed to delete feedback. Please try again.');
    } finally {
      setIsDeletingFeedback(null);
    }
  };

  const formatFeedbackDate = (timestamp: number): string => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const date = new Date(timestamp);
    const today = new Date(now);
    const yesterday = new Date(now - oneDay);
    
    // Reset time to compare dates only
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    
    if (dateOnly.getTime() === todayOnly.getTime()) {
      return 'Today';
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
      return 'Yesterday';
    } else {
      // Format as "Feb 14, 2026"
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
              onClick={() => navigate('/')}
              className="text-lg"
              aria-label="Back to home"
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

            {exportSuccess && (
              <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                <AlertDescription className="text-green-800 dark:text-green-200">
                  Export downloaded successfully!
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

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Feedback from Coach</CardTitle>
            <CardDescription>
              Store feedback from your AI coach
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="feedback-textarea">New Feedback</Label>
              <Textarea
                id="feedback-textarea"
                placeholder="Enter feedback from your AI coach..."
                value={newFeedback}
                onChange={(e) => {
                  setNewFeedback(e.target.value);
                  setError(null);
                }}
                className="min-h-[100px]"
                disabled={isAddingFeedback}
              />
            </div>

            <Button
              onClick={handleAddFeedback}
              disabled={!newFeedback.trim() || isAddingFeedback}
              className="w-full"
              size="lg"
            >
              {isAddingFeedback ? 'Adding...' : 'Add Feedback'}
            </Button>

            {feedbackEntries.length > 0 && (
              <div className="space-y-3 mt-4">
                <Label>Previous Feedback</Label>
                {feedbackEntries.map((entry) => (
                  <Card key={entry.id} className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground mb-2">
                            {formatFeedbackDate(entry.timestamp)}
                          </div>
                          <div className="text-sm whitespace-pre-wrap">
                            {entry.feedback}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => entry.id && handleDeleteFeedback(entry.id)}
                          disabled={isDeletingFeedback === entry.id}
                          className="shrink-0"
                          aria-label="Delete feedback"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Export Data</CardTitle>
            <CardDescription>
              Export your workout data for AI coach analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleExportAICoach}
              disabled={!dbReady || isExporting}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Export to AI Coach'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Downloads a JSON file with your workouts, exercises, weight logs, goals, coach feedback, and statistics
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
