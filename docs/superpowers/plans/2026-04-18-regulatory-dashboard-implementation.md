# Regulatory Intelligence Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack Next.js regulatory intelligence dashboard that fetches live US trade updates via TR Claude, classifies them by product module impact, and presents 5 interactive views for Monday PM demo.

**Architecture:** Next.js 14 App Router with server-side API routes for TR Claude authentication and data fetching, React frontend with 5 tabbed views, Tailwind CSS + shadcn/ui components, fallback mechanism to Federal Register API when Claude unavailable.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui, Anthropic SDK, cheerio (HTML parsing), Vercel deployment

---

## File Structure Overview

**Project Setup:**
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `next.config.js` - Next.js configuration
- `tailwind.config.ts` - Tailwind configuration
- `.env.example` - Environment variable template

**Types & Constants:**
- `lib/types.ts` - TypeScript interfaces
- `lib/constants.ts` - Product modules, FTA agreements
- `lib/utils.ts` - Utility functions

**Backend:**
- `lib/tr-claude-auth.ts` - TR GCS authentication
- `lib/classification.ts` - Classification logic
- `lib/fetchers/claude-fetcher.ts` - Claude data fetcher
- `lib/fetchers/fallback-fetcher.ts` - Fallback fetcher
- `app/api/fetch-updates/route.ts` - Main API endpoint
- `app/api/health/route.ts` - Health check endpoint

**Frontend:**
- `app/layout.tsx` - Root layout
- `app/page.tsx` - Main page
- `app/globals.css` - Global styles
- `components/Dashboard.tsx` - Main dashboard
- `components/LoadingState.tsx` - Loading component
- `components/ErrorState.tsx` - Error component
- `components/Header.tsx` - Header component
- `components/Footer.tsx` - Footer component
- `components/views/ProductImpactMatrix.tsx` - View 1
- `components/views/TeamActionBoard.tsx` - View 2
- `components/views/RegulatoryFeed.tsx` - View 3
- `components/views/FTAImpactTracker.tsx` - View 4
- `components/views/ComplianceCalendar.tsx` - View 5
- `components/ui/*` - shadcn/ui components

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `.env.example`

- [ ] **Step 1: Initialize Next.js project**

```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src --import-alias "@/*"
```

Answer prompts: Use default settings

- [ ] **Step 2: Install dependencies**

```bash
npm install @anthropic-ai/sdk cheerio date-fns class-variance-authority clsx tailwind-merge lucide-react
```

- [ ] **Step 3: Install shadcn/ui**

```bash
npx shadcn@latest init
```

Choose: Default style, Slate color, CSS variables: yes

- [ ] **Step 4: Add shadcn/ui components**

```bash
npx shadcn@latest add tabs card badge button table alert
```

- [ ] **Step 5: Create .env.example**

```bash
echo "GCS_TOKEN=your_jwt_token_here
GCS_WORKSPACE_ID=your_workspace_id" > .env.example
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: initialize Next.js project with dependencies"
```

---

## Task 2: Types & Constants

**Files:**
- Create: `lib/types.ts`, `lib/constants.ts`, `lib/utils.ts`

- [ ] **Step 1: Create lib directory**

```bash
mkdir -p lib/fetchers
```

- [ ] **Step 2: Create types file**

Create `lib/types.ts` with all TypeScript interfaces (RegulatoryChange, FetchUpdatesResponse, ProductModule, etc.)

- [ ] **Step 3: Create constants file**

Create `lib/constants.ts` with PRODUCT_MODULES (all 10 modules) and FTA_AGREEMENTS

- [ ] **Step 4: Create utils file**

Create `lib/utils.ts` with cn(), daysDiff(), isWithin7Days(), isWithin30Days(), isWithin90Days(), formatDate(), getCountdown()

- [ ] **Step 5: Commit**

```bash
git add lib/
git commit -m "feat: add types, constants, and utilities"
```

---

## Task 3: TR Claude Authentication

**Files:**
- Create: `lib/tr-claude-auth.ts`

- [ ] **Step 1: Create auth module**

Create `lib/tr-claude-auth.ts` with getAnthropicKeyFromGCS() and getTRClaudeClient() functions

- [ ] **Step 2: Commit**

```bash
git add lib/tr-claude-auth.ts
git commit -m "feat: add TR GCS Claude authentication"
```

---

## Task 4: Classification Logic

**Files:**
- Create: `lib/classification.ts`

- [ ] **Step 1: Create classification module**

Create `lib/classification.ts` with determineSeverity(), mapToModules(), determineActionType(), determinePriority(), estimateEffort(), getTeamsForModules(), getTimezonesForModules()

- [ ] **Step 2: Commit**

```bash
git add lib/classification.ts
git commit -m "feat: add classification logic"
```

---

## Task 5: Data Fetchers

**Files:**
- Create: `lib/fetchers/claude-fetcher.ts`, `lib/fetchers/fallback-fetcher.ts`

- [ ] **Step 1: Create Claude fetcher**

Create `lib/fetchers/claude-fetcher.ts` with fetchWithClaude() function

- [ ] **Step 2: Create fallback fetcher**

Create `lib/fetchers/fallback-fetcher.ts` with fetchWithFallback(), fetchFromFederalRegister(), scrapeWhiteHouse()

- [ ] **Step 3: Commit**

```bash
git add lib/fetchers/
git commit -m "feat: add Claude and fallback data fetchers"
```

---

## Task 6: API Routes

**Files:**
- Create: `app/api/fetch-updates/route.ts`, `app/api/health/route.ts`

- [ ] **Step 1: Create API directories**

```bash
mkdir -p app/api/fetch-updates app/api/health
```

- [ ] **Step 2: Create fetch-updates endpoint**

Create `app/api/fetch-updates/route.ts` with GET handler (tries Claude, falls back)

- [ ] **Step 3: Create health endpoint**

Create `app/api/health/route.ts` with GET handler

- [ ] **Step 4: Test API locally**

```bash
npm run dev
```

Visit http://localhost:3000/api/health - should return JSON

- [ ] **Step 5: Commit**

```bash
git add app/api/
git commit -m "feat: add API routes"
```

---

## Task 7: Global Styles & Layout

**Files:**
- Modify: `app/globals.css`, Create: `app/layout.tsx`

- [ ] **Step 1: Update globals.css with dark theme**

Replace `app/globals.css` with dark theme CSS variables and custom utilities

- [ ] **Step 2: Create layout**

Create `app/layout.tsx` with dark theme enabled

- [ ] **Step 3: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: add dark theme and layout"
```

---

## Task 8: UI Components

**Files:**
- Create: `components/LoadingState.tsx`, `components/ErrorState.tsx`, `components/Header.tsx`, `components/Footer.tsx`

- [ ] **Step 1: Create components directory**

```bash
mkdir -p components/views
```

- [ ] **Step 2: Create LoadingState**

Create `components/LoadingState.tsx`

- [ ] **Step 3: Create ErrorState**

Create `components/ErrorState.tsx`

- [ ] **Step 4: Create Header**

Create `components/Header.tsx`

- [ ] **Step 5: Create Footer**

Create `components/Footer.tsx`

- [ ] **Step 6: Commit**

```bash
git add components/
git commit -m "feat: add UI components (loading, error, header, footer)"
```

---

## Task 9: Dashboard Views

**Files:**
- Create all 5 view components

- [ ] **Step 1: Create ProductImpactMatrix**

Create `components/views/ProductImpactMatrix.tsx`

- [ ] **Step 2: Create TeamActionBoard**

Create `components/views/TeamActionBoard.tsx`

- [ ] **Step 3: Create RegulatoryFeed**

Create `components/views/RegulatoryFeed.tsx`

- [ ] **Step 4: Create FTAImpactTracker**

Create `components/views/FTAImpactTracker.tsx`

- [ ] **Step 5: Create ComplianceCalendar**

Create `components/views/ComplianceCalendar.tsx`

- [ ] **Step 6: Commit**

```bash
git add components/views/
git commit -m "feat: add all 5 dashboard views"
```

---

## Task 10: Main Dashboard & Page

**Files:**
- Create: `components/Dashboard.tsx`, `app/page.tsx`

- [ ] **Step 1: Create Dashboard component**

Create `components/Dashboard.tsx` with tabs and data fetching

- [ ] **Step 2: Create main page**

Create `app/page.tsx` rendering Dashboard

- [ ] **Step 3: Test complete app**

```bash
npm run dev
```

Visit http://localhost:3000 and verify all 5 tabs work

- [ ] **Step 4: Commit**

```bash
git add components/Dashboard.tsx app/page.tsx
git commit -m "feat: add main dashboard and page"
```

---

## Task 11: Documentation & Deployment

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README**

Create comprehensive `README.md` with setup and deployment instructions

- [ ] **Step 2: Production build test**

```bash
npm run build && npm run start
```

Verify production build works

- [ ] **Step 3: Deploy to Vercel**

```bash
vercel --prod
```

Or use Vercel web UI

- [ ] **Step 4: Set environment variables in Vercel**

Add GCS_TOKEN and GCS_WORKSPACE_ID to Vercel project settings

- [ ] **Step 5: Verify deployment**

Open Vercel URL and test all features

- [ ] **Step 6: Final commit**

```bash
git add README.md
git commit -m "docs: add README and finalize deployment"
git push
```

---

## Testing Checklist

Before sharing with PM, verify:

- [ ] Dashboard loads without errors
- [ ] Data fetches (Claude or fallback)
- [ ] All 5 tabs render correctly
- [ ] Loading state displays during fetch
- [ ] Error state works (test by disconnecting network)
- [ ] Header shows correct counts
- [ ] Footer shows data source
- [ ] Severity badges show correct colors
- [ ] Module checkmarks appear in matrix
- [ ] Team cards show in action board
- [ ] Feed columns display CSMS and WH separately
- [ ] FTA cards show all agreements
- [ ] Calendar shows upcoming dates
- [ ] Responsive design works on mobile
- [ ] No console errors
- [ ] Production build succeeds

---

## Deployment URL

After deployment, share with PM:
- Production URL: `https://your-project.vercel.app`
- Expected delivery: Monday morning

**Estimated Total Time:** 12-15 hours
