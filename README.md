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
- For **Salesforce MCP**: Node.js v18+ and Cursor (or another MCP host).

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

---

## Enable Salesforce MCP (Cursor)

1. Install Salesforce CLI and authenticate an org: `sf org list`.
2. Copy the MCP example and set your default org alias:

   ```bash
   mkdir -p .cursor
   cp sfclaudeskills/templates/cursor-mcp.json .cursor/mcp.json
   ```

3. Edit **.cursor/mcp.json** and replace `YOUR_DEFAULT_ORG_ALIAS` with your org alias (from `sf org list`).
4. Restart Cursor so it loads the MCP server.

Agents can then use natural language for org queries, metadata, and data; use Salesforce CLI for scripted/CI (deploy, retrieve, tests). See [docs/AGENT_TOOLS.md](docs/AGENT_TOOLS.md) after install.

---

## Layout after setup

```
your-salesforce-project/
├── CLAUDE.md
├── docs/
│   ├── PROJECT_MEMORY.md
│   └── AGENT_TOOLS.md
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
    ├── install.sh
    ├── CLAUDE.md
    ├── rules/
    ├── skills/
    ├── docs/
    └── templates/
        ├── PROJECT_MEMORY.md
        └── cursor-mcp.json
```

---

## Scripts

| Script       | Purpose |
|-------------|---------|
| **setup.sh**  | Entry point: runs `install.sh` to install the toolkit into the project. Run from toolkit dir; project root = parent dir (or set `PROJECT_ROOT`). |
| **install.sh** | Core installer: copies CLAUDE.md, .claude/, docs/. Same behavior; use directly if you prefer. |

---

## References

- [Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli)
- [Salesforce DX MCP Server](https://github.com/salesforcecli/mcp)
- [MCP Solutions (Salesforce)](https://developer.salesforce.com/docs/einstein/genai/guide/mcp.html)

## License

Use and adapt for any project. A credit or link back is appreciated but not required.
