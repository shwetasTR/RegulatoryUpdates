import type { RegulatoryChange } from './types';
import { daysUntil } from './utils';

export interface FeedBuckets {
  criticalAndUrgent: RegulatoryChange[];
  today: RegulatoryChange[];
  thisWeek: RegulatoryChange[];
  earlierThisMonth: RegulatoryChange[];
  older: RegulatoryChange[];
}

export function isCriticalOrUrgent(change: RegulatoryChange): boolean {
  if (change.severity === 'critical') return true;
  if (change.priority === 'P0') return true;
  if (change.effectiveDate) {
    const days = daysUntil(change.effectiveDate);
    if (days >= 0 && days <= 7) return true;
  }
  return false;
}

function publishDaysAgo(change: RegulatoryChange): number {
  return -daysUntil(change.publishDate);
}

function effectiveSortKey(change: RegulatoryChange): number {
  if (!change.effectiveDate) return Number.POSITIVE_INFINITY;
  return daysUntil(change.effectiveDate);
}

export function bucketByDate(changes: RegulatoryChange[]): FeedBuckets {
  const buckets: FeedBuckets = {
    criticalAndUrgent: [],
    today: [],
    thisWeek: [],
    earlierThisMonth: [],
    older: [],
  };

  for (const change of changes) {
    if (isCriticalOrUrgent(change)) {
      buckets.criticalAndUrgent.push(change);
    }

    const ago = publishDaysAgo(change);
    if (ago === 0) {
      buckets.today.push(change);
    } else if (ago >= 1 && ago <= 7) {
      buckets.thisWeek.push(change);
    } else if (ago >= 8 && ago <= 30) {
      buckets.earlierThisMonth.push(change);
    } else if (ago > 30) {
      buckets.older.push(change);
    }
    // ago < 0 (future publish dates — shouldn't happen in practice) — drop
  }

  buckets.criticalAndUrgent.sort((a, b) => effectiveSortKey(a) - effectiveSortKey(b));

  const byPublishDesc = (a: RegulatoryChange, b: RegulatoryChange) =>
    new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
  buckets.today.sort(byPublishDesc);
  buckets.thisWeek.sort(byPublishDesc);
  buckets.earlierThisMonth.sort(byPublishDesc);
  buckets.older.sort(byPublishDesc);

  return buckets;
}
