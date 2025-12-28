# Deployment Guide: IR-Bot

A comprehensive guide to deploying the IR-Bot incident response system in production environments.

---

## Table of Contents

1. [Pre-Deployment Requirements](#pre-deployment-requirements)
2. [System Architecture](#system-architecture)
3. [Installation & Setup](#installation--setup)
4. [Configuration](#configuration)
5. [Running the Services](#running-the-services)
6. [Slack Integration Setup](#slack-integration-setup)
7. [Network Tunneling](#network-tunneling)
8. [Verification & Testing](#verification--testing)
9. [Production Deployment](#production-deployment)
10. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Pre-Deployment Requirements

### Hardware Requirements

- **Minimum:** 2GB RAM, 2-core processor, 10GB disk space
- **Recommended:** 4GB+ RAM, 4-core processor, 25GB SSD

### Software Requirements

- **Node.js** v16.0.0 or later
- **npm** v7.0.0 or later
- **PowerShell** v5.0+ (for Windows hosts - required for script execution)
- **Bash** (for Linux/Mac hosts)
- **Git** for cloning the repository

### Network Requirements

- Internet connectivity for Slack API communication
- Firewall rules allowing outbound HTTPS (port 443)
- Port 3000 (backend) and 3001 (Slack bot) available locally
- ngrok or similar tunnel for webhook URL (non-production)

### Slack Workspace Permissions

- Admin access to create/configure Slack apps
- Permission to install apps in your workspace
- Access to create bot tokens with appropriate scopes

---

## System Architecture

The IR-Bot system consists of three main components working together:

```
┌─────────────────┐
│   Slack Users   │
└────────┬────────┘
         │ (Messages in Slack channels)
         │
┌────────▼────────────────────┐
│   Slack Bot (@slack/bolt)   │
│   Port 3001 (Express)       │
│   - Receives user commands  │
│   - Parses text input       │
│   - Calls backend API       │
└────────┬────────────────────┘
         │ (HTTP POST /command)
         │
┌────────▼────────────────────┐
│   Backend Service (Express) │
│   Port 3000                 │
│   - RBAC validation         │
│   - Command parsing         │
│   - Script execution        │
│   - Audit logging           │
└────────┬────────────────────┘
         │ (Spawns PowerShell)
         │
┌────────▼────────────────────┐
│   PowerShell Scripts        │
│   /scripts directory        │
│   - Check-Status.ps1        │
│   - Collect-Logs.ps1        │
│   - Quarantine-Host.ps1     │
│   - Remediation-Report.ps1  │
└─────────────────────────────┘
```

---

## Installation & Setup

### Step 1: Clone Repository

```bash
git clone https://github.com/nishant-kumarr/IR-Playbook-Bot.git
cd IR-Playbook-Bot
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs all required Node.js packages including Express, @slack/bolt, dotenv, and child_process.

### Step 3: Verify Installation

```bash
npm list
```

Confirm that dependencies are properly installed with no critical errors.

### Step 4: Verify Directory Structure

Ensure your project has:

```
IR-Playbook-Bot/
├── index.js              (Backend service)
├── slack-bot.js          (Slack bot)
├── scripts/              (PowerShell scripts directory)
│   ├── Check-Status.ps1
│   ├── Collect-Logs.ps1
│   ├── Quarantine-Host.ps1
│   └── Remediation-Report.ps1
├── logs/                 (Will be created automatically)
├── .env                  (Configuration file - you create this)
└── package.json
```

---

## Configuration

### Step 1: Create Environment File

Create a `.env` file in the project root directory:

```bash
touch .env
```

### Step 2: Configure Backend Service

Set these variables in `.env`:

- `PORT` – Backend service port (default: 3000)
- `NODE_ENV` – Environment name (`development` or `production`)
- `LOG_LEVEL` – Logging verbosity (`info`, `debug`, `error`)

**Example:**

```
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug
```

### Step 3: Configure Slack Integration

Set these variables in `.env`:

- `SLACK_BOT_TOKEN` – From Slack app (Bot User OAuth Token, starts with `xoxb-`)
- `SLACK_SIGNING_SECRET` – From Slack app (Signing Secret)
- `PORT` – Slack bot service port (default: 3001, used by @slack/bolt)

**Example:**

```
SLACK_BOT_TOKEN=xoxb-your-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here
PORT=3001
```

### Step 4: Configure RBAC (Role-Based Access Control)

Edit `index.js` to define user IDs and their roles:

```javascript
const USER_ROLES = {
  alice: ROLES.VIEWER,
  bob: ROLES.ANALYST,
  charlie: ROLES.RESPONDER,
  "U0A5U1UJZ9A": ROLES.ANALYST,  // Slack user ID
};
```

**Role Hierarchy (from least to most privileged):**

| Role | Capabilities | Actions Allowed |
|------|--------------|-----------------|
| VIEWER | Read-only access | `check status` |
| ANALYST | Investigation & reporting | `check status`, `collect logs`, `remediation report` |
| RESPONDER | Full incident response | All actions including `quarantine host` |

See the GitHub repository for detailed RBAC configuration.

---

## Running the Services

### Development Mode (Local Testing - 3 Terminal Windows)

**Terminal 1 – Backend Service:**

```bash
node index.js
```

Expected output:
```
IR Bot HTTP server running on port 3000
```

**Terminal 2 – Slack Bot:**

```bash
node slack-bot.js
```

Expected output:
```
⚡ IR-Bot Slack app running on port 3001
```

**Terminal 3 – Network Tunnel:**

```bash
ngrok http 3001
```

You'll see:
```
Forwarding: https://abc123.ngrok.io -> http://localhost:3001
```

Copy the forwarding URL for use in Slack configuration.

### Production Mode

Use a process manager like PM2 for reliability:

```bash
npm install -g pm2
pm2 start index.js --name "ir-bot-backend"
pm2 start slack-bot.js --name "ir-bot-slack"
pm2 save
pm2 startup
```

---

## Slack Integration Setup

### Step 1: Create Slack App

1. Go to [Slack API Dashboard](https://api.slack.com/apps)
2. Click **Create New App** → **From scratch**
3. Name it `IR-Bot` and select your workspace
4. Click **Create App**

### Step 2: Enable Event Subscriptions

1. Navigate to **Event Subscriptions** (left sidebar)
2. Toggle **Enable Events** to ON
3. Set Request URL to: `https://your-ngrok-url.ngrok.io/slack/events` (replace with your actual ngrok URL)
4. Subscribe to these bot events:
   - `message.channels` (messages in channels)
   - `app_mention` (when bot is mentioned)
5. Click **Save Changes**

### Step 3: Create Bot User Token

1. Go to **OAuth & Permissions** (left sidebar)
2. Scroll to **Bot Token Scopes**
3. Add these scopes:
   - `chat:write` (send messages)
   - `commands` (respond to commands)
   - `app_mentions:read` (read mentions)
4. Click **Install to Workspace** (if not already done)
5. Copy **Bot User OAuth Token** (starts with `xoxb-`) to `.env` as `SLACK_BOT_TOKEN`

### Step 4: Find Signing Secret

1. Go to **Basic Information** (left sidebar)
2. Scroll to **App Credentials**
3. Copy **Signing Secret** to `.env` as `SLACK_SIGNING_SECRET`

### Step 5: Invite Bot to Channels

1. In your Slack workspace, go to #incident-response channel (or whichever channel you want)
2. Type `/invite @IR-Bot`
3. Bot is now active in that channel

---

## Network Tunneling

### Using ngrok (Development - Recommended for Testing)

1. **Download ngrok** from [ngrok.com](https://ngrok.com)
2. **Create account and get auth token**
3. **Authenticate:**
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```
4. **Start tunnel:**
   ```bash
   ngrok http 3001
   ```
5. **Copy the Forwarding URL** (e.g., `https://abc123.ngrok.io`)
6. **Update Slack Event Subscriptions Request URL** with this URL + `/slack/events`

### Using Cloudflare Tunnel (Production - Better Stability)

For production deployments with better uptime:

```bash
# Install cloudflared
brew install cloudflare/cloudflare/cloudflared  # macOS
# or download from https://github.com/cloudflare/cloudflared

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create ir-bot

# Route DNS
cloudflared tunnel route dns ir-bot your-domain.com

# Run tunnel
cloudflared tunnel run ir-bot
```

### Using AWS API Gateway (Enterprise)

For large-scale deployments:

- Create API Gateway endpoints
- Map to EC2/ECS instances running the bot
- Configure WAF and rate limiting
- Use CloudFront for CDN caching

---

## Verification & Testing

### Health Checks

**Backend Health:**
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"ok","service":"ir-bot"}
```

**Slack Bot Health:**
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{"ok":true}
```

### Command Testing in Slack

1. Navigate to your Slack workspace
2. Go to #incident-response channel (or any channel where bot is invited)
3. Send a test command:
   ```
   @IR-Bot check status test-host
   ```
4. Verify response appears within 2-3 seconds with proper formatting

### Permission Testing

1. **As RESPONDER role:** Try quarantine command (should succeed)
   ```
   @IR-Bot quarantine host test-host
   ```

2. **As VIEWER role:** Try quarantine command (should fail with auth error)
   ```
   @IR-Bot quarantine host test-host
   ```

3. **Check audit log** for both attempts to verify RBAC is working

### Log Review

```bash
tail -f logs/ir-bot.log
```

Verify JSON log entries contain:
- `timestamp` – ISO 8601 format
- `userId` – Slack user ID
- `command` – User's input
- `action` – Parsed action
- `host` – Target host
- `allowed` – Whether RBAC permitted it
- `success` – Whether execution succeeded

---

## Production Deployment

### Step 1: Environment Setup

- Deploy on **dedicated server** or **container** (Docker/Kubernetes)
- Use **managed databases** for configuration and logs (not local files)
- Enable **TLS/SSL** for all communications (HTTPS only)
- Configure **firewall rules** and **security groups** appropriately
- Use **environment variables** for all secrets (never commit `.env`)

### Step 2: High Availability

- Run **multiple bot instances** behind a load balancer
- Use **persistent storage** for audit logs (Amazon S3, RDS, etc.)
- Implement **health checks** and **auto-restart** mechanisms
- Set up **monitoring and alerting** for failures

### Step 3: Security Hardening

- **Rotate Slack tokens** every 90 days
- Use **secrets manager** (AWS Secrets Manager, HashiCorp Vault)
- Implement **rate limiting** on API endpoints (protect against DoS)
- Enable **VPC isolation** and **network policies**
- Implement **IP whitelisting** for internal endpoints

### Step 4: Credential Management

- **Never commit** `.env` files to git
- Use `.gitignore` to exclude sensitive files
- Implement **CI/CD secret injection** (GitHub Actions, GitLab CI)
- **Audit all credential access** regularly
- Use **separate tokens** for development vs. production

### Step 5: Database Setup

If scaling beyond local file storage (audit logs):

- Configure **PostgreSQL** or **MongoDB** for log storage
- Set up **automated backups** (daily minimum)
- Implement **data retention policies** (comply with regulations)
- Configure **replication** for disaster recovery
- Enable **encryption at rest** and **in transit**

---

## Monitoring & Maintenance

### Logging

- **Location:** `logs/ir-bot.log`
- **Format:** JSON (one entry per line)
- **Retention:** Archive after 30 days
- **Analysis:** Feed into SIEM systems (Splunk, ELK Stack, etc.)

### Metrics to Monitor

| Metric | Target | Alert If |
|--------|--------|----------|
| Bot responsiveness | <2s avg | >5s response time |
| Error rate | <1% | >5% failures |
| Auth failures | Track | >10 in 1 hour |
| Uptime | >99% | <95% |
| Log disk usage | <1GB/day | >5GB usage |

### Regular Maintenance Tasks

| Task | Frequency | Purpose |
|------|-----------|---------|
| Log rotation | Daily | Prevent disk fill-up |
| Token rotation | Monthly | Security best practice |
| RBAC audit | Quarterly | Verify permissions match org structure |
| Dependency updates | Monthly | Security patches |
| Disaster recovery test | Quarterly | Ensure backup/restore works |
| Security audit | Bi-annually | Identify vulnerabilities |

### Troubleshooting Common Issues

**Bot not responding to commands:**
- Verify ngrok/Cloudflare tunnel is active and URL matches Slack config
- Check firewall rules on port 3001
- Review Slack workspace logs for bot errors
- Verify SLACK_BOT_TOKEN is correct and not expired

**RBAC failures (unauthorized errors):**
- Verify Slack user ID is correct in `USER_ROLES` object
- Check role hierarchy in `ROLE_ORDER` array
- Review audit log (`logs/ir-bot.log`) for permission details
- Confirm user has correct role assigned

**Performance degradation:**
- Check CPU and memory usage on server
- Analyze slow query logs (if using database)
- Review concurrent connections to backend
- Check if log file has grown too large (rotate if >500MB)

**Scripts not executing:**
- Verify PowerShell scripts exist in `/scripts/` directory
- Check PowerShell execution policy: `Get-ExecutionPolicy`
- Ensure Windows permissions allow script execution
- Review PowerShell error logs for detailed failures

### Getting Help

- **GitHub Issues:** https://github.com/nishant-kumarr/IR-Playbook-Bot/issues
- **Repository README:** Full documentation and examples
- **Service Logs:** Check `logs/ir-bot.log` for detailed error messages
- **Debug Mode:** Enable with `LOG_LEVEL=debug` in `.env`

---

## Next Steps

1. **Complete initial deployment** using this guide
2. **Run demo scenario** from the demo script to verify functionality
3. **Train security team** on bot commands and incident response workflows
4. **Integrate with SIEM** for centralized log aggregation
5. **Establish runbooks** and playbooks for common incident scenarios
6. **Plan scaling** for multi-region or multi-team deployment

---

**Version:** 1.0  
**Last Updated:** December 2025  
**Repository:** https://github.com/nishant-kumarr/IR-Playbook-Bot  
**Framework:** Node.js, Express, @slack/bolt  
**Scripts:** PowerShell 5.0+