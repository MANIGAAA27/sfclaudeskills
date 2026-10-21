# Yahoo Mail MCP connector

An MCP server that gives Claude Code access to a Yahoo Mail mailbox: **IMAP** for reading, searching and filing; **SMTP** for sending. Authentication is a **Yahoo app password**.

It is a plain Node ESM package — no build step, no transpiler.

---

## Why an app password

Yahoo does not accept account passwords for IMAP or SMTP. OAuth2 (XOAUTH2) for Yahoo Mail requires a partner-approved Yahoo developer application, which is not realistically obtainable for a personal integration. An app password is the supported path.

Generate one at **[login.yahoo.com/account/security](https://login.yahoo.com/account/security) → Generate app password**. Account security requirements apply (Yahoo generally requires 2-step verification to be on).

An app password grants full mailbox access. Treat it like a password: keep it in the environment, never in `.mcp.json`, never in a commit.

---

## Install

```bash
cd connectors/yahoo-mail
npm install
```

## Configure

```bash
cp .env.example .env     # then fill in YAHOO_EMAIL and YAHOO_APP_PASSWORD
```

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `YAHOO_EMAIL` | yes | — | The Yahoo address to connect. |
| `YAHOO_APP_PASSWORD` | yes | — | Yahoo app password (not the account password). |
| `YAHOO_FROM_NAME` | no | — | Display name in the `From` header. |
| `YAHOO_MCP_READ_ONLY` | no | off | When set, only the read tools are registered. |
| `YAHOO_MCP_MAX_BODY_CHARS` | no | `20000` | Truncation limit per body part. |
| `YAHOO_MCP_DOWNLOAD_DIR` | no | `yahoo-attachments` | Where `yahoo_save_attachment` writes. |
| `YAHOO_IMAP_HOST` / `YAHOO_IMAP_PORT` | no | `imap.mail.yahoo.com` / `993` | IMAP endpoint. |
| `YAHOO_SMTP_HOST` / `YAHOO_SMTP_PORT` | no | `smtp.mail.yahoo.com` / `465` | SMTP endpoint. Port `587` switches to STARTTLS. |

## Verify the credentials before wiring it up

```bash
YAHOO_EMAIL=you@yahoo.com YAHOO_APP_PASSWORD=xxxx npm run check
```

This logs in over IMAP and SMTP, prints your INBOX counts, and exits non-zero with a diagnosis if either leg fails. Outbound TCP on **993** and **465** must be open — many corporate networks and CI sandboxes block both.

## Register with Claude Code

From your project root:

```bash
./sfclaudeskills/setup-yahoo-mail-mcp.sh
```

The script installs dependencies, runs the connection check, and **merges** a `yahoo-mail` entry into your project `.mcp.json` (it preserves any Salesforce MCP entries already there). Then run `/mcp` in Claude Code to confirm the server is connected.

Manual equivalent:

```bash
claude mcp add --transport stdio --scope project yahoo-mail \
  --env YAHOO_EMAIL=you@yahoo.com \
  --env YAHOO_APP_PASSWORD=your-app-password \
  -- node /absolute/path/to/connectors/yahoo-mail/src/index.js
```

---

## Tools

### Read (always registered)

| Tool | What it does |
|---|---|
| `yahoo_list_folders` | Folder paths, special-use flags, message and unread counts. |
| `yahoo_search_messages` | Search one folder by from / to / subject / body / date range / unread / flagged. Returns the newest matches as summaries with UIDs. |
| `yahoo_get_message` | Full headers, text body (HTML optional), and attachment list for one UID. Does **not** mark the message read. |
| `yahoo_save_attachment` | Writes one attachment to disk and returns the path. |

### Write (suppressed by `YAHOO_MCP_READ_ONLY`)

| Tool | What it does |
|---|---|
| `yahoo_send_message` | Sends a new message and files a copy in Sent. |
| `yahoo_reply_message` | Replies to a UID with correct `Re:` subject and `In-Reply-To` / `References` threading; `reply_all` optional. Sets `\Seen` and `\Answered` on the original. |
| `yahoo_create_draft` | Composes and saves to Drafts without sending. |
| `yahoo_set_flags` | Marks messages read/unread, flagged/unflagged. |
| `yahoo_move_messages` | Moves UIDs to another folder. |
| `yahoo_trash_messages` | Moves UIDs to Trash, resolved from the `\Trash` special-use flag. |

UIDs are **per folder**. Always take a UID from a search in the same folder you then act on.

---

## Design notes

- **One connection per call.** Yahoo drops idle IMAP sessions and an MCP server can sit unused for hours, so a pooled client would mostly produce stale-socket errors. Each call costs roughly one extra round trip.
- **Sent copies are explicit.** Unlike Gmail, Yahoo's SMTP does not file a copy in Sent. The connector composes the message once and hands the same bytes to SMTP and to an IMAP `APPEND` into the `\Sent` folder. If the append fails the send is still reported as successful, with the append error attached.
- **Bcc is envelope-only.** Bcc addresses go into the SMTP envelope and are never written into the message headers. Consequence: the copy filed in Sent records To and Cc but not Bcc.
- **Attachment paths are sanitized.** `yahoo_save_attachment` takes `path.basename()` of the attachment filename so a hostile name cannot escape the output directory.
- **Special folders resolve by flag,** not by the English names Yahoo happens to use today.

## Limits

- No OAuth2. App password only — see above.
- No `IDLE` / push. Searches are polled on demand; there is no "notify me on new mail".
- No server-side threading. `yahoo_get_message` returns one message; assembling a thread means searching by subject or `References`.
- Write tools act immediately. Claude Code's own permission prompts are the approval gate; `YAHOO_MCP_READ_ONLY=1` is the hard lock.

## Tests

```bash
npm test
```

Runs offline: config validation, message composition (CRLF, From, Bcc handling), reply threading headers, IMAP search-criteria mapping, SMTP TLS options, and a protocol-level check that boots the server over stdio and asserts the advertised tool surface in both normal and read-only mode. No Yahoo account is needed. Live IMAP/SMTP behaviour is covered by `npm run check`, which does need real credentials and open ports.
