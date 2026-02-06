import { useState, useEffect } from 'react';
import { useIndexedDB } from '../hooks/useIndexedDB';
import { shouldShowBackupReminder, setLastBackupDate, downloadJSON, generateBackupFilename } from '../lib/backupUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Download, X } from 'lucide-react';

export function BackupNotification() {
  const { dbReady, exportBackup, getAllLogs, getAllExercises } = useIndexedDB();
  const [showNotification, setShowNotification] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dbReady) {
      // Check if database has any data before showing backup reminder
      const checkDatabaseAndShowReminder = async () => {
        try {
          const [logs, exercises] = await Promise.all([
            getAllLogs(),
            getAllExercises()
          ]);
          
          // Only show backup reminder if there's data in the database
          const hasData = logs.length > 0 || exercises.length > 0;
          
          if (hasData && shouldShowBackupReminder()) {
            setShowNotification(true);
          } else {
            setShowNotification(false);
          }
        } catch (err) {
          console.error('Failed to check database:', err);
          setShowNotification(false);
        }
      };
      
      checkDatabaseAndShowReminder();
    }
  }, [dbReady, getAllLogs, getAllExercises]);

  const handleDownload = async () => {
    if (!dbReady) return;

    setIsDownloading(true);
    setError(null);

    try {
      // Export backup data
      const backupData = await exportBackup();
      
      // Generate filename
      const filename = generateBackupFilename();
      
      // Download JSON file
      downloadJSON(backupData, filename);
      
      // Update last backup date
      setLastBackupDate();
      
      // Hide notification
      setShowNotification(false);
    } catch (err) {
      console.error('Failed to download backup:', err);
      setError(err instanceof Error ? err.message : 'Failed to download backup');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDismiss = () => {
    setShowNotification(false);
  };

  if (!showNotification) {
    return null;
  }

  return (
    <Card className="mb-6 border-primary/50 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="h-5 w-5" />
              Backup Your Data
            </CardTitle>
            <CardDescription className="mt-1">
              It's been 7 days since your last backup. Download your workout data to keep it safe.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleDismiss}
            aria-label="Dismiss backup reminder"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <Button
          onClick={handleDownload}
          disabled={isDownloading || !dbReady}
          className="w-full"
          size="lg"
        >
          {isDownloading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Preparing Backup...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Download Backup
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
