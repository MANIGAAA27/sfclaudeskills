#!/usr/bin/env bash
# Auto-setup for Salesforce Hosted MCP (Beta): prereqs, optional scratch org, generate .cursor/mcp.json.
# Run from project root: ./sfclaudeskills/setup-hosted-mcp.sh
# Or from toolkit dir: ./setup-hosted-mcp.sh (project root = parent of toolkit).
# Env: SALESFORCE_MCP_CONSUMER_KEY, SALESFORCE_MCP_SERVER (default platform/sobject-all), SALESFORCE_MCP_SANDBOX (non-empty = sandbox).
set -euo pipefail

TOOLKIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-.}")" && pwd)"
if [[ -n "${PROJECT_ROOT:-}" ]]; then
  PROJECT_ROOT="$(cd "$PROJECT_ROOT" && pwd)"
else
  PROJECT_ROOT="$(cd "$(dirname "$TOOLKIT_DIR")" && pwd)"
fi

echo "Salesforce Hosted MCP (Beta) — setup"
echo "Toolkit: $TOOLKIT_DIR"
echo "Project root: $PROJECT_ROOT"
echo ""

# Prereqs: Node v18+
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

# Salesforce CLI
if ! command -v sf &>/dev/null; then
  echo "Error: Salesforce CLI (sf) is required. Install from https://developer.salesforce.com/tools/sfdxcli"
  exit 1
fi
echo "Salesforce CLI: $(sf --version 2>/dev/null || true)"
echo ""

# Optional: list orgs and suggest login
if ! sf org list &>/dev/null || [[ -z "$(sf org list --json 2>/dev/null | grep -c '"alias"' || true)" ]]; then
  echo "No default org detected. Run: sf org login web"
  echo "Then re-run this script if you want to create a scratch org or use CLI for other steps."
  echo ""
fi

# Optional scratch org (user can run with CREATE_SCRATCH=1)
if [[ -n "${CREATE_SCRATCH:-}" ]]; then
  SCRATCH_ALIAS="${SCRATCH_ALIAS:-mcp-scratch}"
  DEF_FILE="$TOOLKIT_DIR/templates/scratch-def-mcp.json"
  if [[ ! -f "$DEF_FILE" ]]; then
    echo "Scratch def not found: $DEF_FILE"
  else
    echo "Creating scratch org with SalesforceHostedMCP: $SCRATCH_ALIAS"
    sf org create scratch -f "$DEF_FILE" -a "$SCRATCH_ALIAS" -d 7
    echo "Scratch org created. Note: External Client App cannot be created in scratch orgs; use a Developer or Sandbox org for ECA. Use this scratch for testing after connecting with an ECA from another org."
    echo ""
  fi
fi

# Cursor mcp.json: CONSUMER_KEY and SERVER_PATH
CONSUMER_KEY="${SALESFORCE_MCP_CONSUMER_KEY:-}"
SERVER_NAME="${SALESFORCE_MCP_SERVER:-platform/sobject-all}"
if [[ -n "${SALESFORCE_MCP_SANDBOX:-}" ]]; then
  SERVER_PATH="sandbox/$SERVER_NAME"
else
  SERVER_PATH="$SERVER_NAME"
fi

if [[ -z "$CONSUMER_KEY" ]]; then
  echo "You need an External Client App consumer key from your org (Setup → External Client Apps)."
  echo "If you don't have it yet, create the ECA first: https://github.com/forcedotcom/mcp-hosted/wiki/Create-an-External-Client-App"
  echo "Callback URL for Cursor: http://localhost:8080/oauth/callback"
  read -r -p "Paste consumer key (or press Enter to skip writing mcp.json): " CONSUMER_KEY
  if [[ -z "$CONSUMER_KEY" ]]; then
    echo "Skipping .cursor/mcp.json. When you have the consumer key, run:"
    echo "  SALESFORCE_MCP_CONSUMER_KEY=your_key ./setup-hosted-mcp.sh"
    echo "Or copy templates/cursor-mcp-hosted.json to .cursor/mcp.json and replace CONSUMER_KEY and SERVER_PATH."
    echo ""
    echo "--- Next steps (manual) ---"
    echo "1. Enable Beta: Setup → User Interface → Enable MCP Service (Beta)"
    echo "2. Create External Client App: https://github.com/forcedotcom/mcp-hosted/wiki/Create-an-External-Client-App"
    echo "3. Configure Cursor: https://github.com/forcedotcom/mcp-hosted/wiki/Configure-Your-MCP-Client"
    exit 0
  fi
fi

mkdir -p "$PROJECT_ROOT/.cursor"
TEMPLATE="$TOOLKIT_DIR/templates/cursor-mcp-hosted.json"
if [[ ! -f "$TEMPLATE" ]]; then
  echo "Error: Template not found: $TEMPLATE"
  exit 1
fi

# Escape for JSON and for sed replacement ( & in replacement is special in sed)
CONSUMER_KEY_ESC="${CONSUMER_KEY//\\/\\\\}"
CONSUMER_KEY_ESC="${CONSUMER_KEY_ESC//\"/\\\"}"
CONSUMER_KEY_ESC="${CONSUMER_KEY_ESC//&/\\&}"
sed -e "s/CONSUMER_KEY/$CONSUMER_KEY_ESC/" -e "s|SERVER_PATH|$SERVER_PATH|" "$TEMPLATE" > "$PROJECT_ROOT/.cursor/mcp.json"
echo "Wrote $PROJECT_ROOT/.cursor/mcp.json (server path: $SERVER_PATH)"
echo ""

echo "--- Next steps ---"
echo "1. Enable Beta (if not already): Setup → User Interface → Enable MCP Service (Beta)"
echo "   https://github.com/forcedotcom/mcp-hosted/wiki/Enable-the-Beta"
echo "2. Create External Client App (if not already): https://github.com/forcedotcom/mcp-hosted/wiki/Create-an-External-Client-App"
echo "3. Restart Cursor so it loads the MCP server."
echo "4. Test the connection in Cursor's MCP/chat."
echo ""
echo "Wiki: https://github.com/forcedotcom/mcp-hosted/wiki"
