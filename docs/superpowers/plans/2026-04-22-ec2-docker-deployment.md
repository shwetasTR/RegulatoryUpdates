# EC2 Docker Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automated GitHub Actions deployment pipeline that builds Docker images and deploys to EC2 instance with public HTTP access.

**Architecture:** Multi-stage Docker build pushed to GitHub Container Registry, SSH-based deployment to persistent EC2 instance running Docker container on port 80.

**Tech Stack:** Docker, GitHub Actions, GitHub Container Registry (ghcr.io), AWS EC2, SSH, Next.js 16.2.4

---

## File Structure

**New files:**
- `Dockerfile` - Multi-stage build for Next.js production
- `.dockerignore` - Exclude unnecessary files from Docker context
- `.github/workflows/deploy.yml` - GitHub Actions CI/CD pipeline

**Modified files:**
- `README.md` - Add deployment section with setup instructions

---

## Task 1: Create Dockerfile

**Files:**
- Create: `Dockerfile`

- [ ] **Step 1: Create multi-stage Dockerfile with dependencies stage**

Create `Dockerfile` in project root:

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force
```

- [ ] **Step 2: Add builder stage**

Add to `Dockerfile`:

```dockerfile

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy source code
COPY . .

# Build Next.js application
RUN npm run build
```

- [ ] **Step 3: Add runner stage (final image)**

Add to `Dockerfile`:

```dockerfile

# Stage 3: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs package.json ./

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set hostname (Next.js requirement)
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["npm", "start"]
```

- [ ] **Step 4: Test Docker build locally (optional verification)**

Run:
```bash
docker build -t regulatoryupdates:test .
```

Expected: Build completes successfully with all 3 stages, final image ~150-200MB

- [ ] **Step 5: Commit Dockerfile**

```bash
git add Dockerfile
git commit -m "feat: add multi-stage Dockerfile for Next.js production build"
```

---

## Task 2: Create .dockerignore

**Files:**
- Create: `.dockerignore`

- [ ] **Step 1: Create .dockerignore file**

Create `.dockerignore` in project root:

```
# Dependencies
node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# Next.js
.next
out
*.tsbuildinfo
next-env.d.ts

# Testing
coverage
.nyc_output

# Environment files
.env
.env.*
!.env.example

# IDE
.vscode
.idea
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Git
.git
.gitignore
.gitattributes

# CI/CD
.github

# Documentation
*.md
!README.md

# Misc
.claude
docs
```

- [ ] **Step 2: Verify Docker build with .dockerignore**

Run:
```bash
docker build -t regulatoryupdates:test .
```

Expected: Build completes faster (smaller context), no warnings about excluded files

- [ ] **Step 3: Commit .dockerignore**

```bash
git add .dockerignore
git commit -m "feat: add .dockerignore to optimize Docker build context"
```

---

## Task 3: Create GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create workflow directory**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Create workflow file with trigger configuration**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to EC2

on:
  push:
    branches:
      - master
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository_owner }}/regulatoryupdates

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
```

- [ ] **Step 3: Add checkout and Docker setup steps**

Add to `.github/workflows/deploy.yml` after `steps:`:

```yaml
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
```

- [ ] **Step 4: Add Docker build and push step**

Add to `.github/workflows/deploy.yml`:

```yaml
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

- [ ] **Step 5: Add SSH setup step**

Add to `.github/workflows/deploy.yml`:

```yaml
      - name: Setup SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.EC2_SSH_KEY }}" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan -H ${{ secrets.EC2_HOST }} >> ~/.ssh/known_hosts
```

- [ ] **Step 6: Add Docker installation step (runs on first deployment)**

Add to `.github/workflows/deploy.yml`:

```yaml
      - name: Install Docker on EC2 (if needed)
        run: |
          ssh -i ~/.ssh/deploy_key ec2-user@${{ secrets.EC2_HOST }} << 'ENDSSH'
            if ! command -v docker &> /dev/null; then
              echo "Installing Docker..."
              sudo yum update -y
              sudo yum install docker -y
              sudo systemctl start docker
              sudo systemctl enable docker
              sudo usermod -a -G docker ec2-user
              echo "Docker installed successfully"
            else
              echo "Docker already installed"
            fi
          ENDSSH
```

- [ ] **Step 7: Add deployment step**

Add to `.github/workflows/deploy.yml`:

```yaml
      - name: Deploy to EC2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_ACTOR: ${{ github.actor }}
          REGISTRY: ${{ env.REGISTRY }}
          IMAGE_NAME: ${{ env.IMAGE_NAME }}
          GCS_TOKEN: ${{ secrets.GCS_TOKEN }}
          GCS_WORKSPACE_ID: ${{ secrets.GCS_WORKSPACE_ID }}
        run: |
          ssh -i ~/.ssh/deploy_key ec2-user@${{ secrets.EC2_HOST }} \
            GITHUB_TOKEN="$GITHUB_TOKEN" \
            GITHUB_ACTOR="$GITHUB_ACTOR" \
            REGISTRY="$REGISTRY" \
            IMAGE_NAME="$IMAGE_NAME" \
            GCS_TOKEN="$GCS_TOKEN" \
            GCS_WORKSPACE_ID="$GCS_WORKSPACE_ID" \
            bash << 'ENDSSH'
            # Login to GitHub Container Registry
            echo "$GITHUB_TOKEN" | docker login "$REGISTRY" -u "$GITHUB_ACTOR" --password-stdin
            
            # Pull latest image
            docker pull "$REGISTRY/$IMAGE_NAME:latest"
            
            # Stop and remove old container if exists
            docker stop regulatoryupdates 2>/dev/null || true
            docker rm regulatoryupdates 2>/dev/null || true
            
            # Run new container
            docker run -d \
              --name regulatoryupdates \
              --restart unless-stopped \
              -p 80:3000 \
              -e GCS_TOKEN="$GCS_TOKEN" \
              -e GCS_WORKSPACE_ID="$GCS_WORKSPACE_ID" \
              -e NODE_ENV=production \
              "$REGISTRY/$IMAGE_NAME:latest"
            
            # Wait for container to start
            sleep 5
            
            # Verify container is running
            if docker ps | grep -q regulatoryupdates; then
              echo "Container started successfully"
            else
              echo "Container failed to start"
              docker logs regulatoryupdates
              exit 1
            fi
          ENDSSH
```

- [ ] **Step 8: Add deployment summary step**

Add to `.github/workflows/deploy.yml`:

```yaml
      - name: Deployment Summary
        run: |
          echo "## Deployment Successful! 🚀" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Application URL:** http://${{ secrets.EC2_HOST }}" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Image:** ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest" >> $GITHUB_STEP_SUMMARY
          echo "**Commit:** ${{ github.sha }}" >> $GITHUB_STEP_SUMMARY
```

- [ ] **Step 9: Commit workflow file**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat: add GitHub Actions workflow for EC2 deployment"
```

---

## Task 4: Update README with Deployment Instructions

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Read current README to find deployment section**

Run:
```bash
grep -n "## Deployment" README.md
```

Expected: Line number of existing deployment section (around line 177)

- [ ] **Step 2: Replace Vercel deployment section with EC2 instructions**

In `README.md`, replace the entire `## Deployment` section (starting at line 177) with:

```markdown
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
```

- [ ] **Step 3: Verify README formatting**

Run:
```bash
head -n 200 README.md | tail -n 50
```

Expected: Deployment section appears correctly formatted

- [ ] **Step 4: Commit README updates**

```bash
git add README.md
git commit -m "docs: update deployment section with EC2 Docker instructions"
```

---

## Task 5: Final Verification and Documentation

**Files:**
- None (verification only)

- [ ] **Step 1: Verify all files are committed**

Run:
```bash
git status
```

Expected: "nothing to commit, working tree clean"

- [ ] **Step 2: Verify file structure**

Run:
```bash
ls -la Dockerfile .dockerignore .github/workflows/deploy.yml
```

Expected: All three files exist

- [ ] **Step 3: Push to GitHub**

```bash
git push origin master
```

Expected: Successfully pushed 4 commits to master

- [ ] **Step 4: Document next steps in GitHub issue or project notes**

Create a checklist for manual setup (not automated):

```markdown
## Manual Setup Checklist (One-time)

Before first deployment:

- [ ] Create EC2 instance (t3.small, Amazon Linux 2023, us-east-1)
- [ ] Download SSH key pair (.pem file)
- [ ] Configure security group (ports 22, 80)
- [ ] Copy EC2 Public IPv4 DNS
- [ ] Add GitHub Secrets:
  - [ ] EC2_HOST
  - [ ] EC2_SSH_KEY
  - [ ] GCS_TOKEN
  - [ ] GCS_WORKSPACE_ID
- [ ] Trigger first deployment (push to master or manual trigger)
- [ ] Verify application accessible at http://ec2-dns
- [ ] Test Claude API integration works
```

- [ ] **Step 5: Final commit for documentation**

```bash
git add -A
git commit -m "docs: add manual setup checklist for EC2 deployment"
git push origin master
```

---

## Success Criteria

After completing all tasks:

✅ `Dockerfile` exists with multi-stage build (deps → builder → runner)  
✅ `.dockerignore` excludes unnecessary files from build context  
✅ `.github/workflows/deploy.yml` contains complete CI/CD pipeline  
✅ `README.md` updated with EC2 deployment instructions  
✅ All files committed and pushed to GitHub  
✅ Manual setup checklist documented  

**Ready for deployment after:**
- EC2 instance created manually
- GitHub Secrets configured
- First deployment triggered

---

## Post-Implementation Testing Plan

After deployment automation is set up:

**Test 1: Manual Deployment Trigger**
1. Go to GitHub Actions → Deploy to EC2 workflow
2. Click "Run workflow" → master
3. Verify: Workflow completes successfully
4. Verify: Application accessible at EC2 URL

**Test 2: Automatic Deployment on Push**
1. Make a small change (e.g., update README)
2. Commit and push to master
3. Verify: Workflow triggers automatically
4. Verify: Changes appear on live site

**Test 3: Credential Update**
1. Update `GCS_TOKEN` in GitHub Secrets
2. Trigger deployment
3. SSH into EC2: `docker logs regulatoryupdates`
4. Verify: Log shows successful GCS authentication

**Test 4: Container Restart Persistence**
1. SSH into EC2
2. Run: `docker restart regulatoryupdates`
3. Wait 30 seconds
4. Verify: Application still accessible

**Test 5: Docker Build Optimization**
1. Make small code change
2. Push to trigger build
3. Check Actions log for build time
4. Verify: Build uses cache (should be faster than first build)

---

## Estimated Implementation Time

- **Task 1 (Dockerfile):** 20 minutes
- **Task 2 (.dockerignore):** 5 minutes
- **Task 3 (GitHub Actions):** 45 minutes
- **Task 4 (README):** 15 minutes
- **Task 5 (Verification):** 10 minutes

**Total: ~1.5 hours**

Manual EC2 setup (not included): ~30 minutes

---

## Rollback Plan

If deployment fails or issues arise:

**Rollback to previous image:**
```bash
ssh -i key.pem ec2-user@ec2-dns
docker stop regulatoryupdates
docker rm regulatoryupdates
docker run -d --name regulatoryupdates --restart unless-stopped -p 80:3000 \
  -e GCS_TOKEN="..." -e GCS_WORKSPACE_ID="..." \
  ghcr.io/shwetastr/regulatoryupdates:PREVIOUS_SHA
```

**Remove deployment automation (revert to manual):**
```bash
git revert HEAD~4  # Reverts last 4 commits
git push origin master
```

**Emergency stop:**
```bash
ssh -i key.pem ec2-user@ec2-dns
docker stop regulatoryupdates
```

---

## Dependencies

**External:**
- AWS account with EC2 permissions
- GitHub repository access (admin for secrets)
- TR GCS token (for Claude API)

**Internal:**
- Next.js production build must succeed (`npm run build`)
- Port 3000 must be available in container
- Application must work with environment variables from process.env

**None of the implementation tasks have inter-task dependencies** - all can be completed sequentially without waiting for external resources.
