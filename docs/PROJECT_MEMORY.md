# Project Memory

Single source of truth for project knowledge. Persists across chat sessions so context is preserved when the agent chat limit is reached or a new window is opened.

**Usage**: Agents read this file at the start of build/orchestration or role-specific work. Update it when making decisions, completing work that affects others, or handing off to the next session or role.

---

## Architecture

*High-level design, boundaries, tech choices, integration points. Solution Architect and Enterprise Architect maintain this section.*

- (Describe your runtime architecture, main components, ports, and integration points.)
- **Yahoo Mail connector** (`connectors/yahoo-mail`) — standalone Node ESM MCP server, stdio transport, no build step. `src/config.js` (env validation) → `src/imap.js` (ImapFlow: folders, search, fetch, flags, move, append) and `src/smtp.js` (nodemailer: compose + send) → `src/index.js` (MCP tool surface, 4 read + 6 write tools). `src/reply.js` derives reply recipients and threading headers; `src/format.js` renders tool output as plain text. Registered in the project's `.mcp.json` as server `yahoo-mail`; credentials come from `YAHOO_EMAIL` / `YAHOO_APP_PASSWORD` in the environment, never from the file.

---

## Decisions

*Recorded decisions with brief rationale. Date and role when known.*

| Date | Decision | Rationale |
|------|----------|-----------|
| (Add rows as you make decisions.) |
| 2026-10-21 | Yahoo connector is an MCP server, not Salesforce metadata | The toolkit's job is giving Claude Code capabilities. A mailbox is not org metadata; Apex cannot speak IMAP, so a Salesforce-side "connector" would have been limited to email forwarding. |
| 2026-10-21 | App-password auth only; no OAuth2 | Yahoo rejects account passwords on IMAP/SMTP, and XOAUTH2 needs a partner-approved Yahoo developer app that a personal integration cannot get. Scaffolding an untestable OAuth path would be dead code. |
| 2026-10-21 | Plain Node ESM, no TypeScript | The toolkit has no JS tooling or CI. A build step would be the only thing standing between a user and `npm install`. |
| 2026-10-21 | One IMAP connection per tool call | Yahoo drops idle IMAP sessions and an MCP server can sit unused for hours; a pooled client would mostly surface stale-socket errors. Cost is roughly one extra round trip per call. |
| 2026-10-21 | Tools are prefixed `yahoo_` | Projects using this toolkit commonly have Gmail and Salesforce MCP servers loaded in the same session; unprefixed `send_message` would be ambiguous to the model. |
| 2026-10-21 | Bcc lives in the SMTP envelope only | nodemailer's stream transport forces `keepBcc`, which would have written Bcc addresses into the bytes sent to every recipient. Trade-off: the Sent copy records To and Cc but not Bcc. |
| 2026-10-21 | Explicit IMAP `APPEND` for Sent copies | Unlike Gmail, Yahoo SMTP does not file sent mail. The same composed bytes go to SMTP and to the `\Sent` folder; a failed append is reported but does not fail the send. |
| 2026-10-21 | `setup-yahoo-mail-mcp.sh` merges `.mcp.json` | `setup-hosted-mcp.sh` overwrites the file wholesale, which would delete a Salesforce server entry. The new script merges and backs up. |

---

## Current Focus

*What the team is working on right now; last updated task plan or active phase.*

- (Paste or summarize the current task plan and phase. Update when the Enterprise Architect produces a new plan or when a phase completes.)
- **Complete — Yahoo Mail MCP connector.** Phase 1 scaffold + config; Phase 2 IMAP and SMTP cores; Phase 3 MCP tool surface (10 tools, read/write split); Phase 4 setup script, templates, docs, memory; Phase 5 verification. 16 offline tests pass (`npm test` in `connectors/yahoo-mail`), covering config validation, composition, reply threading, search-criteria mapping, SMTP TLS options, and the advertised tool surface over stdio in both normal and read-only mode.

---

## Handoff Notes

*Context for the next session or next role: where we left off, what to do next, blockers.*

- (After completing work or pausing, add what the next session or role should do and any blockers.)
- **Yahoo connector: live credentials are unverified.** It was built in a sandbox with outbound TCP 993/465 blocked, so no real Yahoo login ever happened. Before relying on it, a human must export `YAHOO_EMAIL` / `YAHOO_APP_PASSWORD` and run `npm run check` in `connectors/yahoo-mail`, then exercise one read (`yahoo_search_messages`) and one write (`yahoo_create_draft`, which is reversible) against a real mailbox. The IMAP code paths — ImapFlow search/fetch/append shapes, Yahoo's special-use flags, Yahoo's `APPEND` behaviour — are the parts most likely to need adjusting.
- Not implemented and deliberately out of scope: OAuth2/XOAUTH2, IMAP `IDLE`/push, server-side thread assembly, attachment streaming for very large files. See the Limits section of `connectors/yahoo-mail/README.md`.

---

## Open Questions

*Unresolved questions that need an owner (PM, Solution Architect, etc.).*

- (List open questions and, if known, who should resolve them.)
- Should the Yahoo connector default to read-only, with writes opt-in? Currently writes are on by default and `YAHOO_MCP_READ_ONLY=1` is the lock. (Owner: Product Manager / project owner.)
- Should the generic IMAP/SMTP path be exposed so iCloud, Outlook and Fastmail work from the same server? The transport code is already provider-agnostic; only the defaults and docs are Yahoo-specific. (Owner: Solution Architect.)
