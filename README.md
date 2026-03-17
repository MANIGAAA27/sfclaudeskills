# sfclaudeskills

**Claude skills for Salesforce development** — multi-agent toolkit with project memory, role-based skills, and **Salesforce CLI (SFDX) + Salesforce MCP** so agents can work on your Salesforce orgs, metadata, and data.

## What you get

- **Project memory** — `docs/PROJECT_MEMORY.md` for architecture, decisions, handoffs across sessions.
- **Lead agent (Enterprise Architect)** — Plans work, assigns roles, updates project memory.
- **Role skills** — Solution Architect, Sr Software Engineer, Software Engineer, Product Manager, Tester, DevOps Engineer, UI/UX Expert.
- **Salesforce tools** — Agents use **Salesforce CLI** (`sf`) and **Salesforce MCP** (when configured) for orgs, deploy, retrieve, Apex tests, and data.

## Prerequisites

- [Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli) installed (`sf`).
- At least one authenticated org: `sf org login web`.
- For **Salesforce MCP**: Node.js v18+ and an MCP-capable host (e.g. Cursor, Claude Desktop, or Claude Code).

---

## Setup (quick start)

### Option A: Clone into your Salesforce project (recommended)

From your **Salesforce project root** (the repo where you develop):

```bash
git clone https://github.com/MANIGAAA27/sfclaudeskills.git sfclaudeskills
./sfclaudeskills/setup.sh
```

The installer uses the **parent** of the `sfclaudeskills/` folder as the project root, so it will add CLAUDE.md, `.claude/`, and `docs/` to your project.

### Option B: Clone and install into current directory

```bash
git clone https://github.com/MANIGAAA27/sfclaudeskills.git sfclaudeskills
cd sfclaudeskills
PROJECT_ROOT="$(pwd)" ./setup.sh
```

This installs CLAUDE.md, `.claude/`, and `docs/` into the same repo (use this if your Salesforce project **is** the sfclaudeskills clone).

---

## What the setup script does

- Copies **CLAUDE.md** to the project root (backs up existing to `CLAUDE.md.bak`).
- Copies **.claude/rules/** and **.claude/skills/** into your project.
- Creates **docs/PROJECT_MEMORY.md** from template (only if missing).
- Creates **docs/AGENT_TOOLS.md** (Salesforce CLI + MCP) (only if missing).
- Creates **docs/HOSTED_MCP_TOOLS.md** (Hosted MCP server/tool reference) (only if missing).

---

## Enable Salesforce MCP for Claude

This toolkit is for **Claude** (Claude Code, Claude in the IDE, or Claude Desktop). To give Claude access to Salesforce via MCP, configure MCP in whatever host you use to run Claude. Below are instructions for **Cursor** (when you use Cursor as the IDE with Claude). For **Claude Desktop** or **Claude Code** in another editor, use the same MCP servers with your host’s MCP config; see [Configure Your MCP Client](https://github.com/forcedotcom/mcp-hosted/wiki/Configure-Your-MCP-Client) for Claude-specific steps.

### If you use Cursor as your host for Claude

Two options:

**Local (Salesforce DX MCP)**

1. Install Salesforce CLI and authenticate an org: `sf org list`.
2. Copy the MCP example and set your default org alias:

   ```bash
   mkdir -p .cursor
   cp sfclaudeskills/templates/cursor-mcp.json .cursor/mcp.json
   ```

3. Edit **.cursor/mcp.json** and replace `YOUR_DEFAULT_ORG_ALIAS` with your org alias (from `sf org list`).
4. Restart Cursor so it loads the MCP server.

**Hosted (Beta)**

1. Enable the Beta and create an External Client App in your org (see [mcp-hosted Wiki](https://github.com/forcedotcom/mcp-hosted/wiki) — [Enable the Beta](https://github.com/forcedotcom/mcp-hosted/wiki/Enable-the-Beta), [Create an External Client App](https://github.com/forcedotcom/mcp-hosted/wiki/Create-an-External-Client-App)).
2. From your project root, run the auto-setup script:

   ```bash
   ./sfclaudeskills/setup-hosted-mcp.sh
   ```

   When prompted, paste your External Client App **consumer key**. Or set env and re-run: `SALESFORCE_MCP_CONSUMER_KEY=your_key ./sfclaudeskills/setup-hosted-mcp.sh`. For sandbox/scratch orgs: `SALESFORCE_MCP_SANDBOX=1 ./sfclaudeskills/setup-hosted-mcp.sh`.
3. Alternatively, copy the Hosted template and edit manually: `cp sfclaudeskills/templates/cursor-mcp-hosted.json .cursor/mcp.json`, then replace `CONSUMER_KEY` and `SERVER_PATH` (use `platform/sobject-all` for Developer org, or `sandbox/platform/sobject-all` for sandbox).
4. Restart Cursor.

Once MCP is enabled in your host, Claude can use natural language for org queries, metadata, and data; use Salesforce CLI for scripted/CI (deploy, retrieve, tests). See [docs/AGENT_TOOLS.md](docs/AGENT_TOOLS.md) after install.

---

## Salesforce Hosted MCP (Beta)

[Salesforce Hosted MCP Servers](https://github.com/forcedotcom/mcp-hosted) let Claude (and other AI clients) connect to your org over HTTPS using an External Client App (OAuth). Setup is documented in the [mcp-hosted Wiki](https://github.com/forcedotcom/mcp-hosted/wiki). The auto-setup script **setup-hosted-mcp.sh** checks prereqs (Node, Salesforce CLI), optionally creates a scratch org with the MCP Beta feature (`CREATE_SCRATCH=1 ./setup-hosted-mcp.sh`), and can generate MCP config for Cursor (`.cursor/mcp.json`). Manual steps (Enable Beta in Setup, Create External Client App, paste consumer key) are printed at the end of the script. For Claude Desktop or other hosts, configure MCP per the [wiki](https://github.com/forcedotcom/mcp-hosted/wiki/Configure-Your-MCP-Client). Full list of hosted servers and tools: [Available Tools and Servers](https://github.com/forcedotcom/mcp-hosted/wiki/Available-Tools-and-Servers).

---

## Layout after setup

```
your-salesforce-project/
├── CLAUDE.md
├── docs/
│   ├── PROJECT_MEMORY.md
│   ├── AGENT_TOOLS.md
│   └── HOSTED_MCP_TOOLS.md
├── .claude/
│   ├── rules/
│   │   └── project-memory.md
│   └── skills/
│       ├── build-orchestration.md
│       ├── solution-architect.md
│       ├── sr-software-engineer.md
│       ├── software-engineer.md
│       ├── product-manager.md
│       ├── tester.md
│       ├── devops-engineer.md
│       └── ui-ux-expert.md
└── sfclaudeskills/          # optional: keep for re-runs
    ├── README.md
    ├── setup.sh
    ├── setup-hosted-mcp.sh
    ├── install.sh
    ├── CLAUDE.md
    ├── rules/
    ├── skills/
    ├── docs/
    └── templates/
        ├── PROJECT_MEMORY.md
        ├── cursor-mcp.json
        ├── cursor-mcp-hosted.json
        └── scratch-def-mcp.json
```

---

## Scripts

| Script       | Purpose |
|-------------|---------|
| **setup.sh**  | Entry point: runs `install.sh` to install the toolkit into the project. Run from toolkit dir; project root = parent dir (or set `PROJECT_ROOT`). |
| **install.sh** | Core installer: copies CLAUDE.md, .claude/, docs/. Same behavior; use directly if you prefer. |
| **setup-hosted-mcp.sh** | Hosted MCP (Beta): checks Node and Salesforce CLI, optionally creates scratch org with MCP, generates `.cursor/mcp.json` from template (consumer key, server path). Run from project root: `./sfclaudeskills/setup-hosted-mcp.sh`. |

---

## References

- [Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli)
- [Salesforce DX MCP Server](https://github.com/salesforcecli/mcp)
- [MCP Solutions (Salesforce)](https://developer.salesforce.com/docs/einstein/genai/guide/mcp.html)
- [Salesforce Hosted MCP Servers](https://github.com/forcedotcom/mcp-hosted)
- [mcp-hosted Wiki](https://github.com/forcedotcom/mcp-hosted/wiki)
- [Available Tools and Servers](https://github.com/forcedotcom/mcp-hosted/wiki/Available-Tools-and-Servers)

## License

Use and adapt for any project. A credit or link back is appreciated but not required.
