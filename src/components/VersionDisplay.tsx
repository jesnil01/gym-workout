import { useState, useRef } from 'react';
import { useIndexedDB } from '../hooks/useIndexedDB';
import { readJSONFile, downloadJSON, generateBackupFilename, setLastBackupDate } from '../lib/backupUtils';

export function VersionDisplay() {
  const commitHash = import.meta.env.VITE_COMMIT_HASH;
  const appVersion = import.meta.env.VITE_APP_VERSION;
  const isDev = import.meta.env.DEV;
  const { dbReady, importBackup, exportBackup } = useIndexedDB();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // Format commit hash to 7 characters (standard short hash length)
  const shortHash = commitHash ? commitHash.substring(0, 7) : null;

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleExportClick = async () => {
    if (!dbReady) return;

    setIsExporting(true);
    setExportMessage(null);

    try {
      // Export backup data
      const backupData = await exportBackup();
      
      // Generate filename
      const filename = generateBackupFilename();
      
      // Download JSON file
      downloadJSON(backupData, filename);
      
      // Update last backup date to prevent notification for 7 days
      setLastBackupDate();
      
      setExportMessage('Backup downloaded successfully');
      // Clear message after 3 seconds
      setTimeout(() => {
        setExportMessage(null);
      }, 3000);
    } catch (err) {
      setExportMessage(err instanceof Error ? err.message : 'Failed to export backup');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !dbReady) return;

    setIsImporting(true);
    setImportMessage(null);

    try {
      // Read and parse JSON file
      const backupData = await readJSONFile(file);
      
      // Import data
      const result = await importBackup(backupData);
      
      if (result.success) {
        const parts = [`${result.exercisesImported} exercises`, `${result.workoutLogsImported} workout logs`];
        if (result.sessionsImported != null && result.sessionsImported > 0) {
          parts.push(`${result.sessionsImported} sessions`);
        }
        setImportMessage(`Imported ${parts.join(', ')}`);
        // Refresh page after a short delay to show updated data
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setImportMessage(result.error || 'Import failed');
      }
    } catch (err) {
      setImportMessage(err instanceof Error ? err.message : 'Failed to import backup');
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // In dev mode, show version or "dev", in production only show if version info exists
  if (!isDev && !shortHash && !appVersion) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="max-w-md mx-auto px-4 py-2">
        <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportClick}
              disabled={!dbReady || isExporting}
              className="underline hover:text-foreground transition-colors pointer-events-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? 'Exporting...' : 'Export backup'}
            </button>
            <span>•</span>
            <button
              onClick={handleImportClick}
              disabled={!dbReady || isImporting}
              className="underline hover:text-foreground transition-colors pointer-events-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? 'Importing...' : 'Import backup'}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          <span>
            {appVersion && shortHash ? (
              <>v{appVersion} ({shortHash})</>
            ) : appVersion ? (
              <>v{appVersion}{isDev ? ' (dev)' : ''}</>
            ) : shortHash ? (
              <>{shortHash}</>
            ) : (
              <>dev</>
            )}
          </span>
        </div>
        {(importMessage || exportMessage) && (
          <p className={`text-xs text-center mt-1 ${
            (importMessage?.includes('Imported') || exportMessage?.includes('downloaded')) 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-destructive'
          }`}>
            {importMessage || exportMessage}
          </p>
        )}
      </div>
    </div>
  );
}
