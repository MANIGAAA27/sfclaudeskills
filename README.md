# sfclaudeskills

**Claude Code skills for Salesforce development** — multi-agent toolkit for [Claude Code](https://code.claude.com) only. Project memory, role-based skills, and **Salesforce CLI (SFDX) + Salesforce MCP** so Claude Code can work on your Salesforce orgs, metadata, and data.

## What you get

- **Project memory** — `docs/PROJECT_MEMORY.md` for architecture, decisions, handoffs across sessions.
- **Lead agent (Enterprise Architect)** — Plans work, assigns roles, updates project memory.
- **Role skills** — Solution Architect, Sr Software Engineer, Software Engineer, Product Manager, Tester, DevOps Engineer, UI/UX Expert.
- **Salesforce tools** — Claude Code uses **Salesforce CLI** (`sf`) and **Salesforce MCP** (when configured) for orgs, deploy, retrieve, Apex tests, and data.

## Prerequisites

- [Claude Code](https://code.claude.com) installed.
- [Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli) installed (`sf`).
- At least one authenticated org: `sf org login web`.
- For **Salesforce MCP**: Node.js v18+.

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

## Enable Salesforce MCP in Claude Code

Claude Code uses project-scoped MCP config in **`.mcp.json`** and the `claude mcp` CLI. Two options:

### Local (Salesforce DX MCP)

Add the local Salesforce DX MCP server so Claude Code can use your default org:

```bash
claude mcp add --transport stdio --scope project salesforce-dx -- npx -y @salesforce/mcp --orgs YOUR_ORG_ALIAS --toolsets orgs,metadata,data,users --allow-non-ga-tools
```

Replace `YOUR_ORG_ALIAS` with your org alias from `sf org list`. This writes to `.mcp.json` in the project. Restart Claude Code or run `/mcp` to refresh.

### Hosted (Beta)

1. **MCP prerequisites (Beta + ECA)** — Enable the MCP Beta in your org and deploy an External Client App. From the repo (or from `sfclaudeskills/` if you cloned into a project):

   ```bash
   TARGET_ORG=your-org-alias ./setup-mcp-prereqs.sh
   ```

   Optional: `MCP_ECA_CALLBACK_URL=http://localhost:8080/oauth/callback` (default). The script uses Salesforce CLI to deploy the ECA metadata; it will open Setup so you can turn on the Beta if there’s no CLI API for it. See [mcp-hosted Wiki](https://github.com/forcedotcom/mcp-hosted/wiki) — [Enable the Beta](https://github.com/forcedotcom/mcp-hosted/wiki/Enable-the-Beta), [Create an External Client App](https://github.com/forcedotcom/mcp-hosted/wiki/Create-an-External-Client-App). If deploy fails, create the ECA manually per the wiki, then get the consumer key for the next step.
2. From your project root, run the auto-setup script to generate **`.mcp.json`** with the Hosted MCP URL:

   ```bash
   ./sfclaudeskills/setup-hosted-mcp.sh
   ```

   For sandbox/scratch orgs: `SALESFORCE_MCP_SANDBOX=1 ./sfclaudeskills/setup-hosted-mcp.sh`. Optional: `SALESFORCE_MCP_SERVER=platform/sobject-all` (default). You’ll need the **consumer key** from your External Client App when prompted.
3. In Claude Code, run **`/mcp`** to authenticate with your External Client App (OAuth).
4. Test the connection in Claude Code.

Once MCP is enabled, Claude Code can use natural language for org queries, metadata, and data; use Salesforce CLI for scripted/CI (deploy, retrieve, tests). See [docs/AGENT_TOOLS.md](docs/AGENT_TOOLS.md) and [Claude Code MCP docs](https://code.claude.com/docs/en/mcp).

---

## Salesforce Hosted MCP (Beta)

[Salesforce Hosted MCP Servers](https://github.com/forcedotcom/mcp-hosted) let Claude Code connect to your org over HTTPS using an External Client App (OAuth). Setup is documented in the [mcp-hosted Wiki](https://github.com/forcedotcom/mcp-hosted/wiki). Use **setup-mcp-prereqs.sh** first to enable the MCP Beta (via Setup) and deploy the External Client App via Salesforce CLI; then **setup-hosted-mcp.sh** checks prereqs (Node, Salesforce CLI), optionally creates a scratch org with the MCP Beta feature (`CREATE_SCRATCH=1 ./setup-hosted-mcp.sh`), and generates **`.mcp.json`** in the project. Use **`/mcp`** in Claude Code to complete OAuth. Full list of hosted servers and tools: [Available Tools and Servers](https://github.com/forcedotcom/mcp-hosted/wiki/Available-Tools-and-Servers).

---

## Layout after setup

```
your-salesforce-project/
├── CLAUDE.md
├── .mcp.json                 # optional: MCP config (from setup-hosted-mcp.sh or claude mcp add)
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
└── sfclaudeskills/           # optional: keep for re-runs
    ├── README.md
    ├── setup.sh
    ├── setup-mcp-prereqs.sh  # Hosted MCP: enable Beta + deploy ECA
    ├── setup-hosted-mcp.sh
    ├── install.sh
    ├── CLAUDE.md
    ├── rules/
    ├── skills/
    ├── docs/
    └── templates/
        ├── PROJECT_MEMORY.md
        ├── mcp-hosted.json
        └── scratch-def-mcp.json
```

---

## Scripts

| Script       | Purpose |
|-------------|---------|
| **setup.sh**  | Entry point: runs `install.sh` to install the toolkit into the project. Run from toolkit dir; project root = parent dir (or set `PROJECT_ROOT`). |
| **install.sh** | Core installer: copies CLAUDE.md, .claude/, docs/. Same behavior; use directly if you prefer. |
| **setup-hosted-mcp.sh** | Hosted MCP (Beta) for Claude Code: checks Node and Salesforce CLI, optionally creates scratch org with MCP, generates **`.mcp.json`** in the project. Run from project root: `./sfclaudeskills/setup-hosted-mcp.sh`. Then use `/mcp` in Claude Code to authenticate. |

---

## References

- [Claude Code](https://code.claude.com)
- [Claude Code MCP](https://code.claude.com/docs/en/mcp)
- [Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli)
- [Salesforce DX MCP Server](https://github.com/salesforcecli/mcp)
- [MCP Solutions (Salesforce)](https://developer.salesforce.com/docs/einstein/genai/guide/mcp.html)
- [Salesforce Hosted MCP Servers](https://github.com/forcedotcom/mcp-hosted)
- [mcp-hosted Wiki](https://github.com/forcedotcom/mcp-hosted/wiki)
- [Available Tools and Servers](https://github.com/forcedotcom/mcp-hosted/wiki/Available-Tools-and-Servers)

## License

Use and adapt for any project. A credit or link back is appreciated but not required.
