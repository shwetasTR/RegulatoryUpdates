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

### EC2 Docker Deployment (Current Setup)

This application is deployed to AWS EC2 using GitHub Actions and Docker.

#### Prerequisites

- AWS Account with EC2 access
- GitHub repository with admin access (to add secrets)

#### One-Time Setup

**Step 1: Create EC2 Instance**

1. Go to AWS Console → EC2 → Launch Instance
2. Configuration:
   - **Name:** RegulatoryUpdates
   - **AMI:** Amazon Linux 2023
   - **Instance type:** t3.small
   - **Key pair:** Create new (download the `.pem` file)
   - **Network settings:**
     - Allow SSH (port 22) from your IP
     - Allow HTTP (port 80) from anywhere (0.0.0.0/0)
3. Launch instance
4. Copy the **Public IPv4 DNS** (e.g., `ec2-54-123-45-67.compute-1.amazonaws.com`)

**Step 2: Configure GitHub Secrets**

Go to: `https://github.com/YOUR_USERNAME/RegulatoryUpdates/settings/secrets/actions`

Add these secrets:

| Secret Name | Value | How to Get |
|------------|-------|------------|
| `EC2_HOST` | `ec2-XX-XXX-XXX-XX.compute-1.amazonaws.com` | From EC2 instance details |
| `EC2_SSH_KEY` | Contents of `.pem` file | Paste entire file content |
| `GCS_TOKEN` | Your TR GCS token | From TR GCS platform |
| `GCS_WORKSPACE_ID` | Your workspace ID | From TR GCS platform |

**Step 3: Deploy**

Push to master branch or manually trigger workflow:
```bash
git push origin master
```

Or trigger manually:
- Go to Actions tab → "Deploy to EC2" workflow
- Click "Run workflow" → Select master branch → Run

**First deployment takes ~6-8 minutes** (installs Docker on EC2)

**Subsequent deployments take ~3-4 minutes**

#### Accessing the Application

After deployment completes:
- Check GitHub Actions summary for the URL
- Or use the EC2 Public DNS: `http://your-ec2-dns.compute-1.amazonaws.com`

#### Updating Claude Credentials

**Option 1: GitHub UI**
1. Go to repository Settings → Secrets and variables → Actions
2. Click on `GCS_TOKEN` → Update secret
3. Enter new value → Save
4. Trigger new deployment (push or manual)

**Option 2: GitHub CLI**
```bash
gh secret set GCS_TOKEN --body "new_token_value"
gh secret set GCS_WORKSPACE_ID --body "new_workspace_id"
```

Then trigger deployment to apply changes.

#### Troubleshooting

**View container logs:**
```bash
ssh -i your-key.pem ec2-user@your-ec2-dns
docker logs regulatoryupdates
docker logs -f regulatoryupdates  # follow live
```

**Restart container:**
```bash
ssh -i your-key.pem ec2-user@your-ec2-dns
docker restart regulatoryupdates
```

**Check deployment status:**
- GitHub Actions tab shows build/deploy progress
- Green checkmark = successful
- Red X = failed (click for logs)

**Common issues:**
- **Permission denied:** Check `EC2_SSH_KEY` secret is complete (includes `-----BEGIN/END-----`)
- **Can't access URL:** Check security group allows port 80 from 0.0.0.0/0
- **Container not running:** SSH in and run `docker ps` to check status

#### Cost Estimate

- **EC2 t3.small (us-east-1):** ~$15/month (running 24/7)
- **Data transfer:** Usually under $1/month for typical usage
- **Total:** ~$16/month

To reduce costs:
- Stop instance when not in use (requires DNS update on restart)
- Use t3.micro instead (~$7.50/month, less memory)

---

### Alternative: Vercel Deployment

For quick testing without EC2 setup:

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables:
   - `GCS_TOKEN`
   - `GCS_WORKSPACE_ID`
4. Deploy

Vercel is free for hobby projects but has execution time limits.

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
