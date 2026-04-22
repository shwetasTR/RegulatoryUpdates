---
name: regintel-trade-brief
description: >
  Use this skill whenever the user wants trade regulatory intelligence, daily trade briefs, tariff
  updates, FTA status, or US trade policy changes. Triggers: "/trade-brief", "/regintel", or
  mentions of CSMS, CBP updates, presidential actions, tariff changes, Section 232/301/122,
  IEEPA refunds, CAPE portal, OFAC sanctions, USMCA review, FTA rates, HTS classification,
  trade deals, or customs updates. Also triggers on "what changed in trade", "latest tariffs",
  "what's new from CBP", "current tariff on steel/pharma", or any question about US tariff
  rates, trade agreements, or regulatory changes. Use this BEFORE answering trade policy
  questions — training data is outdated on these fast-moving topics.
---

# RegIntel — Global Trade Regulatory Intelligence Skill

## What This Skill Does

When triggered, this skill:

1. **Fetches live data** from two primary US trade regulatory sources
2. **Classifies** each item by severity, product category (HTS chapter), FTA impact, and legal authority
3. **Generates an interactive dashboard** as a React artifact showing the daily brief, weekly timeline, FTA tracker, and upcoming deadlines

## Primary Data Sources

| Source | URL | What It Contains |
|--------|-----|-----------------|
| **CBP CSMS** | `cbp.gov/trade/automated/cargo-systems-messaging-service` | System updates, tariff implementation guidance, PGA requirements, manifest rules, forced labor enforcement, refund procedures, drawback changes |
| **White House Presidential Actions** | `whitehouse.gov/presidential-actions` | Executive Orders, Proclamations creating/modifying/terminating tariff programs, trade deal announcements, Section 232/301/122 actions |

### Supplementary Sources (search when needed)

- `ofac.treasury.gov/recent-actions` — OFAC sanctions list updates, general licenses, advisories
- `ustr.gov/trade-topics/presidential-tariff-actions` — USTR Section 301 investigations, bilateral deal status
- `federalregister.gov` — Final rules, proposed rules, Federal Register notices
- `bis.gov` — BIS Entity List updates, export control changes

## Trigger Patterns

The skill activates on:

- `/trade-brief` or `/regintel` — generates full daily + weekly dashboard
- `/trade-brief daily` — today's CSMS + WH actions only
- `/trade-brief week` — full week timeline
- `/trade-brief fta` — FTA and trade deal status tracker
- `/trade-brief [product]` — e.g., `/trade-brief steel` filtered to steel/metals tariffs
- Natural language: "What are the latest trade updates?"
- Natural language: "What's the current tariff on [product]?"
- Natural language: "Any new CSMS messages?"
- Natural language: "What did the White House do on tariffs this week?"
- Natural language: "What's the status of the USMCA review?"

## Execution Steps

### Step 1: Fetch Live Data

Use `web_search` to pull the latest from both primary sources:

```
Search 1: "CBP CSMS cargo systems messaging service [current year]"
Search 2: "whitehouse.gov presidential actions [current month] [current year]"
Search 3: "OFAC recent actions [current month] [current year]"
Search 4: "USTR section 301 tariff actions [current year]"
```

Use `web_fetch` on specific URLs for full detail on critical items.

### Step 2: Classify Each Item

For every item, determine:

**Trade significance** — Is this trade-relevant or system maintenance?

**Severity**:
- `critical` — New tariff action, rate change, refund program launch, court ruling, FTA deadline
- `high` — Sanctions update, Jones Act waiver, forced labor WRO, major PGA change
- `medium` — Classification ruling, manifest update, drawback change
- `low` — Maintenance window, routine update

**Product category** by HTS chapter:
- Steel (72,73), Aluminum (76), Copper (74), Pharma (29,30), Autos (87), Electronics (84,85), Textiles (50-63), Agriculture (01-24), Energy (27), De minimis (all <$800)

**Legal authority**: Section 232, 301, 122, IEEPA, OFAC, BIS/EAR, CBP/Section 321

**FTA impact**: USMCA, US-UK EPD, US-EU Framework, US-Japan STIA, US-Korea STID, US-China Truce

### Step 3: Generate Dashboard

Build a React (.jsx) artifact with these views:

1. **Daily Brief** — Side-by-side CSMS + WH columns per day, expandable items
2. **Week View** — Chronological timeline of trade-significant events
3. **FTA & Trade Deals** — Status cards with rates, tariff stacking, deadlines, alerts
4. **Upcoming** — Calendar of key dates across all sources

Save to `/mnt/user-data/outputs/regintel-brief.jsx` and present to user.

### Step 4: Text Summary

After presenting the dashboard, give a concise 3-5 sentence summary of the most critical items requiring immediate action.

## Current Tariff Reference (verify with live search — rates change)

| Product | Authority | Rate | Notes |
|---------|-----------|------|-------|
| Steel/Al/Cu articles | Sec 232 | 50% full value | UK: 25%. Effective Apr 6, 2026 |
| Metal derivatives ≥15% | Sec 232 | 25% full value | UK: 15% |
| Patented pharma default | Sec 232 | 100% | Jul 31 (17 cos) / Sep 29 (others) |
| Pharma EU/Japan/Korea/Swiss | Sec 232 | 15% | Trade deal rate |
| Pharma UK | Sec 232 | 10% | Bilateral agreement |
| Pharma MFN pricing deal | Sec 232 | 0% | Through Jan 2029 |
| Generic pharma | Sec 232 | EXEMPT | 12-month review |
| All imports blanket | Sec 122 | +10% | 150-day limit. Stacks on top |
| Autos/parts | Sec 232 | 25% | USMCA qualifying: exempt |
| China reciprocal | Truce | 10% | + Sec 301 25-50% still applies. Expires Nov 10, 2026 |

## FTA Quick Reference

| Agreement | Base Rate | Pharma | Metals | Autos | Key Date |
|-----------|-----------|--------|--------|-------|----------|
| USMCA | 0% qualifying | N/A | N/A | Exempt 25% | Review Jul 1, 2026 |
| US-UK EPD | 10% | 10% | 25%/15% | Preferential | Active |
| US-EU Framework | 15% | 15% | 50% no reduction | Preferential | Parliament vote on hold |
| US-Japan STIA | 15% | 15% | 50% | Preferential | Active |
| US-Korea STID | 15% | 15% | 50% | 15% vs 25% | Active |
| US-China Truce | 10% | N/A | N/A | N/A | Expires Nov 10, 2026 |

**Note**: Section 122 blanket 10% stacks ON TOP of all rates above.

## Key Upcoming Deadlines

| Date | Event |
|------|-------|
| CAPE portal | IEEPA refund claims — check if launched |
| Jul 1, 2026 | USMCA 6-year review deadline |
| ~Jul 24, 2026 | Section 122 surcharge 150-day expiry |
| Jul 31, 2026 | Sec 232 pharma — 17 named companies |
| Sep 29, 2026 | Sec 232 pharma — all companies |
| Nov 10, 2026 | US-China truce expires |

## Dashboard Design Spec

- Dark theme background (#050710)
- Monospace font for data values
- Source tags: green (CSMS), red/pink (WH), teal (FTA)
- Severity: red=critical, amber=high, blue=medium, gray=low
- Expandable rows with click-to-detail
- Day selector strip
- Side-by-side CSMS | WH columns
- FTA cards with tariff stacking math
- Upcoming calendar with countdowns
- Footer: source URLs + data timestamp
