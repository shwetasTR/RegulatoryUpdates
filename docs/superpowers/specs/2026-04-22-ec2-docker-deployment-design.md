# EC2 Docker Deployment Design

**Date:** 2026-04-22  
**Project:** Regulatory Updates Dashboard  
**Author:** System Design (approved by user)

## Overview

Automated deployment pipeline using GitHub Actions to build a Docker image and deploy to an AWS EC2 instance. The solution provides a simple, cost-effective production deployment with a public URL for the Next.js regulatory compliance dashboard.

## Goals

1. Automatic deployment on push to master branch
2. Manual deployment trigger capability
3. Public URL accessible via EC2 DNS
4. Simple credential management for TR GCS Claude API
5. Cost-effective (~$15/month for t3.small instance)
6. Easy to maintain and troubleshoot

## Architecture

### High-Level Flow

```
Developer Push to Master
    ↓
GitHub Actions Triggered
    ↓
Build Docker Image
    ↓
Push to GitHub Container Registry (ghcr.io)
    ↓
SSH into EC2 Instance
    ↓
Pull Latest Image
    ↓
Restart Container with Environment Variables
    ↓
Application Running on Port 80
```

### Components

1. **GitHub Container Registry (ghcr.io)**
   - Stores Docker images
   - Free with GitHub
   - Tagged with `latest` and git commit SHA

2. **EC2 Instance**
   - Type: t3.small (2 vCPU, 2GB RAM)
   - Region: us-east-1
   - OS: Amazon Linux 2023
   - Persistent across deployments
   - Manually created (one-time setup)

3. **GitHub Actions Workflow**
   - Single job: build → push → deploy
   - Triggers: push to master, manual workflow_dispatch
   - Duration: ~3-4 minutes per deployment

4. **Docker Container**
   - Runs Next.js production server
   - Port mapping: 3000 (container) → 80 (host)
   - Environment variables from GitHub Secrets
   - Named: `regulatoryupdates`

## Deployment Approach

**Selected: SSH-Based Deployment**

Chosen over AWS SSM and pull-based approaches for:
- Simplicity and ease of understanding
- Direct control and immediate feedback
- Standard tooling (SSH) with extensive documentation
- Easy manual debugging

## Infrastructure Setup

### One-Time Manual Setup

**Step 1: Create EC2 Instance**

In AWS Console:
1. Navigate to EC2 → Launch Instance
2. Configuration:
   - Name: `RegulatoryUpdates`
   - AMI: Amazon Linux 2023
   - Instance type: t3.small
   - Key pair: Create new → Download `.pem` file
   - Network settings:
     - Allow SSH (port 22) from your IP
     - Allow HTTP (port 80) from anywhere (0.0.0.0/0)
3. Launch instance
4. Copy "Public IPv4 DNS" (format: `ec2-XX-XXX-XXX-XX.compute-1.amazonaws.com`)

**Step 2: Configure GitHub Secrets**

Navigate to `https://github.com/shwetasTR/RegulatoryUpdates/settings/secrets/actions`

Add the following secrets:

| Secret Name | Value | Purpose |
|------------|-------|---------|
| `EC2_HOST` | `ec2-XX-XXX-XXX-XX.compute-1.amazonaws.com` | Instance DNS |
| `EC2_SSH_KEY` | Contents of `.pem` file | SSH authentication |
| `GCS_TOKEN` | TR GCS token | Claude API authentication |
| `GCS_WORKSPACE_ID` | Workspace ID | Claude API workspace |
| `AWS_ACCESS_KEY_ID` | AWS access key | Future automation |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | Future automation |

**That's all!** No manual SSH or Docker installation required.

### Automated Setup (First Deployment)

GitHub Action automatically:
1. SSHs into EC2 instance
2. Checks if Docker is installed
3. If not: installs Docker and adds ec2-user to docker group
4. Enables Docker service to start on boot
5. Proceeds with deployment

## Docker Configuration

### Dockerfile Structure

**Multi-stage build for optimization:**

**Stage 1: Dependencies**
```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
```

**Stage 2: Builder**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
```

**Stage 3: Runner (Final Image)**
```dockerfile
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
CMD ["npm", "start"]
```

**Benefits:**
- Final image size: ~150MB (vs ~1GB without multi-stage)
- Only production dependencies included
- Build cache optimization for faster rebuilds
- Security: no build tools in final image

### Container Runtime

**Container creation command:**
```bash
docker run -d \
  --name regulatoryupdates \
  --restart unless-stopped \
  -p 80:3000 \
  -e GCS_TOKEN="$GCS_TOKEN" \
  -e GCS_WORKSPACE_ID="$GCS_WORKSPACE_ID" \
  -e NODE_ENV=production \
  ghcr.io/shwetastr/regulatoryupdates:latest
```

**Key settings:**
- `--restart unless-stopped`: Auto-restart on failure or reboot
- `-p 80:3000`: Map container port 3000 to host port 80
- Environment variables passed at runtime (not baked into image)

## GitHub Actions Workflow

### Workflow File: `.github/workflows/deploy.yml`

**Trigger conditions:**
```yaml
on:
  push:
    branches: [master]
  workflow_dispatch:
```

### Job: Build and Deploy

**Steps:**

1. **Checkout code**
   - Uses: `actions/checkout@v4`

2. **Set up Docker Buildx**
   - Uses: `docker/setup-buildx-action@v3`
   - Enables advanced build features and caching

3. **Login to GitHub Container Registry**
   - Uses: `docker/login-action@v3`
   - Token: `${{ secrets.GITHUB_TOKEN }}` (automatic)

4. **Build and push Docker image**
   - Uses: `docker/build-push-action@v5`
   - Tags: `latest` and `sha-${{ github.sha }}`
   - Cache: GitHub Actions cache for faster builds

5. **Setup SSH key**
   - Create temp SSH key file from `EC2_SSH_KEY` secret
   - Set correct permissions (chmod 600)
   - Configure SSH to skip host key checking (for automation)

6. **Install Docker on EC2 (if needed)**
   - SSH command checks for Docker
   - If not installed: runs installation script
   - Idempotent: safe to run multiple times

7. **Deploy to EC2**
   - Login to GitHub Container Registry from EC2
   - Pull latest image
   - Stop and remove old container (if exists)
   - Start new container with environment variables
   - Verify container is running

8. **Output deployment URL**
   - Display public URL in Actions summary
   - Format: `http://${{ secrets.EC2_HOST }}`

**Total execution time:**
- First deployment: ~5-7 minutes (includes Docker installation)
- Subsequent deployments: ~3-4 minutes

## Environment Variables & Credentials

### Storage: GitHub Secrets

All sensitive data stored in GitHub Secrets (encrypted at rest).

### Credential Flow

```
GitHub Secrets (encrypted storage)
    ↓
GitHub Actions Runner (in-memory, ephemeral)
    ↓
SSH Connection (encrypted tunnel)
    ↓
Docker Container Environment (process memory only)
    ↓
Application Runtime (process.env)
    ↓
TR GCS API Call (exchanges token for Anthropic key)
```

### Updating Claude Credentials

**Method 1: GitHub UI**
1. Navigate to: `https://github.com/shwetasTR/RegulatoryUpdates/settings/secrets/actions`
2. Click on `GCS_TOKEN`
3. Click "Update secret"
4. Enter new value → Save

**Method 2: GitHub CLI**
```bash
gh secret set GCS_TOKEN --body "new_token_value"
gh secret set GCS_WORKSPACE_ID --body "new_workspace_id"
```

**Applying changes:**
After updating secrets, trigger deployment:
- **Automatic:** Push any change to master branch
- **Manual:** Actions tab → "Deploy to EC2" → "Run workflow"

New container starts with updated credentials automatically.

### Security Considerations

- Secrets never appear in logs (GitHub Actions auto-masks)
- Credentials not stored on EC2 filesystem
- Only exist in running container memory
- Container restart = fresh credentials from GitHub
- SSH key only accessible to GitHub Actions runner
- No hardcoded secrets in code or Dockerfile

## Deployment Flow

### First Deployment

1. **Developer pushes to master** (or triggers manual run)
2. **GitHub Actions starts** (~10 seconds)
3. **Build phase** (~2-3 minutes):
   - Installs dependencies
   - Builds Next.js production bundle
   - Creates Docker image
   - Pushes to `ghcr.io/shwetastr/regulatoryupdates:latest`
4. **Setup phase** (~30 seconds):
   - Configures SSH connection
   - Connects to EC2 instance
5. **Installation phase** (~2 minutes, first time only):
   - Installs Docker on EC2
   - Configures Docker service
6. **Deploy phase** (~1-2 minutes):
   - Pulls Docker image
   - Starts container with environment variables
7. **Verification** (~10 seconds):
   - Confirms container is running
   - Outputs public URL

**Total: ~6-8 minutes**

### Subsequent Deployments

1. **Developer pushes to master**
2. **Build phase** (~2-3 minutes)
3. **Deploy phase** (~1 minute):
   - Pulls new image
   - Stops old container
   - Starts new container
   - **Downtime: ~5-10 seconds** (stop → start gap)
4. **Verification** (~10 seconds)

**Total: ~3-4 minutes**

### Zero-Downtime Consideration

Current approach has brief downtime (~5-10 seconds) during container swap.

**Future enhancement (if needed):**
- Use nginx reverse proxy
- Blue-green deployment (two containers)
- Health check before traffic switch
- Adds complexity; defer unless required

## Accessing the Application

### Public URL

After deployment completes:

**Format:** `http://ec2-XX-XXX-XXX-XX.compute-1.amazonaws.com`

**Where to find:**
1. GitHub Actions log output (end of deployment)
2. AWS Console → EC2 → Instances → Public IPv4 DNS
3. GitHub Secret `EC2_HOST` value

**URL stability:**
- Remains constant across deployments
- Changes only if instance is stopped/restarted
- Use Elastic IP for permanent URL (extra $3.60/month if instance is stopped)

### HTTPS / SSL

**Current:** HTTP only (no SSL certificate)

**Future options:**
1. **Let's Encrypt with Certbot**
   - Free SSL certificate
   - Requires domain name (not EC2 DNS)
   - Auto-renewal via cron

2. **AWS Application Load Balancer**
   - Provides HTTPS termination
   - ~$16/month additional cost
   - Includes SSL certificate via ACM

3. **CloudFlare Free Tier**
   - Free SSL for custom domain
   - DNS + CDN + SSL
   - Easiest if you have a domain

**Recommendation:** Add HTTPS when custom domain is ready.

## Maintenance & Troubleshooting

### Common Operations

**View container logs:**
```bash
ssh -i your-key.pem ec2-user@$EC2_HOST
docker logs regulatoryupdates
docker logs -f regulatoryupdates  # follow live
```

**Restart container manually:**
```bash
ssh -i your-key.pem ec2-user@$EC2_HOST
docker restart regulatoryupdates
```

**Check container status:**
```bash
docker ps
docker ps -a  # include stopped containers
```

**Check resource usage:**
```bash
docker stats regulatoryupdates
```

**Force update without code change:**
```bash
# Trigger manual deployment from GitHub Actions UI
# Or push an empty commit:
git commit --allow-empty -m "Trigger deployment"
git push
```

### Troubleshooting Guide

**Problem: Deployment fails with "Permission denied"**
- **Cause:** SSH key incorrect or permissions wrong
- **Fix:** Verify `EC2_SSH_KEY` secret contains full private key including `-----BEGIN/END-----` lines

**Problem: Container not accessible**
- **Check 1:** Security group allows port 80 from 0.0.0.0/0
- **Check 2:** Container is running: `docker ps`
- **Check 3:** Port mapping correct: `docker port regulatoryupdates`

**Problem: Application shows errors**
- **Check logs:** `docker logs regulatoryupdates`
- **Verify env vars:** `docker inspect regulatoryupdates | grep -A 10 Env`
- **Check Claude API:** Logs should show `[GCS Auth] ✓ Successfully obtained Anthropic API key`

**Problem: Build fails**
- **Check Node.js version:** Dockerfile uses node:20-alpine
- **Check dependencies:** Look for npm errors in Actions log
- **Clear cache:** Re-run workflow

**Problem: Old container not stopping**
- **Manual cleanup:**
  ```bash
  docker stop regulatoryupdates
  docker rm regulatoryupdates
  # Then trigger deployment again
  ```

### Cost Management

**EC2 Instance (t3.small):**
- Running 24/7: ~$15/month
- Stopped: $0/month (only EBS storage: ~$0.80/month)

**To stop instance temporarily:**
1. AWS Console → EC2 → Stop instance
2. **Note:** Public DNS changes when restarted
3. Update `EC2_HOST` secret with new DNS

**To save costs:**
- Use t3.micro instead (~$7.50/month) if performance sufficient
- Stop instance during off-hours (requires DNS update on restart)
- Use Lambda + Fargate for pay-per-use (more complex)

### Monitoring

**Basic health check:**
```bash
curl http://$EC2_HOST/api/health
# Expected: {"status":"ok","timestamp":"...","service":"regulatory-intelligence-dashboard"}
```

**Future enhancements:**
- CloudWatch metrics (CPU, memory, network)
- CloudWatch Logs for container logs
- Uptime monitoring (UptimeRobot, Pingdom)
- GitHub Actions status badge in README

## Future Enhancements

### Short-term (1-2 sprints)
1. **Health check endpoint monitoring** - Verify deployment success
2. **Rollback capability** - Deploy previous image SHA on failure
3. **Staging environment** - Separate EC2 instance for testing

### Medium-term (3-6 months)
1. **HTTPS with custom domain** - Let's Encrypt or ALB
2. **Automated backups** - EBS snapshots or database backups if added
3. **Auto-scaling** - Multiple instances behind load balancer
4. **Zero-downtime deployments** - Blue-green or rolling updates

### Long-term (6+ months)
1. **Infrastructure as Code** - Terraform or CloudFormation
2. **Container orchestration** - ECS or Kubernetes for multi-service apps
3. **CI/CD improvements** - Test automation, security scanning, preview environments

## Assumptions & Constraints

### Assumptions
- User has AWS account with EC2 access
- User has GitHub repository admin access
- TR GCS platform remains accessible for Claude API
- Single-instance deployment sufficient (no high availability requirement)
- HTTP acceptable initially (HTTPS added later)

### Constraints
- Manual EC2 instance creation (not automated in workflow)
- Brief downtime during deployments (~5-10 seconds)
- Fixed instance size (no auto-scaling)
- US East region only (no multi-region)
- GitHub Container Registry (not ECR or private registry)

### Technical Requirements
- Node.js 20+ in Docker image
- Next.js 16.2.4 production build
- Amazon Linux 2023 on EC2
- GitHub Actions runner: ubuntu-latest
- SSH access required for deployment

## Success Criteria

✅ **Deployment completes in under 5 minutes** (subsequent deployments)  
✅ **Application accessible via public HTTP URL**  
✅ **Claude API credentials work (GCS token exchange successful)**  
✅ **Manual deployment trigger works from GitHub Actions UI**  
✅ **Automatic deployment on push to master**  
✅ **Container restarts automatically after EC2 reboot**  
✅ **Easy credential updates via GitHub Secrets**  
✅ **Clear troubleshooting documentation**

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| EC2 instance failure | High - app unavailable | Auto-restart policy, can recreate from workflow |
| SSH key compromised | High - unauthorized access | Rotate key, restrict security group to known IPs |
| GitHub Secrets exposed | Critical - credential leak | GitHub encrypts secrets, limit repo access |
| Docker image vulnerability | Medium - security risk | Regular base image updates, security scanning |
| Cost overrun | Low - predictable costs | Fixed instance size, monitoring alerts |
| Deployment failure | Medium - downtime | Rollback capability, keep previous container |

## Appendix

### File Changes Required

**New files to create:**
1. `Dockerfile` - Multi-stage Docker build
2. `.github/workflows/deploy.yml` - GitHub Actions workflow
3. `.dockerignore` - Exclude unnecessary files from image

**Files to update:**
1. `README.md` - Add deployment instructions
2. `.gitignore` - Ensure `.env` files ignored

### Estimated Implementation Time

- **Dockerfile creation:** 30 minutes
- **GitHub Actions workflow:** 1-2 hours
- **Testing and debugging:** 1-2 hours
- **Documentation updates:** 30 minutes

**Total: 3-5 hours**

### Related Documentation

- [Next.js Docker Deployment](https://nextjs.org/docs/app/building-your-application/deploying#docker-image)
- [GitHub Actions Docker](https://docs.github.com/en/actions/publishing-packages/publishing-docker-images)
- [AWS EC2 Getting Started](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EC2_GetStarted.html)
- [Docker Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
