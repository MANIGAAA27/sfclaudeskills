#!/usr/bin/env bash
# MCP prerequisites for Claude Code: enable MCP Beta (instructions), deploy External Client App via Salesforce CLI.
# Run from project root: ./sfclaudeskills/setup-mcp-prereqs.sh
# Or from toolkit dir: ./setup-mcp-prereqs.sh
# Env: TARGET_ORG (or use default org), MCP_ECA_CALLBACK_URL (default http://localhost:8080/oauth/callback).
# Requires: Salesforce CLI (sf), authenticated org. External Client App cannot be created in scratch orgs.
set -euo pipefail

TOOLKIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-.}")" && pwd)"
if [[ -n "${PROJECT_ROOT:-}" ]]; then
  PROJECT_ROOT="$(cd "$PROJECT_ROOT" && pwd)"
else
  PROJECT_ROOT="$(cd "$(dirname "$TOOLKIT_DIR")" && pwd)"
fi

TARGET_ORG="${TARGET_ORG:-}"
CALLBACK_URL="${MCP_ECA_CALLBACK_URL:-http://localhost:8080/oauth/callback}"
ECA_SOURCE="$TOOLKIT_DIR/templates/eca-mcp"

echo "Salesforce Hosted MCP — prerequisites (Beta)"
echo "Target: Enable MCP Beta (manual) + create External Client App via CLI"
echo ""

# Salesforce CLI required
if ! command -v sf &>/dev/null; then
  echo "Error: Salesforce CLI (sf) is required. Install from https://developer.salesforce.com/tools/sfdxcli"
  exit 1
fi
echo "Salesforce CLI: $(sf --version 2>/dev/null || true)"

# Default org
if [[ -z "$TARGET_ORG" ]]; then
  TARGET_ORG="$(sf config get target-org --json 2>/dev/null | sed -n 's/.*"value"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' || true)"
fi
if [[ -z "$TARGET_ORG" ]]; then
  echo "Error: No target org. Set TARGET_ORG or run: sf org login web && sf config set target-org YOUR_ALIAS"
  exit 1
fi
echo "Target org: $TARGET_ORG"
echo "Callback URL (ECA): $CALLBACK_URL"
echo ""

# --- Step 1: Enable MCP Service (Beta) — no CLI API; open Setup and print instructions
echo "--- Step 1: Enable MCP Service (Beta) ---"
echo "There is no CLI command to enable this. Do it in Setup:"
echo "  1. Setup → Quick Find: 'User Interface'"
echo "  2. Open User Interface → check 'Enable MCP Service (Beta)' → Save"
echo "  Wiki: https://github.com/forcedotcom/mcp-hosted/wiki/Enable-the-Beta"
echo ""
read -r -p "Open Setup User Interface page in browser now? [y/N] " OPEN_SETUP
if [[ "$OPEN_SETUP" =~ ^[yY] ]]; then
  sf org open --target-org "$TARGET_ORG" --path "/lightning/setup/UserInterface/page" 2>/dev/null || true
fi
echo ""

# --- Step 2: Deploy External Client App metadata
echo "--- Step 2: Deploy External Client App (MCP For Claude Code) ---"
if [[ ! -d "$ECA_SOURCE" ]] || [[ ! -f "$ECA_SOURCE/package.xml" ]]; then
  echo "Error: ECA template not found at $ECA_SOURCE"
  exit 1
fi

# Copy to temp dir and substitute callback URL (avoid modifying template in repo)
DEPLOY_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t eca-mcp)
trap 'rm -rf "$DEPLOY_DIR"' EXIT
cp -R "$ECA_SOURCE"/* "$DEPLOY_DIR/"
GLOBAL_OAUTH="$DEPLOY_DIR/force-app/main/default/extlClntAppGlobalOauthSets/MCPForClaudeCodeGlblOauth.ecaGlblOauth-meta.xml"
if [[ -f "$GLOBAL_OAUTH" ]]; then
  if sed --version 2>/dev/null | grep -q GNU; then
    sed -i "s|CALLBACK_URL_PLACEHOLDER|$CALLBACK_URL|g" "$GLOBAL_OAUTH"
  else
    sed -i '' "s|CALLBACK_URL_PLACEHOLDER|$CALLBACK_URL|g" "$GLOBAL_OAUTH"
  fi
fi

echo "Deploying ECA metadata to org $TARGET_ORG ..."
if ( cd "$DEPLOY_DIR" && sf project deploy start --manifest package.xml --target-org "$TARGET_ORG" ); then
  echo "ECA 'MCP For Claude Code' deployed successfully."
else
  echo "Deploy failed. You can create the External Client App manually:"
  echo "  https://github.com/forcedotcom/mcp-hosted/wiki/Create-an-External-Client-App"
  echo "  Use callback URL: $CALLBACK_URL"
  echo "  Scopes: einstein_gpt_api, refresh_token, offline_access, sfap_api, api"
  echo "  Enable PKCE and JWT-based access tokens."
  exit 1
fi
echo ""

# --- Step 3: Get consumer key
echo "--- Step 3: Get Consumer Key ---"
echo "1. In Setup, go to External Client Apps (Quick Find: 'External Client Apps')."
echo "2. Open 'MCP For Claude Code' and copy the Consumer Key."
echo "3. Run: ./sfclaudeskills/setup-hosted-mcp.sh (to generate .mcp.json)."
echo "4. In Claude Code, run /mcp to authenticate (OAuth)."
echo ""
read -r -p "Open External Client Apps in browser now? [y/N] " OPEN_ECA
if [[ "$OPEN_ECA" =~ ^[yY] ]]; then
  sf org open --target-org "$TARGET_ORG" --path "/lightning/setup/ExternalClientAppManager/home" 2>/dev/null || \
  sf org open --target-org "$TARGET_ORG" --path "/lightning/setup/ConnectedApplications/page" 2>/dev/null || true
fi
echo ""
echo "Done. Next: run ./sfclaudeskills/setup-hosted-mcp.sh then use /mcp in Claude Code."
