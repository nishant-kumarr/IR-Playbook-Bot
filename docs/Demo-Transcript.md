<h1 align="center"> Demo Transcript : IR Playbook Bot </h1>

<br>
Walkthrough demonstrating IR-Bot incident response workflows.

---

## Overview

This document provides a structured demo script for showcasing IR-Bot capabilities : centralized incident response in Slack, RBAC enforcement, and complete audit trails. The demo simulates a real incident scenario : suspicious login activity on workstation HR-LAPTOP-22 requiring investigation and containment.

**Duration:** 7-10 minutes  
**Audience:** Security teams, incident responders, compliance auditors  
**Setup Required:** Backend (port 3000), Slack bot (port 3001), ngrok tunnel, two Slack user accounts with different roles  

---

## Pre-Demo Setup

### Prerequisites

- All three services running (backend, Slack bot, ngrok)
- Two Slack accounts: Account A (RESPONDER role), Account B (VIEWER role)
- Target channel: #incident-response (bot invited)
- File explorer ready to show saved artifacts

### Verification

```bash
# Terminal 1: Backend health
curl http://localhost:3000/health
# Expected: {"status":"ok","service":"ir-bot"}

# Terminal 2: Slack bot health
curl http://localhost:3001/health
# Expected: {"ok":true}

# Terminal 3: ngrok tunnel active
# Expected: Forwarding URL displayed (https://xxxx.ngrok.io)
```

---

## Scene 1: Initial Status Check

**Context:** SOC detected suspicious login attempts on HR-LAPTOP-22. Incident responder begins investigation.

### Command

**Sarah (Account A - RESPONDER role) types in #incident-response:**

```
@IR-Bot check status HR-LAPTOP-22
```

### Response

```
IR action completed.
Action: check status
Host: HR-LAPTOP-22
Status: Success

Check-Status.ps1: Host HR-LAPTOP-22 status = Not quarantined
```

### Key Points

- Command executed successfully (user has VIEWER+ role for this action)
- Host is reachable and accessible
- Status baseline established before intervention
- Response includes exact script name and execution details

---

## Scene 2: Collect Evidence

**Context:** Establish whether host compromise occurred by gathering security logs.

### Command

**Sarah types:**

```
@IR-Bot collect logs HR-LAPTOP-22
```

### Response

```
IR action completed.
Action: collect logs
Host: HR-LAPTOP-22
Status: Success

Collect-Logs.ps1: Collected 3 log files for HR-LAPTOP-22 into C:\Users\ASCII\Desktop\IR-Bot\CollectedLogs\HR-LAPTOP-22
[2025-12-27 19:20:45] [Application] [HR-LAPTOP-22] User=demo\analyst Action=LOGIN_SUCCESS SrcIP=10.0.0.5
```

### File Explorer Demo (Optional)

Navigate to: `C:\Users\ASCII\Desktop\IR-Bot\CollectedLogs\HR-LAPTOP-22\`

Show three log files:
- `security.log` – Windows security events
- `application.log` – Application events  
- `system.log` – System events

### Key Points

- Logs collected in seconds, not hours
- Exact path provided for forensic review
- Sample log line shows real event format
- Multiple log types collected automatically
- Action logged with timestamp for audit trail

---

## Scene 3: Containment Action

**Context:** Analysis confirms compromise threat. Responder initiates quarantine to prevent lateral movement.

### Command

**Sarah types:**

```
@IR-Bot quarantine host HR-LAPTOP-22
```

### Response

```
IR action completed.
Action: quarantine host
Host: HR-LAPTOP-22
Status: Success

Quarantine-Host.ps1: Host HR-LAPTOP-22 recorded as QUARANTINED in IR-Bot state file C:\Users\ASCII\Desktop\IR-Bot\QuarantineState\HR-LAPTOP-22.quarantined.txt
Tail: Action taken (demo); - Host QUARANTINED.; .
```

### Key Points

- **Requires RESPONDER role** – Lower-privileged users cannot execute
- Creates quarantine state file (in production: network isolation)
- Response confirms action completion with file path
- State persists for verification and recovery

---

## Scene 4: Verify Containment

**Context:** Confirm quarantine was successful before proceeding with forensics.

### Command

**Sarah types (same as Scene 1):**

```
@IR-Bot check status HR-LAPTOP-22
```

### Response

```
IR action completed.
Action: check status
Host: HR-LAPTOP-22
Status: Success

Check-Status.ps1: Host HR-LAPTOP-22 status = Quarantined
```

### Key Points

- Status changed from "Not quarantined" to "Quarantined"
- Confirms state persistence
- No separate verification system needed
- Single source of truth for host state

---

## Scene 5: Generate Report

**Context:** Create formal incident documentation for compliance and root cause analysis.

### Command

**Sarah types:**

```
@IR-Bot remediation report HR-LAPTOP-22
```

### Response

```
IR action completed.
Action: remediation report
Host: HR-LAPTOP-22
Status: Success

Remediation-Report.ps1: Created remediation report for HR-LAPTOP-22 at C:\Users\ASCII\Desktop\IR-Bot\Reports\RemediationReport-HR-LAPTOP-22-20251227-192456.txt
--- Report ---
Remediation Report
Host: HR-LAPTOP-22
Generated: 2025-12-27T19:24:56.4308847+05:30

- Logs collected (simulated).
- Quarantine state checked.
- No destructive actions performed (demo).
```

### File Explorer Demo (Optional)

Navigate to: `C:\Users\ASCII\Desktop\IR-Bot\Reports\`

Show timestamped report file with format: `RemediationReport-[HOST]-[TIMESTAMP].txt`

Open file to display content in Notepad.

### Key Points

- Automated report generation (no manual documentation)
- Unique timestamp in filename (prevents overwrites)
- Includes all relevant incident data
- Compliance-ready format
- Can be exported to ticketing systems

---

## Scene 6: RBAC Denial (Authorization Failure)

**Context:** Demonstrate security controls preventing unauthorized actions.

### Setup

**Jeff (Account B - VIEWER role) attempts privileged action in #incident-response:**

```
@IR-Bot quarantine host HR-LAPTOP-22
```

### Response

```
IR action failed.
Action: n/a
Host: n/a
Status: Error

Not authorized for this action
```

### Key Points

- **VIEWER role lacks RESPONDER permission**
- Request rejected at backend (not Slack-level)
- No partial execution or workarounds possible
- Failed attempt logged for audit purposes
- Clear error message to user

---

## Scene 7: Audit Log Review

**Context:** Demonstrate complete action history for compliance and forensic review.

### Log Location

```bash
cat logs/ir-bot.log
```

### Sample Entries

```json
{"timestamp":"2025-12-27T19:20:45.000Z","userId":"U0A5U1UJZ9A","command":"check status HR-LAPTOP-22","action":"check status","host":"HR-LAPTOP-22","allowed":true,"reason":"OK","success":true}
{"timestamp":"2025-12-27T19:20:50.000Z","userId":"U0A5U1UJZ9A","command":"collect logs HR-LAPTOP-22","action":"collect logs","host":"HR-LAPTOP-22","allowed":true,"reason":"OK","success":true}
{"timestamp":"2025-12-27T19:21:10.000Z","userId":"U0A5U1UJZ9A","command":"quarantine host HR-LAPTOP-22","action":"quarantine host","host":"HR-LAPTOP-22","allowed":true,"reason":"OK","success":true}
{"timestamp":"2025-12-27T19:21:45.000Z","userId":"U0A5U1UJZ9A","command":"remediation report HR-LAPTOP-22","action":"remediation report","host":"HR-LAPTOP-22","allowed":true,"reason":"OK","success":true}
{"timestamp":"2025-12-27T19:22:10.000Z","userId":"U_JEFF_ID","command":"quarantine host HR-LAPTOP-22","action":"quarantine host","host":"HR-LAPTOP-22","allowed":false,"reason":"Insufficient role (have=viewer, need=responder)","success":false}
```

### Audit Fields Explained

| Field | Purpose |
|-------|---------|
| `timestamp` | ISO 8601 format for precise event ordering |
| `userId` | Slack user ID for accountability |
| `command` | Exact user input (raw text) |
| `action` | Normalized action (parsed command) |
| `host` | Target host (parsed from command) |
| `allowed` | RBAC verdict (true/false) |
| `reason` | Why allowed/denied (RBAC rule or error) |
| `success` | Execution outcome (true/false) |

### Key Points

- Complete incident history traceable to user
- Every action (successful or failed) recorded
- JSON format compatible with SIEM systems
- Immutable audit trail for compliance
- Failed attempts visible (security monitoring)

---

## Incident Response Workflow Summary

| Step | Command | Role Required | Result |
|------|---------|---------------|--------|
| 1. Check baseline | `check status HR-LAPTOP-22` | VIEWER | Host accessible, not quarantined |
| 2. Gather evidence | `collect logs HR-LAPTOP-22` | ANALYST | Logs saved to disk |
| 3. Contain threat | `quarantine host HR-LAPTOP-22` | RESPONDER | Host marked quarantined |
| 4. Verify containment | `check status HR-LAPTOP-22` | VIEWER | Status confirmed quarantined |
| 5. Document action | `remediation report HR-LAPTOP-22` | ANALYST | Report generated with timestamp |
| 6. Audit trail | Review `logs/ir-bot.log` | VIEWER | All actions logged |

---

## Key Capabilities Demonstrated

| Capability | Benefit |
|-----------|---------|
| **Centralized Interface** | All IR actions from Slack (no context switching) |
| **Role-Based Access Control** | Prevents unauthorized actions automatically |
| **Speed** | Incident response in seconds, not hours |
| **Transparency** | Clear responses showing execution details and paths |
| **Audit Trail** | Complete JSON logs for compliance and forensics |
| **Non-Destructive** | Demo-safe (marker files instead of actual isolation) |

---

## Common Questions During Demo

### Q: Can users bypass RBAC?

**A:** No. Authorization is enforced at backend level (not Slack), before script execution. Slack channel permissions do not override bot RBAC.

### Q: What happens if script execution fails?

**A:** Failure is logged with error details in audit trail. User is notified in Slack with error message. Incident responder can review logs and retry.

### Q: How is audit log protected?

**A:** In production: logs stored in database with access controls. In demo: local file system. Recommend integration with SIEM (Splunk, ELK) for centralized log aggregation.

### Q: Can actions be undone?

**A:** Not automatically. In production, quarantine is reversible (network policy removal). Log entry remains for compliance. Runbooks should include "unquarantine" procedures.

### Q: Does this replace human judgment?

**A:** No. Bot automates execution and audit; humans make decisions. Incident responder decides what action to take, bot ensures it happens safely with proper authorization and logging.

---


## Troubleshooting Demo Issues

| Issue | Check | Solution |
|-------|-------|----------|
| Bot not responding | ngrok tunnel active | Restart ngrok, verify URL in Slack config |
| "Not authorized" error | User role in `index.js` | Add user to `USER_ROLES` with correct role |
| Script not found | Scripts in `/scripts/` directory | Verify script names match ACTION_SCRIPTS mapping |
| Logs not appearing | `logs/` directory exists | Run command in Slack to create directory |
| Port conflicts | 3000 and 3001 free | Check `netstat -an` or use different ports |

---

**Version:** 1.0  
**Last Updated:** December 2025  
**Repository:** https://github.com/nishant-kumarr/IR-Playbook-Bot
