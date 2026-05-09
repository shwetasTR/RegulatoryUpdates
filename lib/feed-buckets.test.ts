import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isCriticalOrUrgent, bucketByDate } from './feed-buckets';
import type { RegulatoryChange } from './types';

function makeChange(overrides: Partial<RegulatoryChange>): RegulatoryChange {
  return {
    id: 'test-1',
    source: 'CSMS',
    sourceId: 'src-1',
    title: '',
    summary: '',
    fullText: '',
    url: '',
    publishDate: '2026-05-09',
    severity: 'medium',
    productModules: [],
    actionType: 'DATA_UPDATE',
    priority: 'P2',
    effort: 'M',
    teams: [],
    timezones: [],
    ...overrides,
  };
}

describe('isCriticalOrUrgent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-09T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('flags severity=critical', () => {
    expect(isCriticalOrUrgent(makeChange({ severity: 'critical' }))).toBe(true);
  });

  it('flags priority=P0', () => {
    expect(isCriticalOrUrgent(makeChange({ priority: 'P0' }))).toBe(true);
  });

  it('flags effective date within 7 days', () => {
    expect(
      isCriticalOrUrgent(makeChange({ effectiveDate: '2026-05-12' }))
    ).toBe(true);
  });

  it('does NOT flag past effective date (negative daysUntil)', () => {
    expect(
      isCriticalOrUrgent(makeChange({ effectiveDate: '2026-05-04' }))
    ).toBe(false);
  });

  it('does NOT flag effective date 8+ days out', () => {
    expect(
      isCriticalOrUrgent(makeChange({ effectiveDate: '2026-05-20' }))
    ).toBe(false);
  });

  it('does NOT flag medium severity, P2 priority, no effective date', () => {
    expect(isCriticalOrUrgent(makeChange({}))).toBe(false);
  });
});

describe('bucketByDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-09T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('places today-published items in today bucket', () => {
    const change = makeChange({ id: 'a', publishDate: '2026-05-09' });
    const result = bucketByDate([change]);
    expect(result.today.map((c) => c.id)).toEqual(['a']);
    expect(result.thisWeek).toEqual([]);
  });

  it('places 1-7 days ago in thisWeek (excluding today)', () => {
    const a = makeChange({ id: 'a', publishDate: '2026-05-08' }); // 1 day ago
    const b = makeChange({ id: 'b', publishDate: '2026-05-02' }); // 7 days ago
    const result = bucketByDate([a, b]);
    expect(result.thisWeek.map((c) => c.id).sort()).toEqual(['a', 'b']);
    expect(result.today).toEqual([]);
  });

  it('places 8-30 days ago in earlierThisMonth', () => {
    const change = makeChange({ id: 'a', publishDate: '2026-04-20' }); // 19 days ago
    const result = bucketByDate([change]);
    expect(result.earlierThisMonth.map((c) => c.id)).toEqual(['a']);
  });

  it('places >30 days ago in older', () => {
    const change = makeChange({ id: 'a', publishDate: '2026-03-01' });
    const result = bucketByDate([change]);
    expect(result.older.map((c) => c.id)).toEqual(['a']);
  });

  it('also places critical items in criticalAndUrgent (duplicated)', () => {
    const change = makeChange({
      id: 'a',
      publishDate: '2026-05-09',
      severity: 'critical',
    });
    const result = bucketByDate([change]);
    expect(result.criticalAndUrgent.map((c) => c.id)).toEqual(['a']);
    expect(result.today.map((c) => c.id)).toEqual(['a']);
  });

  it('sorts criticalAndUrgent by effective date ascending (most imminent first)', () => {
    const a = makeChange({
      id: 'a',
      severity: 'critical',
      effectiveDate: '2026-05-15',
    });
    const b = makeChange({
      id: 'b',
      severity: 'critical',
      effectiveDate: '2026-05-11',
    });
    const c = makeChange({
      id: 'c',
      severity: 'critical',
      // no effectiveDate — should sort last
    });
    const result = bucketByDate([a, b, c]);
    expect(result.criticalAndUrgent.map((x) => x.id)).toEqual(['b', 'a', 'c']);
  });

  it('sorts non-critical buckets by publish date descending', () => {
    const older = makeChange({ id: 'older', publishDate: '2026-05-05' });
    const newer = makeChange({ id: 'newer', publishDate: '2026-05-08' });
    const result = bucketByDate([older, newer]);
    expect(result.thisWeek.map((c) => c.id)).toEqual(['newer', 'older']);
  });
});
