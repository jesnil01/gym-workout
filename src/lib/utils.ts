import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format time in seconds to readable format
 * @param seconds - Time in seconds
 * @returns Formatted string like "1:00:00" or "45:30" or "1h 0m"
 */
export function formatTime(seconds: number): string {
  if (seconds < 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

/**
 * Format pace from decimal minutes to M:SS/km format
 * @param paceMinutes - Pace in decimal minutes per km (e.g., 5.5 for 5:30/km)
 * @returns Formatted string like "5:30/km"
 */
export function formatPace(paceMinutes: number): string {
  if (paceMinutes <= 0) return '0:00/km';
  
  const minutes = Math.floor(paceMinutes);
  const seconds = Math.round((paceMinutes - minutes) * 60);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}

/**
 * Parse pace from "M:SS" text (minutes and seconds per km) to decimal minutes per km.
 * @returns null if empty, malformed, or non-positive pace
 */
export function parsePaceMmSs(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;

  const parts = trimmed.split(':');
  if (parts.length !== 2) return null;

  const [minStr, secStr] = parts;
  if (!/^\d+$/.test(minStr) || !/^\d+$/.test(secStr)) return null;

  const minutes = parseInt(minStr, 10);
  const seconds = parseInt(secStr, 10);
  if (seconds > 59) return null;

  const paceMinutes = minutes + seconds / 60;
  if (paceMinutes <= 0) return null;

  return paceMinutes;
}

/**
 * Start of current week (Monday 00:00:00) in local time, as timestamp.
 */
export function getMondayOfThisWeek(): number {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(date);
  monday.setDate(date.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
}
