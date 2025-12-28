const express = require("express");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const fsPromises = fs.promises;

const app = express();
const PORT = 3000;

app.use(express.json());

// ---- Simple in-memory RBAC ----

// 3 roles
const ROLES = {
  VIEWER: "viewer",
  ANALYST: "analyst",
  RESPONDER: "responder",
};

// map userId -> role
const USER_ROLES = {
  // demo users
  alice: ROLES.VIEWER,
  bob: ROLES.ANALYST,
  charlie: ROLES.RESPONDER,

  // Slack users
  "U0A5U1UJZ9A": ROLES.RESPONDER, // Nishant
  "U0A5SPUNUP4": ROLES.ANALYST,   // Abhay
};

// minimum role required per action
const ACTION_MIN_ROLE = {
  "collect logs": ROLES.ANALYST,
  "quarantine host": ROLES.RESPONDER,
  "check status": ROLES.VIEWER,
  "remediation report": ROLES.ANALYST,
};

// compare role power
const ROLE_ORDER = [ROLES.VIEWER, ROLES.ANALYST, ROLES.RESPONDER];

function hasRequiredRole(userRole, minRole) {
  if (!userRole || !minRole) return false;
  return ROLE_ORDER.indexOf(userRole) >= ROLE_ORDER.indexOf(minRole);
}

// ---- Script mapping ----

const ACTION_SCRIPTS = {
  "collect logs": "Collect-Logs.ps1",
  "quarantine host": "Quarantine-Host.ps1",
  "check status": "Check-Status.ps1",
  "remediation report": "Remediation-Report.ps1",
  // "error" script is there but used internally if needed
  error: "Error-Handler.ps1",
};

// ---- Audit logging ----

const LOG_DIR = path.join(__dirname, "logs");
const LOG_FILE = path.join(LOG_DIR, "ir-bot.log");

async function writeAuditLog(entry) {
  try {
    await fsPromises.mkdir(LOG_DIR, { recursive: true });
    const line = JSON.stringify(entry) + "\n";
    await fsPromises.appendFile(LOG_FILE, line, "utf8");
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}

// ---- PowerShell runner ----

function runPowerShellScript(scriptName, args = []) {
  const scriptPath = path.join(__dirname, "scripts", scriptName);

  return new Promise((resolve, reject) => {
    const ps = spawn("powershell.exe", [
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      scriptPath,
      ...args,
    ]);

    let stdout = "";
    let stderr = "";

    ps.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    ps.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ps.on("close", (code) => {
      console.log(
        `[runPowerShellScript] script=${scriptName} code=${code} stdout=<<<${stdout.trim()}>>> stderr=<<<${stderr.trim()}>>>`
      );

      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(stderr.trim() || `Script exited with code ${code}`);
      }
    });
  });
}


// ---- Command parsing ----

function parseCommand(text) {
  if (!text || typeof text !== "string") {
    return { error: "Empty command" };
  }

  const trimmed = text.trim();

  const knownActions = [
    "collect logs",
    "quarantine host",
    "check status",
    "remediation report",
  ];

  const lower = trimmed.toLowerCase();

  const matched = knownActions.find((a) => lower.startsWith(a));
  if (!matched) {
    return { error: "Unknown or disallowed action" };
  }

  const hostPart = trimmed.slice(matched.length).trim();
  if (!hostPart) {
    return { error: "Host is required" };
  }

  return { action: matched, host: hostPart };
}

// ---- Routes ----

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "ir-bot" });
});

// Low-level test endpoint (no RBAC, internal only)
app.post("/ir", async (req, res) => {
  const { action, host } = req.body || {};

  if (!action || !host) {
    return res.status(400).json({ error: "action and host are required" });
  }

  const normalizedAction = action.toLowerCase();
  const scriptName = ACTION_SCRIPTS[normalizedAction];

  if (!scriptName) {
    return res.status(400).json({ error: "Action not allowed" });
  }

  try {
    const output = await runPowerShellScript(scriptName, [host]);
    res.json({ ok: true, action: normalizedAction, host, output });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// Main endpoint with RBAC + audit logging
app.post("/command", async (req, res) => {
  const { text, userId } = req.body || {};
  const timestamp = new Date().toISOString();

  const parsed = parseCommand(text);
  if (parsed.error) {
    await writeAuditLog({
      timestamp,
      userId: userId || "unknown",
      command: text || "",
      action: null,
      host: null,
      allowed: false,
      reason: parsed.error,
      success: false,
    });

    return res.status(400).json({ ok: false, error: parsed.error });
  }

  const { action, host } = parsed;
  const scriptName = ACTION_SCRIPTS[action];

  if (!scriptName) {
    await writeAuditLog({
      timestamp,
      userId: userId || "unknown",
      command: text,
      action,
      host,
      allowed: false,
      reason: "Action not mapped",
      success: false,
    });
    return res.status(400).json({ ok: false, error: "Action not allowed" });
  }

  // RBAC check
  const userRole = USER_ROLES[userId] || null;
  const minRole = ACTION_MIN_ROLE[action];

  if (!hasRequiredRole(userRole, minRole)) {
    await writeAuditLog({
      timestamp,
      userId: userId || "unknown",
      command: text,
      action,
      host,
      allowed: false,
      reason: `Insufficient role (have=${userRole}, need=${minRole})`,
      success: false,
    });

    return res
      .status(403)
      .json({ ok: false, error: "Not authorized for this action" });
  }

  // Execute and log
  try {
    const output = await runPowerShellScript(scriptName, [host]);

    await writeAuditLog({
      timestamp,
      userId: userId || "unknown",
      command: text,
      action,
      host,
      allowed: true,
      reason: "OK",
      success: true,
    });

    res.json({ ok: true, action, host, role: userRole, output });
  } catch (err) {
    await writeAuditLog({
      timestamp,
      userId: userId || "unknown",
      command: text,
      action,
      host,
      allowed: true,
      reason: "Script error",
      success: false,
      error: String(err),
    });

    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`IR Bot HTTP server running on port ${PORT}`);
});
