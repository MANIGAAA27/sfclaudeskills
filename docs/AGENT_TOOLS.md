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

## Salesforce DX MCP (local)

**When to use**: When the host (Cursor, Claude Desktop, etc.) has the Salesforce DX MCP Server configured, use it to run Salesforce operations via natural language instead of writing CLI commands or queries yourself. Prefer MCP when the user asks for queries, metadata operations, data operations, or org actions in natural language. For Salesforce-hosted MCP (Beta), see **Salesforce Hosted MCP** below.

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

## Salesforce Hosted MCP (Beta)

**When to use**: Use Hosted MCP when the org has the Beta enabled and the MCP client is configured with the hosted URL and an External Client App. Same natural-language data/metadata/tooling flows as local MCP, with a single HTTPS endpoint and no local CLI auth for the MCP channel.

### Prerequisites

- Beta enabled in org: Setup → User Interface → **Enable MCP Service (Beta)**.
- **External Client App** created (callback URL, OAuth scopes, PKCE). Not Connected Apps. See [Create an External Client App](https://github.com/forcedotcom/mcp-hosted/wiki/Create-an-External-Client-App).
- Consumer key from the External Client App.
- Cursor: [mcp-remote](https://www.npmjs.com/package/mcp-remote) and the hosted URL (see template below).

### URL pattern

- **Developer org**: `https://api.salesforce.com/platform/mcp/v1-beta.2/<SERVER_NAME>`
- **Sandbox or scratch org**: `https://api.salesforce.com/platform/mcp/v1-beta.2/sandbox/<SERVER_NAME>`

Replace `<SERVER_NAME>` with a server from the [Available Tools and Servers](https://github.com/forcedotcom/mcp-hosted/wiki/Available-Tools-and-Servers) list (e.g. `platform/sobject-all`).

### Cursor configuration

Use the template [templates/cursor-mcp-hosted.json](templates/cursor-mcp-hosted.json) (mcp-remote + URL + consumer key). See [Configure Your MCP Client](https://github.com/forcedotcom/mcp-hosted/wiki/Configure-Your-MCP-Client).

### Available Hosted MCP servers and tools

Condensed from [Available Tools and Servers](https://github.com/forcedotcom/mcp-hosted/wiki/Available-Tools-and-Servers). Full, up-to-date list is on the wiki. Prefer Hosted MCP tools when the client is configured for Hosted MCP and the task matches (e.g. SOQL → sobject-reads/sobject-all; metadata context → salesforce-api-context; invocable flows → invocable_actions).

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

- When the host is configured for Salesforce Hosted MCP, use the hosted server tools above for natural-language data and metadata tasks (SOQL, describe, create/update/delete, invocable actions, metadata/tooling context).
- For scripted or CI flows, use **Salesforce CLI** (`sf`).

---

## Enabling tools in your environment

### Salesforce CLI

- Install: [Install the Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli).
- Authenticate: `sf org login web` (or `sf org login web --alias MY_ORG`).
- Confirm: `sf org list`.

### Salesforce DX MCP (Cursor) — local

1. Ensure Salesforce CLI and an authenticated org are set up.
2. Copy the example MCP config to your project (see README or `templates/cursor-mcp.json`).
3. Edit `.cursor/mcp.json`: set `--orgs` to your default org alias (or leave placeholder and set via env).
4. Restart Cursor so it loads the MCP server.

### Salesforce Hosted MCP (Cursor) — Beta

1. Complete [Enable the Beta](https://github.com/forcedotcom/mcp-hosted/wiki/Enable-the-Beta) and [Create an External Client App](https://github.com/forcedotcom/mcp-hosted/wiki/Create-an-External-Client-App) in your org (see [mcp-hosted Wiki](https://github.com/forcedotcom/mcp-hosted/wiki)).
2. Run the auto-setup script (see README): `./sfclaudeskills/setup-hosted-mcp.sh` from project root, or manually copy `templates/cursor-mcp-hosted.json` to `.cursor/mcp.json`.
3. Replace `CONSUMER_KEY` with your External Client App consumer key, `SERVER_NAME` with the desired server (e.g. `platform/sobject-all`), and for sandbox/scratch use the `sandbox` URL segment as in the template.
4. Restart Cursor.

### Salesforce MCP (Claude Desktop / other hosts)

- **Local DX MCP**: Configure as required by your host (Node.js, `sf` CLI, authenticated org).
- **Hosted MCP**: Use the hosted server URL and OAuth (consumer key) per [Configure Your MCP Client](https://github.com/forcedotcom/mcp-hosted/wiki/Configure-Your-MCP-Client).

---

## Updating this document

When you add or change tools (e.g. new MCP servers, required CLI plugins), update this file and mention it in **Handoff Notes** or **Decisions** in [PROJECT_MEMORY.md](PROJECT_MEMORY.md) so other agents and sessions stay in sync.
