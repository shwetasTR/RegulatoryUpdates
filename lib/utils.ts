import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function daysDiff(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function isWithin7Days(dateString: string): boolean {
  const targetDate = new Date(dateString);
  const today = new Date();
  return daysDiff(today, targetDate) <= 7;
}

export function isWithin30Days(dateString: string): boolean {
  const targetDate = new Date(dateString);
  const today = new Date();
  return daysDiff(today, targetDate) <= 30;
}

export function isWithin90Days(dateString: string): boolean {
  const targetDate = new Date(dateString);
  const today = new Date();
  return daysDiff(today, targetDate) <= 90;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function getCountdown(dateString: string): string {
  const targetDate = new Date(dateString);
  const today = new Date();
  const days = daysDiff(today, targetDate);

  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `${days} days`;
}

export function daysUntil(dateString: string): number {
  const target = new Date(dateString);
  const today = new Date();
  // Normalize both to UTC midnight to avoid DST/time-of-day drift
  const targetMidnight = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  const todayMidnight = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
}
