# CBP-Style Regulatory Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the Regulatory Feed view to mirror the information shape of CBP CSMS subscription digests — date-bucketed sections, topic-categorized cards, and importance highlighting — without adding email or subscription plumbing.

**Architecture:** Pure view-layer redesign. Add `lib/topics.ts` (topic derivation) and `lib/feed-buckets.ts` (date/importance bucketing) as testable pure modules. Split `components/views/RegulatoryFeed.tsx` into three pieces: `RegulatoryFeedCard` (single card), `CategoryFilterStrip` (multi-select chip row), and `RegulatoryFeed` (composer). No data-model changes, no backend changes.

**Tech Stack:** Next.js 16.2.4, React 19.2.4, TypeScript 5, Tailwind CSS 4. Vitest added for unit tests on the pure-logic modules.

**Spec:** `docs/superpowers/specs/2026-05-09-cbp-style-regulatory-feed-design.md`

---

## File Structure

| Path | Status | Responsibility |
|---|---|---|
| `lib/topics.ts` | Create | `Topic` type, `TOPICS` list, `topicColor()` map, `deriveTopic(change)` |
| `lib/topics.test.ts` | Create | Unit tests for `deriveTopic` |
| `lib/feed-buckets.ts` | Create | `BucketKey` type, `isCriticalOrUrgent()`, `bucketByDate()` |
| `lib/feed-buckets.test.ts` | Create | Unit tests for bucketing |
| `lib/utils.ts` | Modify | Add `daysUntil(dateString)` helper (signed) |
| `lib/utils.test.ts` | Create | Unit tests for `daysUntil` |
| `components/views/RegulatoryFeedCard.tsx` | Create | Single update card with topic chip, source pill, importance markers |
| `components/views/CategoryFilterStrip.tsx` | Create | Multi-select topic chip row |
| `components/views/RegulatoryFeed.tsx` | Rewrite | Composes filter strip + buckets + cards |
| `vitest.config.ts` | Create | Vitest configuration (node env, no DOM) |
| `package.json` | Modify | Add `vitest` devDep + `test` script |

---

## Task 1: Set up vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install vitest**

Run: `npm install --save-dev vitest@^2.1.0`

Expected: vitest added to devDependencies. No errors.

- [ ] **Step 2: Create vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

- [ ] **Step 3: Add test script**

Modify `package.json` `scripts` block:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 4: Verify vitest runs (with no tests)**

Run: `npm test`
Expected: Vitest runs, reports "No test files found" or similar — exits with non-zero but installation works. (Some vitest versions exit 0 with a warning; either is fine.)

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest for unit tests"
```

---

## Task 2: Add `daysUntil` helper (signed days)

**Files:**
- Modify: `lib/utils.ts`
- Create: `lib/utils.test.ts`

**Why this helper:** Existing `isWithin7Days` uses `Math.abs(daysDiff)` which is symmetric — a date 5 days in the past returns `true` for `isWithin7Days`. We need to distinguish past from future for effective-date checks. `daysUntil` returns positive for future dates, negative for past, 0 for today.

- [ ] **Step 1: Write failing tests**

Create `lib/utils.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- lib/utils.test.ts`
Expected: 4 tests fail with "daysUntil is not a function" or similar.

- [ ] **Step 3: Implement `daysUntil`**

Append to `lib/utils.ts`:

```ts
export function daysUntil(dateString: string): number {
  const target = new Date(dateString);
  const today = new Date();
  // Normalize both to UTC midnight to avoid DST/time-of-day drift
  const targetMidnight = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  const todayMidnight = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/utils.test.ts`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/utils.ts lib/utils.test.ts
git commit -m "feat(utils): add daysUntil signed-days helper"
```

---

## Task 3: Create `lib/topics.ts` with `deriveTopic`

**Files:**
- Create: `lib/topics.ts`
- Create: `lib/topics.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/topics.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { deriveTopic, topicColor, TOPICS } from './topics';
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

describe('deriveTopic', () => {
  it('maps OFAC source to Sanctions / Export Controls', () => {
    expect(deriveTopic(makeChange({ source: 'OFAC', title: 'Anything' }))).toBe(
      'Sanctions / Export Controls'
    );
  });

  it('maps BIS source to Sanctions / Export Controls', () => {
    expect(deriveTopic(makeChange({ source: 'BIS', title: 'Export rule' }))).toBe(
      'Sanctions / Export Controls'
    );
  });

  it('maps OFAC even when title also contains tariff keywords', () => {
    expect(
      deriveTopic(makeChange({ source: 'OFAC', title: 'New tariff section 232 sanction' }))
    ).toBe('Sanctions / Export Controls');
  });

  it('maps SDN keyword to Sanctions / Export Controls', () => {
    expect(
      deriveTopic(makeChange({ source: 'CSMS', title: 'SDN list update', summary: '' }))
    ).toBe('Sanctions / Export Controls');
  });

  it('maps tariff keywords to Tariffs & Duties', () => {
    expect(
      deriveTopic(makeChange({ source: 'CSMS', title: 'Section 232 steel tariff change' }))
    ).toBe('Tariffs & Duties');
  });

  it('maps HTS keyword to Tariffs & Duties', () => {
    expect(
      deriveTopic(makeChange({ source: 'CSMS', title: 'HTS chapter 84 update', summary: '' }))
    ).toBe('Tariffs & Duties');
  });

  it('maps ftasAffected presence to Trade Agreements', () => {
    expect(
      deriveTopic(
        makeChange({ source: 'USTR', title: 'Quarterly review', ftasAffected: ['USMCA'] })
      )
    ).toBe('Trade Agreements');
  });

  it('maps USMCA keyword to Trade Agreements', () => {
    expect(
      deriveTopic(makeChange({ source: 'USTR', title: 'USMCA panel decision' }))
    ).toBe('Trade Agreements');
  });

  it('maps customs filing keywords to Customs Filing', () => {
    expect(
      deriveTopic(makeChange({ source: 'CSMS', title: 'ACE manifest update' }))
    ).toBe('Customs Filing');
  });

  it('maps forced labor / UFLPA to Restricted Parties', () => {
    expect(
      deriveTopic(makeChange({ source: 'CSMS', title: 'UFLPA enforcement update' }))
    ).toBe('Restricted Parties');
  });

  it('maps White House country mention to Country Actions', () => {
    expect(
      deriveTopic(makeChange({ source: 'WH', title: 'Executive order on China trade' }))
    ).toBe('Country Actions');
  });

  it('falls back to General when nothing matches', () => {
    expect(
      deriveTopic(makeChange({ source: 'CSMS', title: 'Routine bulletin', summary: 'Nothing notable' }))
    ).toBe('General');
  });

  it('is case-insensitive on keywords', () => {
    expect(
      deriveTopic(makeChange({ source: 'CSMS', title: 'TARIFF UPDATE' }))
    ).toBe('Tariffs & Duties');
  });
});

describe('topicColor', () => {
  it('returns a Tailwind class string for every TOPICS entry', () => {
    for (const topic of TOPICS) {
      const color = topicColor(topic);
      expect(color).toMatch(/bg-/);
      expect(color).toMatch(/text-/);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- lib/topics.test.ts`
Expected: All tests fail with "Cannot find module './topics'" or similar.

- [ ] **Step 3: Implement `lib/topics.ts`**

Create `lib/topics.ts`:

```ts
import type { RegulatoryChange } from './types';

export type Topic =
  | 'Tariffs & Duties'
  | 'Sanctions / Export Controls'
  | 'Trade Agreements'
  | 'Customs Filing'
  | 'Restricted Parties'
  | 'Country Actions'
  | 'General';

export const TOPICS: readonly Topic[] = [
  'Tariffs & Duties',
  'Sanctions / Export Controls',
  'Trade Agreements',
  'Customs Filing',
  'Restricted Parties',
  'Country Actions',
  'General',
] as const;

const TARIFF_KEYWORDS = [
  'tariff',
  'duty',
  'section 232',
  'section 301',
  'hts',
  'ad/cvd',
  'antidumping',
  'countervailing',
];

const SANCTIONS_KEYWORDS = [
  'sdn',
  'sanction',
  'export control',
  'denied party',
  'entity list',
];

const FTA_KEYWORDS = ['usmca', 'fta', 'trade agreement'];

const CUSTOMS_KEYWORDS = [
  'ace',
  'entry',
  'filing',
  'manifest',
  'ftz',
  'drawback',
  'catair',
];

const RESTRICTED_PARTIES_KEYWORDS = [
  'restricted',
  'forced labor',
  'uflpa',
];

const COUNTRY_KEYWORDS = [
  'china',
  'mexico',
  'canada',
  'european union',
  'eu ',
  'united kingdom',
  ' uk ',
  'japan',
  'korea',
  'russia',
  'iran',
  'india',
  'vietnam',
  'taiwan',
];

function containsAny(haystack: string, needles: string[]): boolean {
  const lower = haystack.toLowerCase();
  return needles.some((n) => lower.includes(n));
}

export function deriveTopic(change: RegulatoryChange): Topic {
  const text = `${change.title} ${change.summary}`;

  // Source-driven rules first (most reliable)
  if (change.source === 'OFAC' || change.source === 'BIS') {
    return 'Sanctions / Export Controls';
  }

  // Strong keyword rules
  if (containsAny(text, SANCTIONS_KEYWORDS)) {
    return 'Sanctions / Export Controls';
  }

  if (containsAny(text, TARIFF_KEYWORDS)) {
    return 'Tariffs & Duties';
  }

  if ((change.ftasAffected?.length ?? 0) > 0 || containsAny(text, FTA_KEYWORDS)) {
    return 'Trade Agreements';
  }

  if (containsAny(text, CUSTOMS_KEYWORDS)) {
    return 'Customs Filing';
  }

  if (containsAny(text, RESTRICTED_PARTIES_KEYWORDS)) {
    return 'Restricted Parties';
  }

  if (change.source === 'WH' && containsAny(text, COUNTRY_KEYWORDS)) {
    return 'Country Actions';
  }

  return 'General';
}

const TOPIC_COLORS: Record<Topic, string> = {
  'Tariffs & Duties': 'bg-amber-500/20 text-amber-400 border-amber-500/50',
  'Sanctions / Export Controls': 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  'Trade Agreements': 'bg-sky-500/20 text-sky-400 border-sky-500/50',
  'Customs Filing': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
  'Restricted Parties': 'bg-rose-500/20 text-rose-400 border-rose-500/50',
  'Country Actions': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50',
  General: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
};

export function topicColor(topic: Topic): string {
  return TOPIC_COLORS[topic];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/topics.test.ts`
Expected: All 14 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/topics.ts lib/topics.test.ts
git commit -m "feat(topics): derive business topic from regulatory change"
```

---

## Task 4: Create `lib/feed-buckets.ts` with importance + date bucketing

**Files:**
- Create: `lib/feed-buckets.ts`
- Create: `lib/feed-buckets.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/feed-buckets.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- lib/feed-buckets.test.ts`
Expected: All tests fail with "Cannot find module './feed-buckets'".

- [ ] **Step 3: Implement `lib/feed-buckets.ts`**

Create `lib/feed-buckets.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/feed-buckets.test.ts`
Expected: All 13 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/feed-buckets.ts lib/feed-buckets.test.ts
git commit -m "feat(feed-buckets): bucket changes by date and importance"
```

---

## Task 5: Create `RegulatoryFeedCard` component

**Files:**
- Create: `components/views/RegulatoryFeedCard.tsx`

**Note:** UI components have no automated tests in this plan (no DOM test harness configured). Visual verification happens in Task 8.

- [ ] **Step 1: Implement the card**

Create `components/views/RegulatoryFeedCard.tsx`:

```tsx
'use client';

import { RegulatoryChange } from '@/lib/types';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { formatDate, daysUntil, getCountdown } from '@/lib/utils';
import { deriveTopic, topicColor } from '@/lib/topics';

interface RegulatoryFeedCardProps {
  change: RegulatoryChange;
  /** When true, render a small "(also above)" muted note. Used to mark a card
   *  duplicated into a date bucket from the Critical & Urgent section. */
  duplicateOfPinned?: boolean;
}

const MAX_MODULES_SHOWN = 3;

export default function RegulatoryFeedCard({
  change,
  duplicateOfPinned = false,
}: RegulatoryFeedCardProps) {
  const topic = deriveTopic(change);
  const isCritical = change.severity === 'critical' || change.priority === 'P0';
  const effectiveDays = change.effectiveDate ? daysUntil(change.effectiveDate) : null;
  const isTimeUrgent = effectiveDays !== null && effectiveDays >= 0 && effectiveDays <= 7;

  const visibleModules = change.productModules.slice(0, MAX_MODULES_SHOWN);
  const overflowModules = change.productModules.length - visibleModules.length;

  return (
    <Card
      className={`p-4 hover:bg-accent/50 transition-colors ${
        isCritical ? 'border-l-4 border-l-red-500' : ''
      }`}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`${topicColor(topic)} border`}>{topic}</Badge>
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {sourceLabel(change.source)}
            </Badge>
            {isCritical && (
              <Badge className="bg-red-500/20 text-red-400 border border-red-500/50">
                Critical
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground text-right shrink-0">
            {formatDate(change.publishDate)}
            {duplicateOfPinned && (
              <div className="italic text-muted-foreground/70">(also pinned)</div>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-sm leading-tight line-clamp-2">{change.title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{change.summary}</p>
        </div>

        {isTimeUrgent && change.effectiveDate && (
          <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/50">
            ⚠ Effective {getCountdown(change.effectiveDate).toLowerCase()}
          </Badge>
        )}

        {(visibleModules.length > 0 || change.effectiveDate) && (
          <div className="flex items-center justify-between text-xs pt-2 border-t border-border gap-2">
            <div className="flex items-center gap-1 flex-wrap">
              {visibleModules.map((m) => (
                <Badge key={m} variant="secondary" className="text-xs">
                  Module {m}
                </Badge>
              ))}
              {overflowModules > 0 && (
                <span className="text-muted-foreground">+{overflowModules} more</span>
              )}
            </div>
            {change.effectiveDate && !isTimeUrgent && (
              <div className="text-muted-foreground shrink-0">
                Effective {formatDate(change.effectiveDate)}
              </div>
            )}
          </div>
        )}

        {change.url && (
          <div className="pt-1">
            <a
              href={change.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              View official document →
            </a>
          </div>
        )}
      </div>
    </Card>
  );
}

function sourceLabel(source: string): string {
  switch (source) {
    case 'CSMS':
      return 'CBP CSMS';
    case 'WH':
      return 'White House';
    case 'OFAC':
      return 'OFAC';
    case 'USTR':
      return 'USTR';
    case 'BIS':
      return 'BIS';
    default:
      return source;
  }
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: No errors related to `RegulatoryFeedCard.tsx`. (Other pre-existing errors, if any, are out of scope.)

- [ ] **Step 3: Commit**

```bash
git add components/views/RegulatoryFeedCard.tsx
git commit -m "feat(feed): add RegulatoryFeedCard with topic chip and importance markers"
```

---

## Task 6: Create `CategoryFilterStrip` component

**Files:**
- Create: `components/views/CategoryFilterStrip.tsx`

- [ ] **Step 1: Implement the filter strip**

Create `components/views/CategoryFilterStrip.tsx`:

```tsx
'use client';

import { Topic } from '@/lib/topics';

interface CategoryFilterStripProps {
  selected: Set<Topic>;
  onChange: (next: Set<Topic>) => void;
}

const FILTERABLE_TOPICS: Topic[] = [
  'Tariffs & Duties',
  'Sanctions / Export Controls',
  'Trade Agreements',
  'Customs Filing',
  'Restricted Parties',
  'Country Actions',
];

const SHORT_LABELS: Record<Topic, string> = {
  'Tariffs & Duties': 'Tariffs',
  'Sanctions / Export Controls': 'Sanctions',
  'Trade Agreements': 'FTAs',
  'Customs Filing': 'Customs',
  'Restricted Parties': 'Restricted Parties',
  'Country Actions': 'Country Actions',
  General: 'General',
};

export default function CategoryFilterStrip({ selected, onChange }: CategoryFilterStripProps) {
  const allActive = selected.size === 0;

  function toggle(topic: Topic) {
    const next = new Set(selected);
    if (next.has(topic)) {
      next.delete(topic);
    } else {
      next.add(topic);
    }
    onChange(next);
  }

  function clearAll() {
    onChange(new Set());
  }

  return (
    <div className="flex items-center gap-2 flex-wrap pb-3 mb-3 border-b border-border">
      <button
        type="button"
        onClick={clearAll}
        className={`text-xs px-3 py-1 rounded-full border transition-colors ${
          allActive
            ? 'bg-primary text-primary-foreground border-primary'
            : 'border-border text-muted-foreground hover:bg-accent'
        }`}
      >
        All
      </button>
      {FILTERABLE_TOPICS.map((topic) => {
        const active = selected.has(topic);
        return (
          <button
            key={topic}
            type="button"
            onClick={() => toggle(topic)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              active
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:bg-accent'
            }`}
          >
            {SHORT_LABELS[topic]}
          </button>
        );
      })}
    </div>
  );
}

```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add components/views/CategoryFilterStrip.tsx
git commit -m "feat(feed): add CategoryFilterStrip multi-select chip row"
```

---

## Task 7: Rewrite `RegulatoryFeed.tsx` to compose buckets + filter + cards

**Files:**
- Modify: `components/views/RegulatoryFeed.tsx` (full rewrite)

- [ ] **Step 1: Replace file contents**

Overwrite `components/views/RegulatoryFeed.tsx` with:

```tsx
'use client';

import { useMemo, useState } from 'react';
import { RegulatoryChange } from '@/lib/types';
import { bucketByDate, FeedBuckets } from '@/lib/feed-buckets';
import { deriveTopic, Topic } from '@/lib/topics';
import RegulatoryFeedCard from './RegulatoryFeedCard';
import CategoryFilterStrip from './CategoryFilterStrip';

interface RegulatoryFeedProps {
  changes: RegulatoryChange[];
}

interface BucketSection {
  key: keyof FeedBuckets;
  label: string;
  items: RegulatoryChange[];
  collapsibleByDefault?: boolean;
  pinned?: boolean;
}

export default function RegulatoryFeed({ changes }: RegulatoryFeedProps) {
  const [selectedTopics, setSelectedTopics] = useState<Set<Topic>>(new Set());
  const [olderExpanded, setOlderExpanded] = useState(false);

  const filtered = useMemo(() => {
    if (selectedTopics.size === 0) return changes;
    return changes.filter((c) => selectedTopics.has(deriveTopic(c)));
  }, [changes, selectedTopics]);

  const buckets = useMemo(() => bucketByDate(filtered), [filtered]);
  const pinnedIds = useMemo(
    () => new Set(buckets.criticalAndUrgent.map((c) => c.id)),
    [buckets.criticalAndUrgent]
  );

  if (changes.length === 0) {
    return <EmptyState message="All clear! No new regulatory updates at this time." />;
  }

  if (filtered.length === 0) {
    return (
      <div className="space-y-3">
        <CategoryFilterStrip selected={selectedTopics} onChange={setSelectedTopics} />
        <EmptyState message="No updates match your selected categories. Click 'All' to clear filters." />
      </div>
    );
  }

  const sections: BucketSection[] = [
    {
      key: 'criticalAndUrgent',
      label: 'Critical & Urgent',
      items: buckets.criticalAndUrgent,
      pinned: true,
    },
    { key: 'today', label: 'Today', items: buckets.today },
    { key: 'thisWeek', label: 'This Week', items: buckets.thisWeek },
    { key: 'earlierThisMonth', label: 'Earlier This Month', items: buckets.earlierThisMonth },
    {
      key: 'older',
      label: 'Older',
      items: buckets.older,
      collapsibleByDefault: true,
    },
  ];

  return (
    <div className="space-y-4">
      <CategoryFilterStrip selected={selectedTopics} onChange={setSelectedTopics} />

      {sections.map((section) => {
        if (section.items.length === 0) return null;

        if (section.collapsibleByDefault && !olderExpanded) {
          return (
            <div key={section.key}>
              <button
                type="button"
                onClick={() => setOlderExpanded(true)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Show {section.items.length} older update{section.items.length === 1 ? '' : 's'} ▾
              </button>
            </div>
          );
        }

        return (
          <section key={section.key} className="space-y-2">
            <h2
              className={`text-sm font-semibold ${
                section.pinned ? 'text-red-400' : 'text-muted-foreground'
              } uppercase tracking-wider`}
            >
              {section.label} {section.items.length > 0 && `(${section.items.length})`}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {section.items.map((change) => (
                <RegulatoryFeedCard
                  key={`${section.key}-${change.id}`}
                  change={change}
                  duplicateOfPinned={!section.pinned && pinnedIds.has(change.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-4">✅</div>
      <h3 className="text-lg font-semibold mb-2">No Updates</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">{message}</p>
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: No errors related to `RegulatoryFeed.tsx`.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No errors related to the new files. Pre-existing warnings elsewhere are out of scope.

- [ ] **Step 4: Run all unit tests**

Run: `npm test`
Expected: All tests in `lib/utils.test.ts`, `lib/topics.test.ts`, `lib/feed-buckets.test.ts` pass.

- [ ] **Step 5: Commit**

```bash
git add components/views/RegulatoryFeed.tsx
git commit -m "feat(feed): rewrite RegulatoryFeed with date buckets and topic filter"
```

---

## Task 8: Visual smoke test

**Files:** None modified — this is a verification step.

**Note:** Ask the user before committing the smoke-test results — we should not claim "done" until a human has eyeballed the redesigned feed.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: Next.js starts on `http://localhost:3000`.

- [ ] **Step 2: Click through the dashboard**

Open `http://localhost:3000` in a browser. On the **Regulatory Feed** tab, verify:

- [ ] (a) Category filter strip is visible above the feed with chips: All, Tariffs, Sanctions, FTAs, Customs, Restricted Parties, Country Actions.
- [ ] (b) Date sections render in order: Critical & Urgent (red label) → Today → This Week → Earlier This Month → "Show N older updates" toggle.
- [ ] (c) Each card shows a colored topic chip in the top-left and a "CBP CSMS" / "OFAC" / etc. source pill next to it.
- [ ] (d) At least one card with `severity: critical` (or `priority: P0`) shows a red left border AND appears in the Critical & Urgent section AND appears (with "(also pinned)" note) in its date bucket.
- [ ] (e) At least one card with an effective date within 7 days shows the yellow "⚠ Effective in N days" pill.
- [ ] (f) Clicking "Tariffs" chip narrows the feed to tariff-topic items only. Clicking "All" restores everything.
- [ ] (g) Multi-selecting two chips (e.g., Tariffs + Sanctions) shows items from both topics.
- [ ] (h) The expand toggle on "Older" reveals older updates when clicked.
- [ ] (i) The header search box (existing dashboard search) still narrows results before bucketing.

- [ ] **Step 3: Stop the dev server**

Stop the running `next dev` process.

- [ ] **Step 4: Report verification to the user**

Report each of the (a)–(i) checks as PASS or FAIL with a one-line note. Do NOT claim the work is complete if any check fails — instead, identify the specific component to fix and revisit the corresponding task.

- [ ] **Step 5: Final commit (only if all checks pass)**

If all checks passed and there are no further changes, no commit is needed — Task 7 was the final code commit. If a fix was made during verification, commit that fix:

```bash
git add <fixed-files>
git commit -m "fix(feed): <specific fix>"
```

---

## Verification — final state

When the plan is complete:

- `npm test` passes (all tests in `lib/utils.test.ts`, `lib/topics.test.ts`, `lib/feed-buckets.test.ts`).
- `npx tsc --noEmit` reports no new errors.
- `npm run lint` reports no new errors.
- Dev server renders the redesigned feed with all visual checks (a)–(i) passing.
- Five new files exist: `lib/topics.ts`, `lib/feed-buckets.ts`, `components/views/RegulatoryFeedCard.tsx`, `components/views/CategoryFilterStrip.tsx`, `vitest.config.ts`.
- Three files modified: `lib/utils.ts`, `package.json`, `components/views/RegulatoryFeed.tsx`.
- Three new test files: `lib/utils.test.ts`, `lib/topics.test.ts`, `lib/feed-buckets.test.ts`.
