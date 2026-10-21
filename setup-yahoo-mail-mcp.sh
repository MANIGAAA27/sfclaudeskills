#!/usr/bin/env bash
# Auto-setup for the Yahoo Mail MCP connector in Claude Code.
# Installs dependencies, verifies the credentials, and merges a "yahoo-mail"
# entry into the project's .mcp.json (existing servers are preserved).
#
# Run from project root: ./sfclaudeskills/setup-yahoo-mail-mcp.sh
# Or from toolkit dir:   ./setup-yahoo-mail-mcp.sh   (project root = parent of toolkit)
#
# Env: YAHOO_EMAIL, YAHOO_APP_PASSWORD (used for the connection check),
#      SKIP_CHECK=1 to skip the live IMAP/SMTP check.
set -euo pipefail

TOOLKIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-.}")" && pwd)"
if [[ -n "${PROJECT_ROOT:-}" ]]; then
  PROJECT_ROOT="$(cd "$PROJECT_ROOT" && pwd)"
else
  PROJECT_ROOT="$(cd "$(dirname "$TOOLKIT_DIR")" && pwd)"
fi

CONNECTOR_DIR="$TOOLKIT_DIR/connectors/yahoo-mail"
TEMPLATE="$TOOLKIT_DIR/templates/mcp-yahoo-mail.json"
MCP_FILE="$PROJECT_ROOT/.mcp.json"

echo "Yahoo Mail MCP connector — setup"
echo "Toolkit:   $TOOLKIT_DIR"
echo "Project:   $PROJECT_ROOT"
echo "Connector: $CONNECTOR_DIR"
echo ""

if [[ ! -d "$CONNECTOR_DIR" ]]; then
  echo "Error: connector not found at $CONNECTOR_DIR"
  exit 1
fi
if [[ ! -f "$TEMPLATE" ]]; then
  echo "Error: template not found: $TEMPLATE"
  exit 1
fi

# Prereq: Node v18+
if ! command -v node &>/dev/null; then
  echo "Error: Node.js is required (v18+). Install from https://nodejs.org"
  exit 1
fi
NODE_VER="$(node -v 2>/dev/null | sed 's/^v//' | cut -d. -f1)"
if [[ -z "$NODE_VER" ]] || [[ "$NODE_VER" -lt 18 ]]; then
  echo "Error: Node.js v18+ is required. Current: $(node -v 2>/dev/null || echo 'unknown')"
  exit 1
fi
echo "Node: $(node -v)"

# Dependencies
echo "Installing connector dependencies..."
(cd "$CONNECTOR_DIR" && npm install --no-audit --no-fund >/dev/null)
echo "Dependencies installed."
echo ""

# Credential check
if [[ -n "${SKIP_CHECK:-}" ]]; then
  echo "SKIP_CHECK set; skipping the IMAP/SMTP connection check."
elif [[ -z "${YAHOO_EMAIL:-}" ]] || [[ -z "${YAHOO_APP_PASSWORD:-}" ]]; then
  echo "YAHOO_EMAIL / YAHOO_APP_PASSWORD are not set, so the connection check was skipped."
  echo "Generate an app password at https://login.yahoo.com/account/security"
  echo "Then run: (cd \"$CONNECTOR_DIR\" && npm run check)"
else
  echo "Checking IMAP and SMTP login..."
  if ! (cd "$CONNECTOR_DIR" && npm run --silent check); then
    echo ""
    echo "Connection check failed. .mcp.json was not written."
    echo "Fix the credentials or network access and re-run this script."
    exit 1
  fi
fi
echo ""

# Merge into .mcp.json, preserving any servers already configured.
if [[ -f "$MCP_FILE" ]]; then
  cp "$MCP_FILE" "$MCP_FILE.bak"
  echo "Backed up existing .mcp.json to .mcp.json.bak"
fi

MCP_FILE="$MCP_FILE" TEMPLATE="$TEMPLATE" CONNECTOR_DIR="$CONNECTOR_DIR" node <<'NODE'
const fs = require('node:fs');

const { MCP_FILE, TEMPLATE, CONNECTOR_DIR } = process.env;

const entry = JSON.parse(
  fs.readFileSync(TEMPLATE, 'utf8').replaceAll('CONNECTOR_PATH', CONNECTOR_DIR)
);

let config = { mcpServers: {} };
if (fs.existsSync(MCP_FILE)) {
  try {
    config = JSON.parse(fs.readFileSync(MCP_FILE, 'utf8'));
  } catch (error) {
    console.error(`Error: ${MCP_FILE} is not valid JSON (${error.message}).`);
    console.error('Fix or remove it and re-run. The original is untouched.');
    process.exit(1);
  }
}

config.mcpServers = { ...(config.mcpServers || {}), ...entry.mcpServers };
fs.writeFileSync(MCP_FILE, `${JSON.stringify(config, null, 2)}\n`);

const names = Object.keys(config.mcpServers).join(', ');
console.log(`Wrote ${MCP_FILE}`);
console.log(`MCP servers configured: ${names}`);
NODE

echo ""
echo "--- Next steps ---"
echo "1. Export the credentials in the shell you start Claude Code from"
echo "   (.mcp.json references them as \${YAHOO_EMAIL} / \${YAHOO_APP_PASSWORD};"
echo "    the app password is never written to the file):"
echo "     export YAHOO_EMAIL=you@yahoo.com"
echo "     export YAHOO_APP_PASSWORD=your-app-password"
echo "2. Optional: export YAHOO_MCP_READ_ONLY=1 to register only the read tools."
echo "3. Restart Claude Code, then run /mcp to confirm 'yahoo-mail' is connected."
echo ""
echo "Docs: $TOOLKIT_DIR/docs/YAHOO_MAIL_CONNECTOR.md"
