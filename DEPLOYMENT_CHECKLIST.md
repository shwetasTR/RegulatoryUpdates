# Manual Setup Checklist for EC2 Deployment

This checklist covers the one-time manual setup required before the first automated deployment.

## Prerequisites

- AWS Account with EC2 access
- GitHub repository with admin access (to add secrets)
- Terminal/SSH client
- Text editor

---

## Deployment Setup Checklist

### Step 1: AWS EC2 Instance Creation

- [ ] Go to AWS Console → EC2 → Launch Instance
- [ ] Set instance name: `RegulatoryUpdates`
- [ ] Select AMI: **Amazon Linux 2023**
- [ ] Select instance type: **t3.small**
- [ ] Create or select key pair (download the `.pem` file)
- [ ] Configure security group:
  - [ ] Allow SSH (port 22) from your IP
  - [ ] Allow HTTP (port 80) from anywhere (0.0.0.0/0)
- [ ] Launch instance
- [ ] Wait for instance to reach "running" state
- [ ] Copy the **Public IPv4 DNS** (format: `ec2-XX-XXX-XXX-XX.compute-1.amazonaws.com`)

### Step 2: GitHub Secrets Configuration

Navigate to: `https://github.com/YOUR_USERNAME/RegulatoryUpdates/settings/secrets/actions`

Add the following secrets:

- [ ] **EC2_HOST**
  - Value: Your EC2 Public IPv4 DNS (from Step 1)
  - Example: `ec2-54-123-45-67.compute-1.amazonaws.com`

- [ ] **EC2_SSH_KEY**
  - Value: Complete contents of your `.pem` file (include `-----BEGIN/END-----` lines)
  - How to get: Open the `.pem` file in a text editor, copy all contents

- [ ] **GCS_TOKEN**
  - Value: Your TR GCS authentication token
  - How to get: From TR GCS platform account settings

- [ ] **GCS_WORKSPACE_ID**
  - Value: Your TR GCS workspace ID
  - How to get: From TR GCS platform account settings

### Step 3: SSH Key File Setup (Local)

- [ ] Ensure `.pem` file is saved locally
- [ ] Set proper permissions:
  ```bash
  chmod 600 /path/to/your/key.pem
  ```
- [ ] Test SSH connection to EC2:
  ```bash
  ssh -i /path/to/your/key.pem ec2-user@your-ec2-dns
  ```
  (You should see the Linux terminal prompt)

### Step 4: Trigger First Deployment

Choose one method:

**Option A: Push to master (automatic)**
```bash
git push origin master
```

**Option B: Manual trigger in GitHub UI**
1. Go to repository → Actions tab
2. Find "Deploy to EC2" workflow
3. Click "Run workflow"
4. Select master branch
5. Click "Run workflow"

- [ ] Deployment workflow started

### Step 5: Monitor First Deployment

- [ ] Go to GitHub Actions tab
- [ ] Click on the running "Deploy to EC2" workflow
- [ ] Monitor progress in real-time
- [ ] First deployment typically takes **6-8 minutes** (includes Docker installation)
  - Building Docker image: ~2-3 minutes
  - Uploading to EC2: ~1 minute
  - Pulling and running container: ~2-3 minutes

### Step 6: Verify Deployment Success

- [ ] Workflow shows green checkmark (completed successfully)
- [ ] Check application is accessible:
  ```bash
  curl http://your-ec2-dns.compute-1.amazonaws.com
  # Or open in browser: http://your-ec2-dns.compute-1.amazonaws.com
  ```
- [ ] Application loads and displays the regulatory intelligence dashboard

### Step 7: Verify Claude API Integration

- [ ] Access the application at `http://your-ec2-dns`
- [ ] Check that data is loading from Claude API (not just fallback)
- [ ] Monitor first few requests in GitHub Actions logs
- [ ] Container logs show successful API calls

---

## Troubleshooting

### Deployment Failed

1. Check GitHub Actions logs for error message
2. Common issues:
   - **SSH permission denied**: Verify `EC2_SSH_KEY` includes full file content with `-----BEGIN/END-----`
   - **Host unreachable**: Confirm `EC2_HOST` is correct and instance is running
   - **Docker pull failed**: Check internet connectivity on EC2, retry deployment

### Application Not Accessible

1. Verify security group allows HTTP (port 80)
2. Check if container is running:
   ```bash
   ssh -i your-key.pem ec2-user@your-ec2-dns
   docker ps
   ```
3. View container logs:
   ```bash
   docker logs regulatoryupdates
   ```

### Claude API Not Working

1. Verify `GCS_TOKEN` and `GCS_WORKSPACE_ID` are correct
2. Check if token has expired
3. View container logs for authentication errors:
   ```bash
   docker logs -f regulatoryupdates | grep -i "error\|auth\|gcs"
   ```

---

## Cost Monitoring

- [ ] Set up AWS billing alerts (optional)
- [ ] Monitor cost estimates:
  - EC2 t3.small: ~$15/month (24/7 running)
  - Data transfer: Usually <$1/month
  - Total: ~$16/month

To reduce costs:
- Stop instance when not in use (requires DNS update on restart)
- Use t3.micro instead (~$7.50/month, less memory)

---

## Post-Deployment

After successful verification:

1. **Update Credentials**
   - If credentials need to be changed, update via GitHub Secrets
   - Trigger a new deployment to apply changes

2. **View Logs**
   ```bash
   ssh -i your-key.pem ec2-user@your-ec2-dns
   docker logs -f regulatoryupdates
   ```

3. **Restart Container** (if needed)
   ```bash
   docker restart regulatoryupdates
   ```

4. **Stop Instance** (when done)
   - AWS Console → Instances → Select instance → Instance State → Stop
   - Note: Public DNS may change on restart

---

## References

- Full deployment guide: See README.md "Deployment" section
- GitHub Actions workflow: `.github/workflows/deploy.yml`
- Application repository: [RegulatoryUpdates](https://github.com/your-username/RegulatoryUpdates)
