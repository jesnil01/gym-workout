import type { BackupData } from '../db/indexedDB';

const LAST_BACKUP_KEY = 'gym-workout-last-backup';
const BACKUP_REMINDER_DAYS = 7;

/**
 * Get the timestamp of the last backup from localStorage
 * @returns {number | null} - Timestamp of last backup or null if never backed up
 */
function getLastBackupDate(): number | null {
  try {
    const stored = localStorage.getItem(LAST_BACKUP_KEY);
    if (stored) {
      const timestamp = parseInt(stored, 10);
      return isNaN(timestamp) ? null : timestamp;
    }
    return null;
  } catch (err) {
    console.error('Failed to read last backup date:', err);
    return null;
  }
}

/**
 * Save the current timestamp as the last backup date
 */
export function setLastBackupDate(): void {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, Date.now().toString());
  } catch (err) {
    console.error('Failed to save last backup date:', err);
  }
}

/**
 * Check if backup reminder should be shown (7 days since last backup)
 * @returns {boolean} - True if reminder should be shown
 */
export function shouldShowBackupReminder(): boolean {
  const lastBackup = getLastBackupDate();
  
  // Show reminder if never backed up
  if (lastBackup === null) {
    return true;
  }
  
  // Show reminder if 7 days have passed
  const sevenDaysAgo = Date.now() - (BACKUP_REMINDER_DAYS * 24 * 60 * 60 * 1000);
  return lastBackup < sevenDaysAgo;
}

/**
 * Download data as a JSON file
 * @param {object} data - Data object to download
 * @param {string} filename - Filename for the downloaded file
 */
export function downloadJSON(data: object, filename: string): void {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    
    // Cleanup
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to download JSON:', err);
    throw new Error('Failed to download backup file');
  }
}

/**
 * Generate backup filename with current date
 * @returns {string} - Filename in format gym-workout-backup-YYYY-MM-DD.json
 */
export function generateBackupFilename(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `gym-workout-backup-${year}-${month}-${day}.json`;
}

/**
 * Read and parse a JSON backup file
 * @param {File} file - File object from file input
 * @returns {Promise<BackupData>} - Parsed backup data
 */
export async function readJSONFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          reject(new Error('File is empty'));
          return;
        }
        
        const data = JSON.parse(text);
        
        // Validate backup structure
        if (!data.exercises || !Array.isArray(data.exercises)) {
          reject(new Error('Invalid backup file: missing or invalid exercises array'));
          return;
        }
        
        if (!data.workoutLogs || !Array.isArray(data.workoutLogs)) {
          reject(new Error('Invalid backup file: missing or invalid workoutLogs array'));
          return;
        }
        
        resolve(data as BackupData);
      } catch (err) {
        reject(new Error(`Failed to parse JSON: ${err instanceof Error ? err.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}
