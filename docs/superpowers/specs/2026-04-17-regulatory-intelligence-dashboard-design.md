# Regulatory Intelligence Dashboard - Design Specification

**Project:** Product Impact Dashboard for Trade Regulatory Updates  
**Date:** 2026-04-17  
**Target Delivery:** Monday, 2026-04-21  
**Stakeholder:** Product Manager  

## Executive Summary

A full-stack Next.js web application that fetches live US trade regulatory updates from CBP CSMS and White House Presidential Actions, classifies them by impact, and presents 5 interactive dashboard views mapping regulatory changes to product modules, teams, and action items.

**Key Features:**
- Live data fetching using TR GCS Claude AI Platform (with fallback)
- 5 dashboard views: Product Impact Matrix, Team Action Board, Regulatory Feed, FTA Tracker, Compliance Calendar
- Maps regulatory changes to 10 product modules
- Dark professional theme
- One-click deployment to Vercel

## Goals & Success Criteria

### Goals
1. Enable product teams to quickly understand how regulatory changes affect their modules
2. Provide actionable intelligence with team assignments, priorities, and effort estimates
3. Demonstrate TR's regulatory intelligence capabilities to stakeholders

### Success Criteria
- ✅ Fetches and displays current regulatory updates from primary sources
- ✅ Correctly maps changes to affected product modules
- ✅ All 5 dashboard views functional and interactive
- ✅ Deployed and accessible via URL by Monday morning
- ✅ Professional appearance suitable for PM presentation

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js App (Vercel)                 │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Frontend (React + TypeScript)                           │
│  ├─ Dashboard container with tab navigation             │
│  ├─ 5 view components                                    │
│  ├─ Loading states & error boundaries                   │
│  └─ shadcn/ui components + Tailwind CSS                 │
│                          │                                │
│                          ↓ HTTP GET                       │
│                                                           │
│  Backend API Routes                                       │
│  ├─ /api/fetch-updates (main endpoint)                  │
│  │   ├─ TR GCS Claude auth                              │
│  │   ├─ Claude-powered data extraction                  │
│  │   ├─ Fallback: Federal Register API + scraping      │
│  │   └─ Classification & module mapping logic          │
│  └─ /api/health (health check)                          │
│                                                           │
└─────────────────────────────────────────────────────────┘
         │
         ↓ Fetches from
         
External Data Sources:
  • CBP CSMS (cbp.gov/trade/automated/cargo-systems-messaging-service)
  • White House Presidential Actions (whitehouse.gov/presidential-actions)
  • Federal Register API (fallback)
  • OFAC Recent Actions (supplementary)
```

### Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Next.js 14+ (App Router) | Unified frontend + backend, excellent Vercel integration, TypeScript support |
| **Frontend** | React 18, TypeScript | Type safety, modern React features (Suspense, Server Components) |
| **Styling** | Tailwind CSS | Rapid development, consistent design system |
| **UI Components** | shadcn/ui | Professional, accessible components (tabs, cards, badges) |
| **Data Fetching** | TR GCS Claude API | Intelligent extraction from unstructured regulatory sources |
| **Fallback** | Federal Register API + cheerio (HTML parsing) | Resilience when Claude unavailable |
| **Deployment** | Vercel | Zero-config deployment, automatic HTTPS, edge functions |

### Data Flow

1. **User loads dashboard** → React app renders with loading state
2. **Frontend calls** `GET /api/fetch-updates`
3. **Backend attempts TR Claude fetch:**
   - Authenticates with GCS AI Platform to get temporary Anthropic key
   - Calls Claude with prompt to search and extract regulatory updates
   - Claude uses WebSearch to find latest CBP CSMS and White House actions
   - Claude structures data into JSON array of `RegulatoryChange` objects
4. **If Claude fails**, backend executes fallback:
   - Calls Federal Register API for CBP documents
   - Scrapes White House Presidential Actions page
   - Applies heuristic classification rules
5. **Backend returns** structured JSON response with metadata
6. **Frontend receives data** and renders all 5 views from single dataset
7. **User switches tabs** → instant (no additional API calls)

## Data Model

### API Response Schema

```typescript
interface FetchUpdatesResponse {
  status: 'success' | 'partial' | 'error';
  dataSource: 'tr-claude' | 'fallback' | 'mixed';
  timestamp: string; // ISO 8601
  changes: RegulatoryChange[];
  metadata: {
    cbpCsmsCount: number;
    whiteHouseCount: number;
    ofacCount: number;
    criticalCount: number;
  };
}

interface RegulatoryChange {
  // Identity
  id: string; // Generated UUID
  source: 'CSMS' | 'WH' | 'OFAC' | 'USTR' | 'BIS';
  sourceId: string; // e.g., "CSMS #60987654"
  title: string;
  summary: string; // 1-2 sentence summary
  fullText: string; // Complete text for detail view
  url: string; // Link to original source
  publishDate: string; // ISO 8601
  effectiveDate?: string; // ISO 8601, if applicable
  
  // Classification
  severity: 'critical' | 'high' | 'medium' | 'low';
  productModules: number[]; // Array of module IDs (1-10)
  actionType: 'DATA_UPDATE' | 'LOGIC_CHANGE' | 'NEW_FEATURE' | 
              'CONTENT_UPDATE' | 'ALERT_RULE' | 'VALIDATION' | 'MONITORING';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  effort: 'S' | 'M' | 'L'; // Small, Medium, Large
  
  // Team Assignments
  teams: string[]; // e.g., ["Tax & Duty Engine", "Classification Engine"]
  timezones: string[]; // e.g., ["🇸🇬", "🇬🇧"]
  
  // Regulatory Context
  legalAuthority?: 'Section 232' | 'Section 301' | 'Section 122' | 
                   'IEEPA' | 'OFAC' | 'BIS/EAR' | 'CBP/Section 321';
  htsChapters?: string[]; // e.g., ["72", "73"] for steel
  ftasAffected?: string[]; // e.g., ["USMCA", "US-UK EPD"]
}
```

### Product Modules (Constants)

```typescript
export const PRODUCT_MODULES = {
  1: {
    id: 1,
    name: "Tariff & Duty Calculator",
    team: "Tax & Duty Engine",
    timezones: ["🇸🇬", "🇬🇧"],
    description: "Calculates landed cost including all duties and tariffs",
    triggers: ["tariff", "duty", "rate", "section 232", "section 301", "section 122", "HTSUS"]
  },
  2: {
    id: 2,
    name: "Classification & HTS Management",
    team: "Classification Engine",
    timezones: ["🇺🇸", "🇮🇳"],
    description: "Maps products to HTS codes, manages classification rulings",
    triggers: ["HTS", "classification", "HTSUS", "chapter 99", "ruling", "tariff schedule"]
  },
  3: {
    id: 3,
    name: "Restricted Party Screening",
    team: "Screening Engine",
    timezones: ["🇺🇸", "🇮🇪"],
    description: "Screens against OFAC SDN, Entity List, denied persons",
    triggers: ["SDN", "OFAC", "sanctions", "entity list", "screening", "denied"]
  },
  4: {
    id: 4,
    name: "Free Trade Agreement (FTA) Management",
    team: "FTA & Origin",
    timezones: ["🇺🇸", "🇳🇱"],
    description: "Manages FTA qualification, rules of origin, preferential rates",
    triggers: ["FTA", "USMCA", "preferential", "origin", "bilateral", "trade deal"]
  },
  5: {
    id: 5,
    name: "Export Controls & Licensing",
    team: "Export Controls",
    timezones: ["🇺🇸", "🇬🇧"],
    description: "Determines export license requirements, ECCN classification",
    triggers: ["export", "BIS", "entity list", "EAR", "ITAR", "license"]
  },
  6: {
    id: 6,
    name: "Customs Entry & Filing",
    team: "Entry Filing Engine",
    timezones: ["🇺🇸", "🇵🇭"],
    description: "Manages import entry filing via ACE, drawback, FTZ",
    triggers: ["ACE", "entry", "filing", "CATAIR", "drawback", "FTZ", "manifest"]
  },
  7: {
    id: 7,
    name: "Forced Labor & Supply Chain Compliance",
    team: "Supply Chain Compliance",
    timezones: ["🇺🇸", "🇭🇰"],
    description: "Screens against UFLPA entity list, manages WRO compliance",
    triggers: ["UFLPA", "forced labor", "WRO", "section 307", "Xinjiang"]
  },
  8: {
    id: 8,
    name: "Sanctions & Trade Finance",
    team: "Sanctions & Finance",
    timezones: ["🇺🇸", "🇸🇬", "🇬🇧"],
    description: "Trade finance compliance, vessel screening, sanctions monitoring",
    triggers: ["sanctions", "OFAC", "general license", "trade finance", "vessel"]
  },
  9: {
    id: 9,
    name: "Regulatory Content & Knowledge Base",
    team: "Content & Editorial",
    timezones: ["🇺🇸", "🇬🇧", "🇦🇺"],
    description: "Regulatory reference content, country guides, client alerts",
    triggers: ["*"] // All changes potentially affect content
  },
  10: {
    id: 10,
    name: "Alerts & Notification Engine",
    team: "Platform Engineering",
    timezones: ["🇺🇸", "🇮🇳"],
    description: "Routes real-time regulatory alerts to subscribers",
    triggers: ["*"] // All changes potentially trigger alerts
  }
};
```

### Classification Logic

**Severity Determination:**
```typescript
function determineSeverity(change: RawChange): Severity {
  // Critical: Immediate action required
  if (
    change.text.includes('effective immediately') ||
    change.text.match(/rate.*\d+%.*to.*\d+%/) || // Rate change
    change.text.includes('new tariff') ||
    change.text.includes('SDN list') ||
    change.effectiveDate && isWithin7Days(change.effectiveDate)
  ) {
    return 'critical';
  }
  
  // High: Action required within 30 days
  if (
    change.text.includes('effective') && isWithin30Days(change.effectiveDate) ||
    change.text.includes('new requirement') ||
    change.text.includes('FTA') ||
    change.text.includes('USMCA')
  ) {
    return 'high';
  }
  
  // Medium: Informational, may require future action
  if (
    change.text.includes('proposed rule') ||
    change.text.includes('classification ruling') ||
    change.text.includes('guidance')
  ) {
    return 'medium';
  }
  
  // Low: Maintenance, informational only
  return 'low';
}
```

**Module Mapping:**
```typescript
function mapToModules(change: RawChange): number[] {
  const modules: Set<number> = new Set();
  const lowerText = change.title.toLowerCase() + ' ' + change.summary.toLowerCase();
  
  // Check each module's trigger keywords
  for (const [moduleId, module] of Object.entries(PRODUCT_MODULES)) {
    for (const trigger of module.triggers) {
      if (trigger === '*' || lowerText.includes(trigger.toLowerCase())) {
        modules.add(parseInt(moduleId));
      }
    }
  }
  
  // Always map to Content (9) and Alerts (10) for high/critical items
  if (change.severity === 'critical' || change.severity === 'high') {
    modules.add(9);
    modules.add(10);
  }
  
  return Array.from(modules);
}
```

**Priority & Effort:**
```typescript
function determinePriority(change: RegulatoryChange): Priority {
  const daysUntilEffective = change.effectiveDate 
    ? daysDiff(new Date(), new Date(change.effectiveDate))
    : 999;
  
  if (change.severity === 'critical' || daysUntilEffective <= 7) return 'P0';
  if (daysUntilEffective <= 30) return 'P1';
  if (daysUntilEffective <= 90) return 'P2';
  return 'P3';
}

function estimateEffort(change: RegulatoryChange): Effort {
  const moduleCount = change.productModules.length;
  
  if (change.actionType === 'DATA_UPDATE') return 'S'; // 1-2 hours
  if (change.actionType === 'CONTENT_UPDATE') return 'S';
  if (change.actionType === 'NEW_FEATURE') return 'L'; // 1-2 weeks
  if (moduleCount >= 3) return 'L'; // Multi-module impact
  if (change.actionType === 'LOGIC_CHANGE') return 'M'; // 1-3 days
  return 'M';
}
```

## Component Structure

### Frontend File Organization

```
src/
├── app/
│   ├── api/
│   │   ├── fetch-updates/
│   │   │   └── route.ts              # Main data fetching endpoint
│   │   └── health/
│   │       └── route.ts              # Health check
│   ├── page.tsx                      # Main dashboard page
│   ├── layout.tsx                    # Root layout
│   └── globals.css                   # Global styles
│
├── components/
│   ├── Dashboard.tsx                 # Main container with tab navigation
│   ├── views/
│   │   ├── ProductImpactMatrix.tsx   # View 1: Changes × Modules grid
│   │   ├── TeamActionBoard.tsx       # View 2: Kanban by team
│   │   ├── RegulatoryFeed.tsx        # View 3: Chronological feed
│   │   ├── FTAImpactTracker.tsx      # View 4: FTA status cards
│   │   └── ComplianceCalendar.tsx    # View 5: Deadline timeline
│   ├── ui/                            # shadcn/ui primitives
│   │   ├── tabs.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   └── table.tsx
│   ├── LoadingState.tsx              # Skeleton loader
│   └── ErrorState.tsx                # Error display with retry
│
├── lib/
│   ├── types.ts                      # TypeScript interfaces
│   ├── constants.ts                  # PRODUCT_MODULES, teams, etc.
│   ├── classification.ts             # Classification logic functions
│   ├── tr-claude-auth.ts             # TR GCS authentication
│   ├── fetchers/
│   │   ├── claude-fetcher.ts         # Claude-powered extraction
│   │   └── fallback-fetcher.ts       # Direct API/scraping
│   └── utils.ts                      # Helper functions
│
└── styles/
    └── globals.css                   # Tailwind + custom CSS variables
```

### Key Components

#### Dashboard.tsx
```typescript
export default function Dashboard() {
  const [data, setData] = useState<FetchUpdatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/fetch-updates');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;
  if (!data) return null;
  
  return (
    <div className="min-h-screen bg-background">
      <Header data={data} />
      <Tabs defaultValue="matrix" className="w-full">
        <TabsList>
          <TabsTrigger value="matrix">
            Product Impact ({data.changes.length})
          </TabsTrigger>
          <TabsTrigger value="teams">Team Actions</TabsTrigger>
          <TabsTrigger value="feed">Regulatory Feed</TabsTrigger>
          <TabsTrigger value="fta">FTA Tracker</TabsTrigger>
          <TabsTrigger value="calendar">Compliance Calendar</TabsTrigger>
        </TabsList>
        
        <TabsContent value="matrix">
          <ProductImpactMatrix changes={data.changes} />
        </TabsContent>
        <TabsContent value="teams">
          <TeamActionBoard changes={data.changes} />
        </TabsContent>
        <TabsContent value="feed">
          <RegulatoryFeed changes={data.changes} />
        </TabsContent>
        <TabsContent value="fta">
          <FTAImpactTracker changes={data.changes} />
        </TabsContent>
        <TabsContent value="calendar">
          <ComplianceCalendar changes={data.changes} />
        </TabsContent>
      </Tabs>
      
      <Footer timestamp={data.timestamp} dataSource={data.dataSource} />
    </div>
  );
}
```

## Dashboard Views Specification

### View 1: Product Impact Matrix

**Purpose:** Show which product modules are affected by each regulatory change.

**Layout:**
- Table/grid with sticky header
- Rows = regulatory changes (sorted by severity desc, then date desc)
- Columns = 10 product modules
- Cells = checkmark or impact badge if module is affected
- Click cell → opens detail drawer with impact description

**Row Display:**
```
[Severity Badge] [Source Tag] Title | Module1 | Module2 | ... | Module10
─────────────────────────────────────────────────────────────────────────
🔴 CSMS New Section 232 metals      ✓         ✓                  ✓    ✓
🟠 WH   USMCA review deadline                         ✓                ✓
```

**Features:**
- Filter by severity (dropdown)
- Filter by module (multi-select)
- Filter by source (CSMS, WH, OFAC, etc.)
- Search by keyword
- Expandable rows for full details

### View 2: Team Action Board

**Purpose:** Organize action items by team with priorities and effort estimates.

**Layout:**
- Kanban-style columns, one per team
- Each column header shows team name + timezone flags
- Cards within columns show action items derived from changes
- Sort by priority within each column (P0 at top)

**Card Structure:**
```
┌─────────────────────────────────────┐
│ [P0] [CRITICAL]                     │
│ Update tariff rates for Sec 232     │
│                                      │
│ What changed: New 50% rate on steel │
│ What to update: Duty calculator     │
│ Effective: Apr 6 (2 days ago)       │
│                                      │
│ Effort: S (1-2 hours)                │
└─────────────────────────────────────┘
```

**Team Columns:**
1. Tax & Duty Engine 🇸🇬🇬🇧
2. Classification Engine 🇺🇸🇮🇳
3. Screening Engine 🇺🇸🇮🇪
4. FTA & Origin 🇺🇸🇳🇱
5. Export Controls 🇺🇸🇬🇧
6. Entry Filing Engine 🇺🇸🇵🇭
7. Supply Chain Compliance 🇺🇸🇭🇰
8. Sanctions & Finance 🇺🇸🇸🇬🇬🇧
9. Content & Editorial 🇺🇸🇬🇧🇦🇺
10. Platform Engineering 🇺🇸🇮🇳

### View 3: Regulatory Feed

**Purpose:** Chronological stream of all regulatory updates with source attribution.

**Layout:**
- Two-column layout
- Left column: CBP CSMS messages
- Right column: White House Presidential Actions
- Items sorted by date (newest first)
- Expandable accordion items

**Item Display:**
```
──────────────────────────────────────────────────────────────
CSMS                                    WHITE HOUSE
──────────────────────────────────────────────────────────────
Apr 17, 2026                            Apr 16, 2026
🟢 CSMS #60987654                       🔴 Proclamation
ACE System Update                        Section 232 Pharma Tariffs
[Expand ▼]                              [Expand ▼]

Apr 16, 2026                            Apr 15, 2026
🟠 CSMS #60987123                       🟠 Executive Order
UFLPA Entity List Addition              USMCA Review Process
[Expand ▼]                              [Expand ▼]
```

**Features:**
- Toggle: "Trade-significant only" (hides system maintenance)
- Search across all items
- Direct links to original sources
- Copy link to individual item

### View 4: FTA Impact Tracker

**Purpose:** Show status of trade agreements and how recent changes affect them.

**Layout:**
- Grid of cards, one per FTA/trade deal
- 2-3 cards per row (responsive)
- Each card contains current rates, stacking logic, and recent changes

**Card Structure:**
```
┌─────────────────────────────────────────────┐
│ USMCA (US-Mexico-Canada Agreement)          │
├─────────────────────────────────────────────┤
│ Status: Active | Review: Jul 1, 2026 (74d)  │
│                                              │
│ Base Rate: 0% (qualifying goods)            │
│ + Section 122: +10%                          │
│ = Effective Rate: 10%                        │
│                                              │
│ Recent Changes:                              │
│ • Mandatory review deadline approaching     │
│ • Autos still exempt from Sec 232 25%       │
│                                              │
│ Modules Affected: [4] [6] [10]              │
└─────────────────────────────────────────────┘
```

**Trade Agreements Tracked:**
- USMCA
- US-UK Economic Partnership Deal (EPD)
- US-EU Framework Agreement
- US-Japan STIA
- US-Korea STID
- US-China Truce (expires Nov 10, 2026)

### View 5: Compliance Calendar

**Purpose:** Timeline of upcoming regulatory deadlines and effective dates.

**Layout:**
- Vertical timeline (or sorted list for MVP)
- Events sorted chronologically
- Color-coded by source and severity
- Countdown badges

**Event Display:**
```
──────────────────────────────────────────────
🔴 7 days    Apr 24, 2026
   CAPE Portal Launch (IEEPA Refunds)
   Source: CBP CSMS
   Modules: [6] Entry Filing

🟠 74 days   Jul 1, 2026
   USMCA Mandatory Review Deadline
   Source: White House
   Modules: [4] FTA & Origin

🟠 97 days   Jul 24, 2026 (estimated)
   Section 122 Surcharge 150-Day Expiry
   Source: White House Proclamation
   Modules: [1] Tariff Calculator
```

**Features:**
- Filter by module
- Filter by severity
- Export to calendar (iCal format) - future enhancement
- Email reminders - future enhancement

## Design System

### Color Palette

```css
:root {
  /* Backgrounds */
  --background: #050710;        /* Main background (deep blue-black) */
  --surface: #0f1419;           /* Cards, panels */
  --surface-hover: #1a1f26;     /* Hover states */
  --border: #2d3748;            /* Borders, dividers */
  
  /* Text */
  --text-primary: #f8fafc;      /* Primary text */
  --text-secondary: #94a3b8;    /* Secondary text */
  --text-muted: #64748b;        /* Muted text */
  
  /* Severity colors */
  --critical: #ef4444;          /* Red */
  --critical-bg: #7f1d1d;       /* Red background */
  --high: #f59e0b;              /* Amber */
  --high-bg: #78350f;           /* Amber background */
  --medium: #3b82f6;            /* Blue */
  --medium-bg: #1e3a8a;         /* Blue background */
  --low: #6b7280;               /* Gray */
  --low-bg: #374151;            /* Gray background */
  
  /* Source tags */
  --source-csms: #10b981;       /* Green */
  --source-wh: #ec4899;         /* Pink */
  --source-ofac: #8b5cf6;       /* Purple */
  --source-fta: #06b6d4;        /* Teal */
  
  /* Priority badges */
  --p0: #dc2626;                /* Ship today */
  --p1: #f59e0b;                /* This sprint */
  --p2: #3b82f6;                /* This quarter */
  --p3: #6b7280;                /* Backlog */
  
  /* Accents */
  --accent: #06b6d4;            /* Links, highlights */
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
}
```

### Typography

```css
/* UI Text */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', 
               'Roboto', sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-primary);
}

/* Data Values (CSMS numbers, HTS codes, rates) */
.data-value {
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
}

/* Headings */
h1 { font-size: 24px; font-weight: 600; }
h2 { font-size: 20px; font-weight: 600; }
h3 { font-size: 16px; font-weight: 600; }
```

### Component Styles

**Severity Badges:**
```tsx
<Badge variant="critical">CRITICAL</Badge>  // Red with pulse animation
<Badge variant="high">HIGH</Badge>          // Amber
<Badge variant="medium">MEDIUM</Badge>      // Blue
<Badge variant="low">LOW</Badge>            // Gray
```

**Source Tags:**
```tsx
<span className="source-tag csms">CSMS</span>     // Green
<span className="source-tag wh">WH</span>         // Pink
<span className="source-tag ofac">OFAC</span>     // Purple
```

**Priority Badges:**
```tsx
<Badge variant="p0">P0</Badge>  // Red - Ship today
<Badge variant="p1">P1</Badge>  // Amber - This sprint
<Badge variant="p2">P2</Badge>  // Blue - This quarter
<Badge variant="p3">P3</Badge>  // Gray - Backlog
```

**Animations:**
```css
/* Pulse animation for critical items */
@keyframes pulse-critical {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.severity-critical {
  animation: pulse-critical 2s ease-in-out infinite;
}
```

## Backend Implementation

### TR Claude Authentication

**File:** `lib/tr-claude-auth.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';

interface GCSAuthConfig {
  workspaceId?: string;
  assetId?: string;
  gcsToken?: string;
}

async function getAnthropicKeyFromGCS(
  config: GCSAuthConfig
): Promise<string | null> {
  const gcsToken = 
    config.gcsToken || 
    process.env.GCS_TOKEN || 
    process.env.GCS_BEARER_TOKEN;

  if (!gcsToken) {
    console.log('[GCS Auth] No GCS token provided');
    return null;
  }

  const payload = config.workspaceId 
    ? { workspace_id: config.workspaceId }
    : config.assetId 
    ? { asset_id: config.assetId }
    : null;

  if (!payload) {
    console.log('[GCS Auth] Must provide either workspaceId or assetId');
    return null;
  }

  try {
    console.log('[GCS Auth] Requesting Anthropic key...');
    
    const response = await fetch(
      'https://aiplatform.gcs.int.thomsonreuters.com/v1/anthropic/token',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${gcsToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      throw new Error(`GCS API returned ${response.status}`);
    }

    const credentials = await response.json();

    if (credentials.anthropic_api_key) {
      console.log('[GCS Auth] ✓ Successfully obtained Anthropic API key');
      return credentials.anthropic_api_key;
    } else {
      console.log('[GCS Auth] ✗ Unexpected response:', credentials);
      return null;
    }
  } catch (error) {
    console.error('[GCS Auth] ✗ Error:', error);
    return null;
  }
}

export async function getTRClaudeClient(): Promise<Anthropic | null> {
  const workspaceId = process.env.GCS_WORKSPACE_ID;
  const assetId = process.env.GCS_ASSET_ID;

  const apiKey = await getAnthropicKeyFromGCS({ 
    workspaceId, 
    assetId 
  });

  if (apiKey) {
    return new Anthropic({
      apiKey,
      baseURL: 'https://api.anthropic.com',
    });
  }

  console.log('[GCS Auth] ✗ Failed to get TR Claude client');
  return null;
}
```

### Claude-Powered Data Fetching

**File:** `lib/fetchers/claude-fetcher.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { RegulatoryChange } from '../types';

export async function fetchWithClaude(
  client: Anthropic
): Promise<{ changes: RegulatoryChange[]; metadata: any }> {
  
  const today = new Date().toISOString().split('T')[0];
  
  const prompt = `
You are a regulatory intelligence analyst. Search for the latest US trade regulatory updates and structure them into actionable intelligence.

**PRIMARY SOURCES TO SEARCH:**
1. CBP CSMS (Cargo Systems Messaging Service) - cbp.gov/trade/automated/cargo-systems-messaging-service
2. White House Presidential Actions - whitehouse.gov/presidential-actions

**CURRENT DATE:** ${today}

**SEARCH QUERIES:**
- "CBP CSMS cargo systems messaging service April 2026"
- "whitehouse.gov presidential actions tariff trade April 2026"
- "OFAC sanctions updates April 2026" (supplementary)

**FOR EACH REGULATORY UPDATE FOUND:**

1. Extract core information:
   - Title (clear, concise)
   - Summary (1-2 sentences)
   - Source identifier (e.g., "CSMS #60987654")
   - Publish date
   - Effective date (if mentioned)
   - URL to original source
   - Full text of the update

2. Classify severity:
   - CRITICAL: Rate changes, new tariff authorities, SDN list updates, effective immediately
   - HIGH: Upcoming changes (within 30 days), new filing requirements, FTA modifications
   - MEDIUM: Proposed rules, classification rulings, guidance updates
   - LOW: System maintenance, informational notices

3. Identify affected product modules (by keywords):
   - Module 1 (Tariff Calculator): tariff, duty, rate, section 232/301/122
   - Module 2 (Classification): HTS, HTSUS, classification, chapter 99, ruling
   - Module 3 (Screening): SDN, OFAC, sanctions, entity list, screening
   - Module 4 (FTA): FTA, USMCA, preferential, origin, bilateral deal
   - Module 5 (Export Controls): export, BIS, entity list, EAR, ITAR
   - Module 6 (Entry Filing): ACE, entry, filing, drawback, FTZ, manifest
   - Module 7 (Forced Labor): UFLPA, forced labor, WRO, section 307
   - Module 8 (Sanctions/Finance): sanctions, OFAC, general license, trade finance
   - Module 9 (Content): ALL significant updates affect content
   - Module 10 (Alerts): ALL high/critical updates trigger alerts

4. Determine action type:
   - DATA_UPDATE: tariff rates, HTS codes, screening lists
   - LOGIC_CHANGE: calculation rules, stacking logic, eligibility criteria
   - NEW_FEATURE: new capabilities needed (e.g., CAPE refund filing)
   - CONTENT_UPDATE: help articles, guides, client alerts
   - ALERT_RULE: new subscriber notification rules
   - VALIDATION: entry validation rules
   - MONITORING: proposed rules, investigations

5. Assign priority:
   - P0: Effective now or within 7 days
   - P1: Effective within 30 days
   - P2: Effective within 90 days
   - P3: Future or proposed

6. Estimate effort:
   - S (Small): Data updates, config changes - 1-2 hours
   - M (Medium): Logic changes, new validations - 1-3 days
   - L (Large): New features, multi-module impact - 1-2 weeks

7. Extract regulatory context:
   - Legal authority: Section 232, 301, 122, IEEPA, OFAC, BIS/EAR
   - HTS chapters affected (if mentioned)
   - FTAs affected: USMCA, US-UK EPD, US-EU, US-Japan, US-Korea, US-China Truce

**OUTPUT FORMAT:**
Return a JSON array of regulatory changes. Each object should have this exact structure:

{
  "title": string,
  "summary": string,
  "source": "CSMS" | "WH" | "OFAC" | "USTR" | "BIS",
  "sourceId": string,
  "url": string,
  "publishDate": "YYYY-MM-DD",
  "effectiveDate": "YYYY-MM-DD" | null,
  "fullText": string,
  "severity": "critical" | "high" | "medium" | "low",
  "productModules": number[],  // Array of module IDs (1-10)
  "actionType": string,
  "priority": "P0" | "P1" | "P2" | "P3",
  "effort": "S" | "M" | "L",
  "legalAuthority": string | null,
  "htsChapters": string[] | null,
  "ftasAffected": string[] | null
}

**IMPORTANT:**
- Focus on TRADE-SIGNIFICANT updates (skip routine system maintenance)
- Search for items from the past 7-14 days
- If you can't determine a field, use null or reasonable default
- Be precise with dates (use ISO format YYYY-MM-DD)
- Return ONLY valid JSON, no additional commentary
`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 16000,
      temperature: 0.3, // Lower temperature for more consistent extraction
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      tools: [
        {
          name: 'web_search',
          description: 'Search the web for regulatory updates',
        },
      ],
    });

    // Parse Claude's response and extract JSON
    const content = response.content.find(
      (block) => block.type === 'text'
    )?.text || '[]';
    
    // Extract JSON from response (Claude might wrap it in markdown)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const jsonString = jsonMatch ? jsonMatch[0] : '[]';
    
    const rawChanges = JSON.parse(jsonString);

    // Post-process: add IDs, team assignments, timezones
    const changes: RegulatoryChange[] = rawChanges.map((change: any) => ({
      id: crypto.randomUUID(),
      ...change,
      teams: getTeamsForModules(change.productModules),
      timezones: getTimezonesForModules(change.productModules),
    }));

    // Calculate metadata
    const metadata = {
      cbpCsmsCount: changes.filter((c) => c.source === 'CSMS').length,
      whiteHouseCount: changes.filter((c) => c.source === 'WH').length,
      ofacCount: changes.filter((c) => c.source === 'OFAC').length,
      criticalCount: changes.filter((c) => c.severity === 'critical').length,
    };

    return { changes, metadata };
  } catch (error) {
    console.error('[Claude Fetcher] Error:', error);
    throw error;
  }
}

function getTeamsForModules(moduleIds: number[]): string[] {
  const teams = new Set<string>();
  moduleIds.forEach((id) => {
    const module = PRODUCT_MODULES[id];
    if (module) teams.add(module.team);
  });
  return Array.from(teams);
}

function getTimezonesForModules(moduleIds: number[]): string[] {
  const timezones = new Set<string>();
  moduleIds.forEach((id) => {
    const module = PRODUCT_MODULES[id];
    if (module) {
      module.timezones.forEach((tz) => timezones.add(tz));
    }
  });
  return Array.from(timezones);
}
```

### Fallback Fetcher

**File:** `lib/fetchers/fallback-fetcher.ts`

```typescript
import * as cheerio from 'cheerio';
import { RegulatoryChange } from '../types';

export async function fetchWithFallback(): Promise<{
  changes: RegulatoryChange[];
  metadata: any;
}> {
  const changes: RegulatoryChange[] = [];

  try {
    // Fetch from Federal Register API (CBP documents)
    const frChanges = await fetchFromFederalRegister();
    changes.push(...frChanges);
  } catch (error) {
    console.error('[Fallback] Federal Register fetch failed:', error);
  }

  try {
    // Scrape White House Presidential Actions
    const whChanges = await scrapeWhiteHouse();
    changes.push(...whChanges);
  } catch (error) {
    console.error('[Fallback] White House scrape failed:', error);
  }

  // Apply basic classification heuristics
  const classifiedChanges = changes.map(classifyChangeHeuristic);

  const metadata = {
    cbpCsmsCount: classifiedChanges.filter((c) => c.source === 'CSMS').length,
    whiteHouseCount: classifiedChanges.filter((c) => c.source === 'WH').length,
    ofacCount: 0,
    criticalCount: classifiedChanges.filter((c) => c.severity === 'critical')
      .length,
  };

  return { changes: classifiedChanges, metadata };
}

async function fetchFromFederalRegister(): Promise<Partial<RegulatoryChange>[]> {
  const url = new URL('https://www.federalregister.gov/api/v1/documents.json');
  url.searchParams.set('conditions[agencies][]', 'customs-border-protection');
  url.searchParams.set('per_page', '20');
  url.searchParams.set('order', 'newest');

  const response = await fetch(url.toString());
  const data = await response.json();

  return data.results.map((doc: any) => ({
    title: doc.title,
    summary: doc.abstract || doc.title,
    source: 'CSMS' as const,
    sourceId: doc.document_number,
    url: doc.html_url,
    publishDate: doc.publication_date,
    effectiveDate: doc.effective_on,
    fullText: doc.abstract || '',
  }));
}

async function scrapeWhiteHouse(): Promise<Partial<RegulatoryChange>[]> {
  const url = 'https://www.whitehouse.gov/presidential-actions/';
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);

  const changes: Partial<RegulatoryChange>[] = [];

  $('.presidential-action').each((_, element) => {
    const $el = $(element);
    const title = $el.find('h2').text().trim();
    const date = $el.find('.date').text().trim();
    const link = $el.find('a').attr('href') || '';

    // Only include if trade-related keywords present
    if (
      title.toLowerCase().includes('tariff') ||
      title.toLowerCase().includes('trade') ||
      title.toLowerCase().includes('section') ||
      title.toLowerCase().includes('proclamation')
    ) {
      changes.push({
        title,
        summary: title,
        source: 'WH' as const,
        sourceId: link.split('/').pop() || '',
        url: `https://www.whitehouse.gov${link}`,
        publishDate: new Date(date).toISOString().split('T')[0],
        effectiveDate: null,
        fullText: title,
      });
    }
  });

  return changes;
}

function classifyChangeHeuristic(
  change: Partial<RegulatoryChange>
): RegulatoryChange {
  const text = (change.title + ' ' + change.summary).toLowerCase();

  // Determine severity
  let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium';
  if (
    text.includes('tariff') ||
    text.includes('rate') ||
    text.includes('sanction')
  ) {
    severity = 'critical';
  } else if (text.includes('requirement') || text.includes('fta')) {
    severity = 'high';
  } else if (text.includes('proposed')) {
    severity = 'medium';
  }

  // Map to modules based on keywords
  const productModules: number[] = [];
  if (text.includes('tariff') || text.includes('duty')) productModules.push(1);
  if (text.includes('hts') || text.includes('classification'))
    productModules.push(2);
  if (text.includes('sanction') || text.includes('ofac')) productModules.push(3);
  if (text.includes('fta') || text.includes('usmca')) productModules.push(4);
  if (text.includes('export')) productModules.push(5);
  if (text.includes('entry') || text.includes('filing')) productModules.push(6);
  if (text.includes('forced labor') || text.includes('uflpa'))
    productModules.push(7);

  // Always include content and alerts for high/critical
  if (severity === 'critical' || severity === 'high') {
    productModules.push(9, 10);
  }

  // Determine action type
  let actionType: string = 'MONITORING';
  if (text.includes('rate') || text.includes('tariff')) {
    actionType = 'DATA_UPDATE';
  } else if (text.includes('requirement') || text.includes('rule')) {
    actionType = 'LOGIC_CHANGE';
  }

  // Priority based on effective date
  let priority: 'P0' | 'P1' | 'P2' | 'P3' = 'P2';
  if (severity === 'critical') priority = 'P0';
  else if (severity === 'high') priority = 'P1';

  // Effort based on action type
  let effort: 'S' | 'M' | 'L' = 'M';
  if (actionType === 'DATA_UPDATE') effort = 'S';
  else if (actionType === 'LOGIC_CHANGE') effort = 'M';

  return {
    id: crypto.randomUUID(),
    title: change.title || 'Unknown',
    summary: change.summary || '',
    source: change.source || 'CSMS',
    sourceId: change.sourceId || '',
    url: change.url || '',
    publishDate: change.publishDate || new Date().toISOString().split('T')[0],
    effectiveDate: change.effectiveDate,
    fullText: change.fullText || '',
    severity,
    productModules,
    actionType,
    priority,
    effort,
    teams: getTeamsForModules(productModules),
    timezones: getTimezonesForModules(productModules),
    legalAuthority: null,
    htsChapters: null,
    ftasAffected: null,
  };
}
```

### Main API Route

**File:** `app/api/fetch-updates/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getTRClaudeClient } from '@/lib/tr-claude-auth';
import { fetchWithClaude } from '@/lib/fetchers/claude-fetcher';
import { fetchWithFallback } from '@/lib/fetchers/fallback-fetcher';

export const dynamic = 'force-dynamic'; // Disable caching

export async function GET() {
  const startTime = Date.now();

  try {
    console.log('[API] Attempting TR Claude fetch...');
    
    // Try TR Claude first
    const claudeClient = await getTRClaudeClient();

    if (claudeClient) {
      const data = await fetchWithClaude(claudeClient);
      const duration = Date.now() - startTime;
      
      console.log(`[API] ✓ Success via TR Claude (${duration}ms)`);
      
      return NextResponse.json({
        status: 'success',
        dataSource: 'tr-claude',
        timestamp: new Date().toISOString(),
        ...data,
      });
    } else {
      console.log('[API] TR Claude unavailable, using fallback...');
      throw new Error('TR Claude auth failed');
    }
  } catch (error) {
    console.error('[API] Claude fetch failed:', error);

    try {
      // Fall back to direct fetching
      console.log('[API] Attempting fallback fetch...');
      const data = await fetchWithFallback();
      const duration = Date.now() - startTime;
      
      console.log(`[API] ✓ Partial success via fallback (${duration}ms)`);
      
      return NextResponse.json({
        status: 'partial',
        dataSource: 'fallback',
        timestamp: new Date().toISOString(),
        ...data,
      });
    } catch (fallbackError) {
      console.error('[API] ✗ All fetching failed:', fallbackError);
      
      return NextResponse.json(
        {
          status: 'error',
          message: 'All data sources failed. Please try again later.',
          error: String(fallbackError),
        },
        { status: 500 }
      );
    }
  }
}
```

## Error Handling & Edge Cases

### Loading States

1. **Initial page load**: Full-screen skeleton with pulsing placeholders
2. **Data fetching**: Spinner with message "Fetching latest trade updates..."
3. **Tab switching**: Instant (no loading since data already fetched)

### Error States

**Network Failure:**
```tsx
<ErrorState
  title="Connection Failed"
  message="Could not reach regulatory data sources. Check your network connection."
  onRetry={() => refetch()}
/>
```

**Partial Data:**
```tsx
<Alert variant="warning">
  <AlertIcon />
  <AlertTitle>Partial Data Loaded</AlertTitle>
  <AlertDescription>
    Some data sources are unavailable. Showing results from: {dataSource}
  </AlertDescription>
</Alert>
```

**Authentication Failure (TR Claude):**
- Silently falls back to direct fetching
- Logs error to console for debugging
- Frontend shows partial data warning if fallback also has issues

**Rate Limiting:**
```tsx
<ErrorState
  title="Rate Limit Exceeded"
  message="Too many requests. Please wait 60 seconds before refreshing."
  countdown={60}
/>
```

### Edge Cases

1. **No changes found**: Display message "No new regulatory updates found for the selected period."
2. **Ambiguous module mapping**: Show "?" icon with tooltip "Classification uncertain - review recommended"
3. **Missing effective date**: Display "TBD" or "Not specified"
4. **Very long text**: Truncate with "... [Expand]" button
5. **Broken source URLs**: Disable link, show warning icon

## Deployment

### Environment Setup

**Required Environment Variables:**

```bash
# .env.local (for local development)
GCS_TOKEN=your_gcs_jwt_token_here
GCS_WORKSPACE_ID=your_workspace_id
# OR
GCS_ASSET_ID=your_asset_id

# Optional: Override API endpoint
# GCS_API_ENDPOINT=https://aiplatform.gcs.int.thomsonreuters.com/v1/anthropic/token
```

**Vercel Environment Variables:**

In Vercel dashboard → Project Settings → Environment Variables:
- `GCS_TOKEN` (Secret)
- `GCS_WORKSPACE_ID` or `GCS_ASSET_ID`

### Deployment Steps

**1. Prepare Repository**

```bash
cd RegulatoryUpdates
git add .
git commit -m "Add regulatory intelligence dashboard"
git push origin main
```

**2. Deploy to Vercel**

Option A: CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

Option B: Web Interface
1. Visit vercel.com
2. Click "New Project"
3. Import from GitHub
4. Select repository
5. Configure environment variables
6. Click "Deploy"

**3. Post-Deployment**

- Get deployment URL (e.g., `https://regulatory-dashboard-xyz.vercel.app`)
- Test: Open URL in browser, verify data loads
- Share URL with PM

### Custom Domain (Optional)

If TR owns a domain:
1. Vercel Dashboard → Project → Settings → Domains
2. Add custom domain (e.g., `regulatory-intel.tr.com`)
3. Add DNS records as instructed
4. Vercel provisions SSL automatically

### Network Considerations

**TR Internal Network:**
- GCS AI Platform endpoint (`aiplatform.gcs.int.thomsonreuters.com`) is internal
- If deploying to public Vercel, the app must access TR network
- Options:
  1. Deploy on TR internal infrastructure instead of Vercel
  2. Use VPN/proxy for Vercel to access GCS endpoint
  3. Rely on fallback mechanism (loses Claude intelligence)

**Recommendation for Monday demo:**
- Deploy to Vercel with fallback enabled
- If Claude auth works: great
- If not: fallback provides sufficient demo data

## Testing Strategy

### Pre-Deployment Testing

**Local Development Testing:**
```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
cp .env.example .env.local
# Edit .env.local with your GCS credentials

# 3. Run dev server
npm run dev

# 4. Test in browser
open http://localhost:3000

# 5. Verify all views work
- Product Impact Matrix loads
- Team Action Board shows cards
- Regulatory Feed displays items
- FTA Tracker shows agreements
- Compliance Calendar shows deadlines

# 6. Test error states
- Disable network → should show error
- Invalid credentials → should fall back
- Refresh multiple times → should not rate limit
```

**Build Testing:**
```bash
# Verify production build works
npm run build
npm run start
```

### Manual Testing Checklist

- [ ] Page loads without errors
- [ ] Loading state displays while fetching
- [ ] Data populates after fetch completes
- [ ] All 5 tabs are clickable and render content
- [ ] Severity badges show correct colors
- [ ] Module checkmarks appear in Product Impact Matrix
- [ ] Team columns show in Team Action Board
- [ ] Source tags (CSMS, WH) display correctly
- [ ] Click expandable items → details show
- [ ] Filter/search functionality works (if implemented)
- [ ] Footer shows correct timestamp and data source
- [ ] Responsive design works on mobile (basic test)
- [ ] Error state displays if network fails
- [ ] Retry button refetches data

## Timeline & Milestones

### Development Schedule (Weekend Build)

**Saturday:**
- Morning (3 hours): Setup Next.js project, configure Tailwind + shadcn/ui
- Afternoon (4 hours): Build API routes, TR Claude auth, fetchers
- Evening (2 hours): Test data fetching, verify Claude integration

**Sunday:**
- Morning (3 hours): Build Dashboard container + View 1 (Product Impact Matrix)
- Afternoon (3 hours): Build Views 2-3 (Team Action Board, Regulatory Feed)
- Evening (3 hours): Build Views 4-5 (FTA Tracker, Calendar) + styling polish

**Monday Morning:**
- Early (1 hour): Final testing, fix bugs
- Deploy to Vercel
- Share URL with PM

**Total Estimated Time:** 12-15 hours

### Risk Mitigation

**Risk:** TR Claude auth doesn't work in Vercel
- **Mitigation:** Fallback mechanism provides demo-quality data

**Risk:** Development takes longer than expected
- **Mitigation:** Focus on Views 1-3 first (core functionality), defer Views 4-5 if needed

**Risk:** Data sources change format
- **Mitigation:** Claude's flexibility handles format changes better than rigid scraping

**Risk:** Vercel deployment issues
- **Mitigation:** Test `vercel deploy` early on Saturday, have backup plan to demo localhost via screen share

## Future Enhancements

Post-Monday improvements (not required for initial demo):

1. **Scheduled Refresh**: Move from page-load to hourly background updates with database caching
2. **User Preferences**: Remember selected filters, favorite views, module focus
3. **Email Alerts**: Subscribe to notifications for specific modules/teams
4. **Export Functionality**: Download data as CSV/Excel
5. **Historical View**: Show regulatory changes over time (requires database)
6. **Advanced Search**: Full-text search across all regulatory content
7. **Collaboration**: Comments, assignments, status tracking
8. **Mobile App**: Native iOS/Android app with push notifications
9. **API Access**: Expose data via REST API for other TR tools
10. **AI Chat**: Ask questions about regulatory changes in natural language

## Success Metrics

### Immediate (Monday Demo)
- ✅ PM can open URL and see dashboard
- ✅ Data is current (from past 7-14 days)
- ✅ All 5 views are functional
- ✅ Professional appearance

### Short-Term (Post-Demo)
- User feedback indicates value
- Teams start using dashboard in daily workflow
- Feature requests collected for prioritization

### Long-Term (Product Maturity)
- Reduced time to identify regulatory impacts (from hours to minutes)
- Improved cross-team coordination on regulatory changes
- Earlier detection of product update requirements

## Appendix

### Key Dependencies

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@anthropic-ai/sdk": "^0.20.0",
    "cheerio": "^1.0.0-rc.12",
    "date-fns": "^3.6.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0"
  }
}
```

### Project Structure Summary

```
regulatory-dashboard/
├── src/
│   ├── app/                  # Next.js App Router
│   ├── components/           # React components
│   ├── lib/                  # Utilities, types, fetchers
│   └── styles/               # Global CSS
├── public/                   # Static assets
├── docs/                     # This design spec
├── .env.local               # Environment variables (gitignored)
├── .env.example             # Example env file
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md                # Setup instructions
```

### Glossary

- **CBP**: US Customs and Border Protection
- **CSMS**: Cargo Systems Messaging Service (CBP's notification system)
- **OFAC**: Office of Foreign Assets Control (US sanctions authority)
- **HTS/HTSUS**: Harmonized Tariff Schedule of the United States
- **FTA**: Free Trade Agreement
- **USMCA**: United States-Mexico-Canada Agreement
- **Section 232**: Steel/aluminum/national security tariffs
- **Section 301**: China tariffs
- **Section 122**: Emergency tariff authority
- **IEEPA**: International Emergency Economic Powers Act
- **WRO**: Withhold Release Order (forced labor enforcement)
- **UFLPA**: Uyghur Forced Labor Prevention Act
- **ACE**: Automated Commercial Environment (CBP's entry system)
- **GCS**: TR Global Content Services
- **TR**: Thomson Reuters

---

**Document Version:** 1.0  
**Last Updated:** 2026-04-17  
**Author:** Claude Code (Regulatory Intelligence Team)
