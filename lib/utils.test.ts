import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { daysUntil } from './utils';

describe('daysUntil', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-09T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 for today', () => {
    expect(daysUntil('2026-05-09')).toBe(0);
  });

  it('returns positive for future dates', () => {
    expect(daysUntil('2026-05-12')).toBe(3);
  });

  it('returns negative for past dates', () => {
    expect(daysUntil('2026-05-04')).toBe(-5);
  });

  it('returns 7 for one week from today', () => {
    expect(daysUntil('2026-05-16')).toBe(7);
  });
});
