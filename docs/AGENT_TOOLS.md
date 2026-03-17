# Agent Tools

Agents have access to the following tools. Use them whenever the work involves Salesforce, SFDX, or related platforms.

---

## Salesforce CLI (sf / SFDX)

**When to use**: Any task that involves Salesforce orgs, metadata, deployments, scratch orgs, Apex, LWC, or Salesforce DX (SFDX) projects.

### Prerequisites

- [Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli) installed (`sf` or legacy `sfdx`).
- At least one authenticated org (e.g. `sf org list`).

### Common commands (prefer `sf`)

| Task | Command (examples) |
|------|--------------------|
| List orgs | `sf org list` |
| Set default org | `sf config set target-org=ALIAS` |
| Create scratch org | `sf org create scratch -f config/scratch-def.json -a MyScratch` |
| Deploy source | `sf project deploy start -d force-app -o TARGET_ORG` |
| Retrieve metadata | `sf project retrieve start -m "ApexClass:MyClass" -o TARGET_ORG` |
| Run Apex tests | `sf apex run test -o TARGET_ORG -r human -w 10` |
| Run anonymous Apex | `sf apex run -f script.apex -o TARGET_ORG` |
| Open org | `sf org open -o TARGET_ORG` |
| Generate password | `sf org generate password -o TARGET_ORG` |

### Agent behavior

- Prefer **`sf`** over legacy `sfdx` when both are available.
- Use `-o` or default target org for all org-specific commands.
- For deployment/retrieve, use project paths (e.g. `force-app`, `manifest/package.xml`) as in the repo.
- Record org aliases, scratch-def, and deploy/retrieve conventions in [PROJECT_MEMORY.md](PROJECT_MEMORY.md) (Architecture or Decisions) when they affect the team.

---

## Salesforce MCP (Model Context Protocol)

**When to use**: When the host (Cursor, Claude Desktop, etc.) has the Salesforce DX MCP Server configured, use it to run Salesforce operations via natural language instead of writing CLI commands or queries yourself. Prefer MCP when the user asks for queries, metadata operations, data operations, or org actions in natural language.

### What it provides

- **Orgs**: List, switch, describe orgs; run commands in context of an org.
- **Metadata**: Deploy, retrieve, list metadata; run Apex tests.
- **Data**: Query (SOQL), create/update/delete records.
- **Users**: User and permission operations.

Reference: [Salesforce DX MCP Server](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_mcp.htm) (Beta), [salesforcecli/mcp](https://github.com/salesforcecli/mcp).

### Prerequisites

- Node.js v18+.
- Salesforce CLI (`sf`) installed and at least one authenticated org.
- MCP server configured in the host (see below).

### Agent behavior

- If the host supports MCP and the Salesforce DX MCP Server is configured, **prefer MCP tools** for org queries, metadata, data, and user tasks when the user’s request is natural-language.
- For scripted or CI flows (e.g. deploy in a pipeline), use **Salesforce CLI** (`sf`) so steps are reproducible and versioned.
- Do not assume MCP is available; if MCP tools are not present, use Salesforce CLI and document in Handoff Notes that MCP can be added for future sessions.

---

## Enabling tools in your environment

### Salesforce CLI

- Install: [Install the Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli).
- Authenticate: `sf org login web` (or `sf org login web --alias MY_ORG`).
- Confirm: `sf org list`.

### Salesforce MCP (Cursor)

1. Ensure Salesforce CLI and an authenticated org are set up.
2. Copy the example MCP config to your project (see README or `templates/cursor-mcp.json`).
3. Edit `.cursor/mcp.json`: set `--orgs` to your default org alias (or leave placeholder and set via env).
4. Restart Cursor so it loads the MCP server.

### Salesforce MCP (Claude Desktop / other hosts)

Configure the Salesforce DX MCP Server as required by your host (e.g. Claude Desktop config). Same prerequisites: Node.js, `sf` CLI, authenticated org.

---

## Updating this document

When you add or change tools (e.g. new MCP servers, required CLI plugins), update this file and mention it in **Handoff Notes** or **Decisions** in [PROJECT_MEMORY.md](PROJECT_MEMORY.md) so other agents and sessions stay in sync.
