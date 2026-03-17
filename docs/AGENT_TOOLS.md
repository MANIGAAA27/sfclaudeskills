# Agent Tools

This toolkit is for **Claude Code** only. Claude Code has access to the following tools when they are configured. Use them whenever the work involves Salesforce, SFDX, or related platforms.

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

## Salesforce DX MCP (local)

**When to use**: When Claude Code has the Salesforce DX MCP Server configured (via `claude mcp add` or `.mcp.json`), use it to run Salesforce operations via natural language instead of writing CLI commands or queries yourself. Prefer MCP when the user asks for queries, metadata operations, data operations, or org actions in natural language. For Salesforce-hosted MCP (Beta), see **Salesforce Hosted MCP** below.

### What it provides

- **Orgs**: List, switch, describe orgs; run commands in context of an org.
- **Metadata**: Deploy, retrieve, list metadata; run Apex tests.
- **Data**: Query (SOQL), create/update/delete records.
- **Users**: User and permission operations.

Reference: [Salesforce DX MCP Server](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_mcp.htm) (Beta), [salesforcecli/mcp](https://github.com/salesforcecli/mcp).

### Prerequisites

- Node.js v18+.
- Salesforce CLI (`sf`) installed and at least one authenticated org.
- MCP server configured in Claude Code (see below).

### Agent behavior

- Claude Code has the Salesforce DX MCP Server configured, **prefer MCP tools** for org queries, metadata, data, and user tasks when the user’s request is natural-language.
- For scripted or CI flows (e.g. deploy in a pipeline), use **Salesforce CLI** (`sf`) so steps are reproducible and versioned.
- Do not assume MCP is available; if MCP tools are not present, use Salesforce CLI and document in Handoff Notes that MCP can be added for future sessions.

---

## Salesforce Hosted MCP (Beta)

**When to use**: Use Hosted MCP when the org has the Beta enabled and Claude Code has `.mcp.json` (or MCP config) with the hosted URL and you have authenticated via `/mcp` with an External Client App. Same natural-language data/metadata/tooling flows as local MCP, with a single HTTPS endpoint and no local CLI auth for the MCP channel.

### Prerequisites

- Beta enabled in org: Setup → User Interface → **Enable MCP Service (Beta)**.
- **External Client App** created (callback URL, OAuth scopes, PKCE). Not Connected Apps. See [Create an External Client App](https://github.com/forcedotcom/mcp-hosted/wiki/Create-an-External-Client-App).
- Consumer key from the External Client App.
- **Claude Code**: `.mcp.json` with the hosted URL (see setup-hosted-mcp.sh or [Claude Code MCP](https://code.claude.com/docs/en/mcp)); use `/mcp` in Claude Code to authenticate (OAuth).

### URL pattern

- **Developer org**: `https://api.salesforce.com/platform/mcp/v1-beta.2/<SERVER_NAME>`
- **Sandbox or scratch org**: `https://api.salesforce.com/platform/mcp/v1-beta.2/sandbox/<SERVER_NAME>`

Replace `<SERVER_NAME>` with a server from the [Available Tools and Servers](https://github.com/forcedotcom/mcp-hosted/wiki/Available-Tools-and-Servers) list (e.g. `platform/sobject-all`).

### Claude Code configuration

Run `./sfclaudeskills/setup-hosted-mcp.sh` to generate **`.mcp.json`** in the project with the Hosted MCP URL. In Claude Code, run **`/mcp`** to authenticate with your External Client App (OAuth). See [Claude Code MCP](https://code.claude.com/docs/en/mcp).

### Available Hosted MCP servers and tools

Condensed from [Available Tools and Servers](https://github.com/forcedotcom/mcp-hosted/wiki/Available-Tools-and-Servers). Full, up-to-date list is on the wiki. Prefer Hosted MCP tools when Claude Code is configured for Hosted MCP and the task matches (e.g. SOQL → sobject-reads/sobject-all; metadata context → salesforce-api-context; invocable flows → invocable_actions).

| Server | Representative tools | Use for |
|--------|----------------------|--------|
| **platform/sobject-all** | `soql_query`, `describe_global`, `describe_sobject`, `create_sobject_record`, `update_sobject_record`, `get_related_records`, `list_recent_sobject_records`, `get_user_info` | Full CRUD, SOQL, describe, relationships |
| **platform/sobject-reads** | `soql_query`, `describe_global`, `describe_sobject`, `find` (SOSL), `get_user_info`, `list_recent_sobject_records` | Read-only data and schema |
| **platform/sobject-mutations** | `soql_query`, `create_sobject_record`, `update_sobject_record`, `update_related_record` | Create and update records |
| **sobject-deletes** | `soql_query`, `delete_sobject_record`, `delete_related_record` | Delete records |
| **platform/salesforce-api-context** | `get_metadata_api_context`, `get_data_and_tooling_api_context` | Metadata type definitions and Tooling/Data API context for generating metadata files and API requests |
| **invocable_actions** | `get_invocable_actions`, `get_invocable_action_schema`, `invoke_invocable_action` | Discover and invoke Flows, Apex invocables, etc. |
| **data-cloud-queries** | `get_dc_metadata`, `post_dc_query_sql` | Data Cloud metadata and SQL queries |
| **revenue-cloud** | `soql_query`, `describe_global`, `describe_sobject`, `create_order_from_quote`, CPQ configurator, asset amend/cancel/renew | Revenue Cloud / CPQ / RLM |
| **insurance-cloud** | `soql_query`, product clauses, underwriting rules, policy/quote details | Insurance Cloud |
| **pricing-ngp** | `get_price` | Pricing (NGP) |
| **analytics/tableau-next** | `list_semantic_models`, `analyze_data`, dashboards, visualizations | Tableau Next / analytics |

### Agent behavior

- When Claude Code is configured for Salesforce Hosted MCP, use the hosted server tools above for natural-language data and metadata tasks (SOQL, describe, create/update/delete, invocable actions, metadata/tooling context).
- For scripted or CI flows, use **Salesforce CLI** (`sf`).

---

## Enabling tools in your environment

### Salesforce CLI

- Install: [Install the Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli).
- Authenticate: `sf org login web` (or `sf org login web --alias MY_ORG`).
- Confirm: `sf org list`.

### Salesforce DX MCP (local) in Claude Code

Add the local MCP server to the project (writes to `.mcp.json`):

```bash
claude mcp add --transport stdio --scope project salesforce-dx -- npx -y @salesforce/mcp --orgs YOUR_ORG_ALIAS --toolsets orgs,metadata,data,users --allow-non-ga-tools
```

Replace `YOUR_ORG_ALIAS` with your org alias from `sf org list`. Restart Claude Code or run `/mcp` to refresh.

### Salesforce Hosted MCP (Beta) in Claude Code

1. Complete [Enable the Beta](https://github.com/forcedotcom/mcp-hosted/wiki/Enable-the-Beta) and [Create an External Client App](https://github.com/forcedotcom/mcp-hosted/wiki/Create-an-External-Client-App) in your org (see [mcp-hosted Wiki](https://github.com/forcedotcom/mcp-hosted/wiki)).
2. Run from project root: `./sfclaudeskills/setup-hosted-mcp.sh` to generate **`.mcp.json`** with the Hosted MCP URL. For sandbox: `SALESFORCE_MCP_SANDBOX=1 ./sfclaudeskills/setup-hosted-mcp.sh`.
3. In Claude Code, run **`/mcp`** to authenticate with your External Client App (OAuth).
4. Test the connection in Claude Code.

---

## Updating this document

When you add or change tools (e.g. new MCP servers, required CLI plugins), update this file and mention it in **Handoff Notes** or **Decisions** in [PROJECT_MEMORY.md](PROJECT_MEMORY.md) so other agents and sessions stay in sync.
