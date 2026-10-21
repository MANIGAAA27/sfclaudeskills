# Yahoo Mail Connector (MCP)

Reference for agents working in a project that has the **Yahoo Mail MCP connector** configured. Source and setup: [`connectors/yahoo-mail/README.md`](../connectors/yahoo-mail/README.md).

**When to use**: Any task that involves reading, searching, filing or sending mail on the connected Yahoo mailbox — for example pulling a customer email thread into a Salesforce case write-up, checking whether a deploy notification arrived, or sending a release note from the project owner's Yahoo address.

**When not to use**: Anything Salesforce-side. Email-to-Case, Email Services, Org-Wide Email Addresses and Email Relay are org metadata — use Salesforce CLI or Salesforce MCP for those. This connector talks to a mailbox, not to an org.

---

## Prerequisites

- Node.js v18+.
- A Yahoo **app password** (account passwords are rejected by Yahoo's IMAP/SMTP): [login.yahoo.com/account/security](https://login.yahoo.com/account/security) → Generate app password.
- `YAHOO_EMAIL` and `YAHOO_APP_PASSWORD` exported in the shell that starts Claude Code.
- Outbound TCP 993 (IMAP) and 465 (SMTP) open.

Setup: `./sfclaudeskills/setup-yahoo-mail-mcp.sh` from the project root, then `/mcp` in Claude Code.

---

## Tools

### Read

| Tool | Purpose |
|------|---------|
| `yahoo_list_folders` | Folder paths, special-use flags, message and unread counts. |
| `yahoo_search_messages` | Search one folder: `from`, `to`, `subject`, `body`, `since`, `before`, `unread_only`, `flagged_only`, `limit`. Returns summaries with UIDs, newest first. |
| `yahoo_get_message` | Headers, text body, attachment list for one UID. `include_html` for the HTML part. |
| `yahoo_save_attachment` | Writes one attachment to disk; returns the path. |

### Write

Registered unless `YAHOO_MCP_READ_ONLY` is set.

| Tool | Purpose |
|------|---------|
| `yahoo_send_message` | Send a new message; a copy is filed in Sent. |
| `yahoo_reply_message` | Reply to a UID with correct `Re:` subject and `In-Reply-To`/`References` threading. `reply_all` optional. |
| `yahoo_create_draft` | Compose and save to Drafts without sending. |
| `yahoo_set_flags` | Mark read/unread, flagged/unflagged. |
| `yahoo_move_messages` | Move UIDs to another folder. |
| `yahoo_trash_messages` | Move UIDs to Trash. |

---

## Agent behavior

- **Search before you read.** `yahoo_get_message` needs a UID. Get it from `yahoo_search_messages` in the same folder.
- **UIDs are per folder.** A UID from `INBOX` is meaningless in `Sent`. Never carry one across folders, and re-search after a move.
- **Call `yahoo_list_folders` before naming a folder** other than `INBOX`. Do not guess folder paths.
- **Reading does not mark mail read.** That is deliberate — it keeps the user's unread state honest. Use `yahoo_set_flags` with `seen: true` only when the user asked for it.
- **Replying does mark the original.** `yahoo_reply_message` sets `\Seen` and `\Answered` on the message it replies to, because the mailbox should reflect that it was handled.
- **Prefer `yahoo_reply_message` over `yahoo_send_message` for replies.** It derives recipients and threading headers from the original; a hand-built reply breaks threading in the recipient's client.
- **Draft when the content is the user's voice.** For anything the user would want to read first — customer-facing mail, anything with a commitment or a number in it — use `yahoo_create_draft` and tell them where it is, rather than sending.
- **Confirm before sending or trashing.** Both are outward-facing or hard to reverse. Ask once unless the user already told you to go ahead.
- **Keep bodies small.** Default to the text part; request `include_html` only when the text part is empty or the markup matters.
- **Never echo the app password**, and never write it into `.mcp.json`, a commit, a log, or a PROJECT_MEMORY entry.

## Limits worth knowing

- **App password only.** Yahoo OAuth2 for IMAP needs a partner-approved developer app; it is not supported here.
- **No push.** There is no `IDLE`/notify tool. "Watch for a reply" means polling a search, so say that rather than implying a subscription.
- **No thread assembly.** One UID is one message. Build a thread by searching subject or `References`.
- **Bcc is not in the Sent copy.** Bcc goes into the SMTP envelope only, so the filed copy records To and Cc.
- **Sent copy is best-effort.** If the IMAP append fails, the send still happened and the tool result says so. Do not re-send.

Record the connected address and any folder conventions in [PROJECT_MEMORY.md](PROJECT_MEMORY.md) if they affect other roles. Record the address, never the credential.
