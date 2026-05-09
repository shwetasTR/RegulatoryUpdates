# CBP-Style Regulatory Feed Redesign

**Date:** 2026-05-09
**Status:** Draft — pending user review

## Problem

The current Regulatory Feed view (`components/views/RegulatoryFeed.tsx`) is a flat list of cards sorted by publish date. For a global trade director using this dashboard, that view answers "what's new?" but not "what should I act on, in what category, and how soon?". The CBP CSMS subscription channel solves this by sending date-stamped, topic-tagged digests with urgent items called out.

We want the same information shape — date-bucketed, topic-categorized, importance-highlighted — surfaced directly in the dashboard. No email plumbing, no subscription preferences UI, no user accounts.

## Goals

1. A trade director scanning the feed can answer "what's critical right now?" within 3 seconds of opening the page.
2. Updates are grouped by post-date in a way that matches how a CBP subscriber consumes a digest.
3. Each update is tagged with a business-meaningful topic ("Tariffs & Duties", "Sanctions") in addition to its source ("CBP CSMS", "OFAC").
4. Critical and time-urgent items are visually distinct from routine ones.
5. The director can filter live to topics that matter to them ("show me only Sanctions and Tariff updates").

## Non-goals

- Email digest sending (CBP already does this via GovDelivery — out of scope).
- User accounts, login, or persistent subscription preferences.
- New data sources beyond what's already fetched (CSMS, WH, OFAC, USTR, BIS).
- Backend persistence — feed remains stateless, fetched on demand.

## Design overview

Replace the current grid-of-cards inside `RegulatoryFeed.tsx` with:

1. A **category filter strip** at the top (multi-select chips).
2. A **pinned "Critical & Urgent" section** for items needing immediate attention.
3. **Date-bucketed sections** below that (Today / This Week / Earlier This Month / Older).
4. **Redesigned cards** with topic chip + source pill + importance markers.

A small `deriveTopic()` helper maps each `RegulatoryChange` to one of six business topics. No DB or schema changes; topic is computed in-memory at render time.

## Components

### 1. Topic derivation — `lib/topics.ts` (new)

```ts
export type Topic =
  | 'Tariffs & Duties'
  | 'Sanctions / Export Controls'
  | 'Trade Agreements'
  | 'Customs Filing'
  | 'Restricted Parties'
  | 'Country Actions'
  | 'General';

export function deriveTopic(change: RegulatoryChange): Topic;
```

Rules (first match wins):

| Signal | Topic |
|---|---|
| `source === 'OFAC'` | Sanctions / Export Controls |
| `source === 'BIS'` | Sanctions / Export Controls |
| Title/summary contains `"sdn"`, `"sanction"`, `"export control"`, `"denied party"`, `"entity list"` | Sanctions / Export Controls |
| Title/summary contains `"tariff"`, `"duty"`, `"section 232"`, `"section 301"`, `"hts"`, `"ad/cvd"`, `"antidumping"` | Tariffs & Duties |
| `ftasAffected?.length > 0` OR title contains `"usmca"`, `"fta"`, `"trade agreement"` | Trade Agreements |
| Title/summary contains `"ace"`, `"entry"`, `"filing"`, `"manifest"`, `"ftz"`, `"drawback"`, `"catair"` | Customs Filing |
| Title/summary contains `"restricted"`, `"forced labor"`, `"uflpa"` | Restricted Parties |
| `source === 'WH'` AND title contains a country name (`"china"`, `"mexico"`, `"canada"`, `"eu"`, `"uk"`, etc.) | Country Actions |
| (fallback) | General |

Topic colors (Tailwind, dark-theme-compatible to match existing palette):

| Topic | Color |
|---|---|
| Tariffs & Duties | amber |
| Sanctions / Export Controls | purple |
| Trade Agreements | sky |
| Customs Filing | emerald |
| Restricted Parties | rose |
| Country Actions | indigo |
| General | gray |

### 2. Date bucketing — inside `RegulatoryFeed.tsx`

A `bucketByDate()` function partitions the changes:

- **Critical & Urgent** — `severity === 'critical'` OR `priority === 'P0'` OR (`effectiveDate` within 7 days). Sorted by effectiveDate ascending (most-imminent first), publishDate descending as tiebreaker.
- **Today** — published today (local date).
- **This Week** — published in the last 7 days, excluding today.
- **Earlier This Month** — published 8–30 days ago.
- **Older** — published >30 days ago. Collapsed by default; an expand toggle reveals.

An item appears in **Critical & Urgent** *and* its date bucket — duplication is intentional, mirroring how digest emails surface urgent items twice (top callout + chronological list). If duplication feels noisy in practice, the date-bucket copy of a critical item gets a "(also above)" muted note instead of being hidden.

### 3. Card redesign

Each card shows:

- **Top row** — Topic chip (colored per topic family, prominent) + Source pill (smaller, neutral gray) + post date (right-aligned).
- **Title** — bold, single line preferred, two lines max.
- **Summary** — 2 lines, line-clamped.
- **Footer row** — modules (max 3 chips, "+N more" if overflow) + effective-date pill if set.
- **Importance markers**:
  - Critical: 4px red left border + small "Critical" label in the top row.
  - Time-urgent (effective ≤7 days): yellow "⚠ Effective in N days" pill near the title.
  - Both can apply simultaneously.

Removed from current card: the explicit `SEVERITY` badge (now expressed as left border for critical, omitted for non-critical), the `Priority` and `Effort` row (kept in data but not shown in feed view; available in detail view if/when added later), the separate "New"/"Recent"/"Urgent" recency badges (date bucket placement does this job).

### 4. Category filter strip

Above the feed:

```
[All] [Tariffs] [Sanctions] [FTAs] [Customs] [Restricted Parties] [Country Actions]
```

- Multi-select. `All` is the default and clears any active filters.
- State held locally in `RegulatoryFeed` via `useState<Set<Topic>>`. Not persisted.
- Filtering happens after bucketing — empty buckets are hidden so the layout stays compact.

### 5. Empty / loading states

- If no changes match an active filter: an empty state in each affected bucket reading "No [Topic] updates in this window." rather than a single page-level empty state — keeps the structure visible.
- Existing global empty state (no changes at all) is preserved.

## Data model

**No changes** to `RegulatoryChange`, `FetchUpdatesResponse`, or any persisted shape. `Topic` is purely a derived view-layer concept. If a future need arises (e.g., topic counts in metadata), we can revisit; not now.

## Files touched

| File | Change |
|---|---|
| `lib/topics.ts` | New — `Topic` type, `deriveTopic()`, color map. |
| `components/views/RegulatoryFeed.tsx` | Rewrite — bucketing, filter strip, redesigned cards. |
| `components/ui/badge.tsx` | No change expected — reuse existing variants. |
| `lib/utils.ts` | Possibly add small date helpers (e.g., `daysUntil(date)`). Reuse existing `isWithin7Days`/`isWithin30Days`. |

## Testing

- **Unit** — `deriveTopic()` against a fixture set covering each rule branch + the fallback. Important: assert priority order (OFAC → Sanctions even if title also says "tariff").
- **Visual smoke** — load the dashboard, verify: (a) a critical item appears in the pinned section AND its date bucket, (b) topic chips render correct colors, (c) clicking a filter chip narrows the feed, (d) empty filter results show per-bucket empty messaging.
- **No regression** — existing search box (in Dashboard header) still narrows results. Search applies before bucketing.

## Risks & open questions

- **Topic over-fitting**: keyword-based derivation will misclassify some updates. Mitigation: order rules by signal strength (source > FTA-array > keywords) so the most reliable signals win. Misclassification is recoverable — the source pill always shows ground truth.
- **"Critical & Urgent" duplication noise**: we'll see in practice whether the duplicated entry in a date bucket reads helpfully or noisy. Easy to flip to a "(also above)" note or hide entirely after director feedback.
- **Filter persistence**: not persisting filter selections across reloads is intentional for a stateless dashboard, but a director demoing live may want it. Add to `localStorage` later if asked — not in scope now.
