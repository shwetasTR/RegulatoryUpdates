# Regulatory Intelligence Dashboard

A Next.js dashboard for tracking US trade regulatory updates with AI-powered classification and multi-view analysis.

## Features

- **Live Data Integration**: Fetches regulatory updates from CBP CSMS and White House Presidential Actions
- **AI-Powered Classification**: Uses TR GCS Claude AI Platform for intelligent data extraction with fallback to Federal Register API
- **5 Interactive Views**:
  - **Regulatory Feed**: Chronological two-column feed with severity and recency indicators
  - **Product Impact Matrix**: Table mapping regulatory changes to 10 product modules
  - **Team Action Board**: Kanban-style board organized by team with priority/effort badges
  - **FTA Impact Tracker**: Status cards for 6 FTA agreements with impact assessment
  - **Compliance Calendar**: Upcoming deadlines organized by time buckets (7/30/90 days)
- **Smart Classification**: Automatic severity, priority, effort estimation, and team assignment
- **Dark Professional Theme**: Optimized for compliance dashboard use

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **AI Platform**: TR GCS Claude AI (with Anthropic Claude API)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- TR GCS authentication token (for Claude AI integration)
- Git

### Installation

1. Clone the repository:
```bash
cd RegulatoryUpdates
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:

Create a `.env.local` file in the root directory:

```env
# TR GCS Authentication (required for Claude AI)
GCS_TOKEN=your_gcs_token_here
# OR
GCS_BEARER_TOKEN=your_gcs_bearer_token_here

# Optional: Workspace or Asset ID
GCS_WORKSPACE_ID=your_workspace_id
# OR
GCS_ASSET_ID=your_asset_id

# Node.js Settings (if behind TR corporate proxy)
NODE_TLS_REJECT_UNAUTHORIZED=0
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
RegulatoryUpdates/
├── app/
│   ├── api/
│   │   ├── fetch-updates/    # Main data fetching endpoint
│   │   └── health/            # Health check endpoint
│   ├── globals.css            # Dark theme and custom styles
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Main dashboard page
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── views/                 # Dashboard view components
│   ├── Dashboard.tsx          # Main dashboard with tabs
│   ├── Header.tsx             # Dashboard header
│   ├── Footer.tsx             # Data source footer
│   ├── LoadingState.tsx       # Loading spinner
│   └── ErrorState.tsx         # Error display
├── lib/
│   ├── fetchers/
│   │   ├── claude-fetcher.ts  # TR Claude AI data fetcher
│   │   └── fallback-fetcher.ts # Fallback data fetcher
│   ├── classification.ts      # Classification logic
│   ├── constants.ts           # Product modules and FTA agreements
│   ├── tr-claude-auth.ts      # TR GCS authentication
│   ├── types.ts               # TypeScript interfaces
│   └── utils.ts               # Utility functions
└── public/                    # Static assets
```

## Data Classification

The system automatically classifies regulatory changes:

### Severity Levels
- **Critical**: Immediate compliance risk, enforcement actions, emergency regulations
- **High**: Significant impact, major policy changes, new requirements
- **Medium**: Moderate impact, clarifications, procedural updates
- **Low**: Minor updates, informational notices

### Priority (P0-P3)
Based on severity + effective date proximity:
- **P0**: Critical changes due within 30 days
- **P1**: High severity or critical changes due 30-90 days
- **P2**: Medium severity or high changes due beyond 90 days
- **P3**: Low severity or long-term changes

### Effort Estimation
- **S (Small)**: Simple clarifications, minor updates
- **M (Medium)**: New requirements, significant changes
- **L (Large)**: Major overhauls, complex integrations

### Product Module Mapping

10 product modules with keyword-based classification:
1. **Tariff & Duty Calculator** (Tax & Duty Engine team, Singapore/London)
2. **Trade Compliance Screener** (Compliance Engine, New York/Singapore)
3. **FTA Certificate Generator** (Trade Documentation, Austin/Manila)
4. **Import/Export Document Processor** (Trade Documentation, Austin/Manila)
5. **HTS Classification Assistant** (Classification Services, Austin/Bangalore)
6. **Customs Broker Portal** (Broker Services, Chicago/Hyderabad)
7. **Sanctions & Export Controls** (Compliance Engine, New York/Singapore)
8. **Landed Cost Calculator** (Tax & Duty Engine, Singapore/London)
9. **Trade Agreement Rules of Origin** (Classification Services, Austin/Bangalore)
10. **Regulatory Intelligence Feed** (Data Services, Seattle/Dublin)

## API Endpoints

### `GET /api/fetch-updates`

Returns regulatory updates with metadata.

**Response:**
```typescript
{
  status: 'success' | 'partial' | 'error',
  dataSource: 'tr-claude' | 'fallback',
  timestamp: string,
  changes: RegulatoryChange[],
  metadata: {
    totalCount: number,
    csmsCount: number,
    whCount: number,
    criticalCount: number,
    highCount: number
  }
}
```

### `GET /api/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-04-18T10:30:00.000Z",
  "service": "regulatory-intelligence-dashboard"
}
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub

2. Import project in Vercel:
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository

3. Configure environment variables in Vercel dashboard:
   - `GCS_TOKEN` or `GCS_BEARER_TOKEN`
   - `GCS_WORKSPACE_ID` or `GCS_ASSET_ID` (optional)
   - `NODE_TLS_REJECT_UNAUTHORIZED=0` (if needed for TR proxy)

4. Deploy:
```bash
npm run build  # Test build locally first
vercel --prod  # Or use Vercel dashboard
```

### Manual Build

```bash
# Test production build
npm run build
npm start

# Build output in .next/ directory
```

## TR Claude Integration

This dashboard uses TR's internal GCS AI Platform for Claude API access:

1. **Authentication**: Fetches Anthropic API key from `aiplatform.gcs.int.thomsonreuters.com/v1/anthropic/token`
2. **Classification**: Uses Claude to extract and classify regulatory updates with structured prompts
3. **Fallback**: Automatically falls back to Federal Register API + HTML scraping if Claude is unavailable

## Development

### Adding New Views

1. Create component in `components/views/`:
```tsx
import { RegulatoryChange } from '@/lib/types';

interface MyViewProps {
  changes: RegulatoryChange[];
}

export default function MyView({ changes }: MyViewProps) {
  // Your view logic
}
```

2. Import in `Dashboard.tsx` and add tab

### Modifying Classification

Edit `lib/classification.ts`:
- `determineSeverity()`: Severity logic
- `mapToModules()`: Product module mapping
- `determinePriority()`: Priority calculation
- `estimateEffort()`: Effort estimation

### Adding Data Sources

1. Create fetcher in `lib/fetchers/`
2. Update `app/api/fetch-updates/route.ts`
3. Add source type to `lib/types.ts`

## Troubleshooting

### SSL Certificate Errors

If you encounter SSL errors when installing dependencies behind TR corporate proxy:

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npm install
NODE_TLS_REJECT_UNAUTHORIZED=0 npx shadcn@latest add <component>
```

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Test build
npm run build
```

### TR Claude Authentication Errors

1. Verify `GCS_TOKEN` or `GCS_BEARER_TOKEN` is set
2. Check token hasn't expired
3. Ensure you have access to GCS AI Platform
4. Check network connectivity to `aiplatform.gcs.int.thomsonreuters.com`

## License

Thomson Reuters Internal Use Only

## Contact

For questions or support, contact the Trade Technology team.
