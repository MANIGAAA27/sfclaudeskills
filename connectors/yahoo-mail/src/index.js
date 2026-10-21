#!/usr/bin/env node
// Yahoo Mail MCP server.
//
// Exposes a Yahoo mailbox to Claude Code over stdio: IMAP for reading and
// filing, SMTP for sending. Authentication is a Yahoo app password supplied
// through the environment (see README.md).

import path from 'node:path';
import fs from 'node:fs/promises';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { loadConfig } from './config.js';
import {
  appendMessage,
  getAttachment,
  getMessage,
  listFolders,
  moveMessages,
  searchMessages,
  setFlags,
} from './imap.js';
import { composeRaw, sendRaw } from './smtp.js';
import { buildReply } from './reply.js';
import { formatFolders, formatMessage, formatSearchResults } from './format.js';

const folderArg = z
  .string()
  .default('INBOX')
  .describe('IMAP folder path. Defaults to INBOX. Use yahoo_list_folders to see the real paths.');

const uidsArg = z
  .array(z.number().int().positive())
  .min(1)
  .describe('Message UIDs, as returned by yahoo_search_messages.');

function ok(text) {
  return { content: [{ type: 'text', text }] };
}

function fail(error) {
  return { content: [{ type: 'text', text: `Error: ${error.message || String(error)}` }], isError: true };
}

/** Every tool handler goes through here so an IMAP/SMTP failure becomes a tool error, not a crash. */
function handler(fn) {
  return async (args) => {
    try {
      return await fn(args);
    } catch (error) {
      return fail(error);
    }
  };
}

function registerReadTools(server, config) {
  server.registerTool(
    'yahoo_list_folders',
    {
      title: 'List Yahoo Mail folders',
      description:
        'List the folders in the Yahoo mailbox with message and unread counts. Call this first when a folder other than INBOX is involved.',
      inputSchema: {},
    },
    handler(async () => ok(formatFolders(await listFolders(config))))
  );

  server.registerTool(
    'yahoo_search_messages',
    {
      title: 'Search Yahoo Mail',
      description:
        'Search a Yahoo Mail folder and return the newest matching messages as a summary list (uid, date, from, subject, flags). All criteria are ANDed; with no criteria it returns the newest messages in the folder. Use yahoo_get_message for the body.',
      inputSchema: {
        folder: folderArg,
        from: z.string().optional().describe('Substring match against the From header.'),
        to: z.string().optional().describe('Substring match against the To header.'),
        subject: z.string().optional().describe('Substring match against the Subject header.'),
        body: z.string().optional().describe('Substring match against the message body.'),
        since: z.string().optional().describe('Only messages on or after this date (YYYY-MM-DD).'),
        before: z.string().optional().describe('Only messages before this date (YYYY-MM-DD).'),
        unread_only: z.boolean().optional().describe('Only messages without the \\Seen flag.'),
        flagged_only: z.boolean().optional().describe('Only messages with the \\Flagged flag.'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(20)
          .describe('Maximum messages to return, newest first. Default 20, max 100.'),
      },
    },
    handler(async (args) => ok(formatSearchResults(await searchMessages(config, args))))
  );

  server.registerTool(
    'yahoo_get_message',
    {
      title: 'Read a Yahoo Mail message',
      description:
        'Fetch one message by UID with its headers, text body and attachment list. Reading does not mark the message as read; use yahoo_set_flags for that.',
      inputSchema: {
        folder: folderArg,
        uid: z.number().int().positive().describe('Message UID within the folder.'),
        include_html: z
          .boolean()
          .default(false)
          .describe('Also return the HTML part. Off by default because HTML bodies are large.'),
        max_body_chars: z
          .number()
          .int()
          .min(100)
          .optional()
          .describe('Truncate each body part to this many characters.'),
      },
    },
    handler(async (args) => {
      const message = await getMessage(config, {
        folder: args.folder,
        uid: args.uid,
        includeHtml: args.include_html,
        maxBodyChars: args.max_body_chars,
      });
      return ok(formatMessage(message));
    })
  );

  server.registerTool(
    'yahoo_save_attachment',
    {
      title: 'Save a Yahoo Mail attachment',
      description:
        'Download one attachment from a message to local disk and return the file path. Identify the attachment by filename or by the index shown in yahoo_get_message.',
      inputSchema: {
        folder: folderArg,
        uid: z.number().int().positive().describe('Message UID within the folder.'),
        filename: z.string().optional().describe('Attachment filename to save.'),
        index: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe('Zero-based attachment index, used when filename is omitted. Default 0.'),
        output_dir: z
          .string()
          .optional()
          .describe(`Directory to write to. Defaults to ${config.downloadDir}.`),
      },
    },
    handler(async (args) => {
      const attachment = await getAttachment(config, {
        folder: args.folder,
        uid: args.uid,
        filename: args.filename,
        index: args.index,
      });
      const dir = path.resolve(args.output_dir || config.downloadDir);
      await fs.mkdir(dir, { recursive: true });
      // basename() strips any directory part, and the containment check rejects
      // the leftovers ("..", ".", "") that basename alone still lets through.
      const target = path.join(dir, path.basename(attachment.filename));
      if (path.dirname(target) !== dir) {
        throw new Error(
          `Refusing to write attachment "${attachment.filename}": the filename does not resolve to a file inside ${dir}.`
        );
      }
      await fs.writeFile(target, attachment.content);
      return ok(`Saved ${attachment.filename} (${attachment.contentType}) to ${target}`);
    })
  );
}

function registerWriteTools(server, config) {
  const recipients = z
    .array(z.string())
    .min(1)
    .describe('Recipient email addresses. Each may be "Name <a@b.com>" or a bare address.');

  const attachmentsArg = z
    .array(
      z.object({
        path: z.string().describe('Local file path to attach.'),
        filename: z.string().optional().describe('Name to show on the attachment.'),
      })
    )
    .optional()
    .describe('Local files to attach.');

  server.registerTool(
    'yahoo_send_message',
    {
      title: 'Send a Yahoo Mail message',
      description:
        'Send a new email from the connected Yahoo address and file a copy in Sent. The From address is always the connected account — Yahoo rejects anything else.',
      inputSchema: {
        to: recipients,
        cc: z.array(z.string()).optional().describe('Cc recipients.'),
        bcc: z.array(z.string()).optional().describe('Bcc recipients.'),
        subject: z.string().describe('Subject line.'),
        text: z.string().describe('Plain-text body.'),
        html: z.string().optional().describe('Optional HTML body, sent as an alternative part.'),
        attachments: attachmentsArg,
      },
    },
    handler(async (args) => {
      const composed = await composeRaw(config, {
        to: args.to,
        cc: args.cc,
        bcc: args.bcc,
        subject: args.subject,
        text: args.text,
        html: args.html,
        attachments: args.attachments,
      });
      const result = await sendRaw(config, composed);
      const saved = await appendMessage(config, {
        special: 'sent',
        raw: composed.raw,
        flags: ['\\Seen'],
      }).catch((error) => ({ error: error.message }));

      const sentCopy = saved.error
        ? `Could not file a copy in Sent: ${saved.error}`
        : `Copy filed in "${saved.folder}".`;
      return ok(
        [
          `Sent "${args.subject}" to ${result.accepted.join(', ') || '(none accepted)'}`,
          result.rejected.length > 0 ? `Rejected: ${result.rejected.join(', ')}` : null,
          `Message-ID: ${composed.messageId}`,
          sentCopy,
        ]
          .filter(Boolean)
          .join('\n')
      );
    })
  );

  server.registerTool(
    'yahoo_reply_message',
    {
      title: 'Reply to a Yahoo Mail message',
      description:
        'Reply to a message by UID. Recipients, Re: subject and In-Reply-To/References threading headers are derived from the original, so the reply threads correctly in the recipient\'s client.',
      inputSchema: {
        folder: folderArg,
        uid: z.number().int().positive().describe('UID of the message being replied to.'),
        text: z.string().describe('Plain-text reply body.'),
        html: z.string().optional().describe('Optional HTML reply body.'),
        reply_all: z
          .boolean()
          .default(false)
          .describe('Also Cc the original To and Cc recipients (minus the connected account).'),
        quote_original: z
          .boolean()
          .default(true)
          .describe('Append the quoted original message below the reply.'),
      },
    },
    handler(async (args) => {
      const original = await getMessage(config, { folder: args.folder, uid: args.uid });
      const mail = buildReply(config, original, {
        text: args.text,
        html: args.html,
        replyAll: args.reply_all,
        quote: args.quote_original,
      });
      const composed = await composeRaw(config, mail);
      const result = await sendRaw(config, composed);
      await appendMessage(config, { special: 'sent', raw: composed.raw, flags: ['\\Seen'] }).catch(
        () => null
      );
      // Mark the original read and answered so the mailbox reflects what we did.
      await setFlags(config, {
        folder: args.folder,
        uids: [args.uid],
        seen: true,
        answered: true,
      }).catch(() => null);

      return ok(
        [
          `Replied to UID ${args.uid} ("${original.subject}").`,
          `To: ${mail.to.join(', ')}`,
          mail.cc ? `Cc: ${mail.cc.join(', ')}` : null,
          `Accepted: ${result.accepted.join(', ') || '(none)'}`,
          `Message-ID: ${composed.messageId}`,
        ]
          .filter(Boolean)
          .join('\n')
      );
    })
  );

  server.registerTool(
    'yahoo_create_draft',
    {
      title: 'Create a Yahoo Mail draft',
      description:
        'Compose a message and save it to the Drafts folder without sending. Use this when the user should review the text before it goes out.',
      inputSchema: {
        to: z.array(z.string()).optional().describe('Recipient email addresses.'),
        cc: z.array(z.string()).optional().describe('Cc recipients.'),
        subject: z.string().describe('Subject line.'),
        text: z.string().describe('Plain-text body.'),
        html: z.string().optional().describe('Optional HTML body.'),
        attachments: attachmentsArg,
      },
    },
    handler(async (args) => {
      const composed = await composeRaw(config, {
        to: args.to,
        cc: args.cc,
        subject: args.subject,
        text: args.text,
        html: args.html,
        attachments: args.attachments,
      });
      const saved = await appendMessage(config, {
        special: 'drafts',
        raw: composed.raw,
        flags: ['\\Draft', '\\Seen'],
      });
      return ok(`Draft "${args.subject}" saved to "${saved.folder}" (uid ${saved.uid ?? 'unknown'}).`);
    })
  );

  server.registerTool(
    'yahoo_set_flags',
    {
      title: 'Flag Yahoo Mail messages',
      description:
        'Mark messages read/unread and flagged/unflagged. Pass at least one of seen or flagged.',
      inputSchema: {
        folder: folderArg,
        uids: uidsArg,
        seen: z.boolean().optional().describe('true marks read, false marks unread.'),
        flagged: z.boolean().optional().describe('true adds the star/flag, false removes it.'),
      },
    },
    handler(async (args) => {
      if (args.seen === undefined && args.flagged === undefined) {
        throw new Error('Pass at least one of "seen" or "flagged".');
      }
      const result = await setFlags(config, args);
      return ok(`Applied ${result.applied.join(' ')} to uid(s) ${result.uids.join(', ')} in "${result.folder}".`);
    })
  );

  server.registerTool(
    'yahoo_move_messages',
    {
      title: 'Move Yahoo Mail messages',
      description: 'Move messages from one folder to another. The destination folder must already exist.',
      inputSchema: {
        folder: folderArg,
        uids: uidsArg,
        target_folder: z.string().describe('Destination folder path, as shown by yahoo_list_folders.'),
      },
    },
    handler(async (args) => {
      const result = await moveMessages(config, {
        folder: args.folder,
        uids: args.uids,
        targetFolder: args.target_folder,
      });
      return ok(`Moved uid(s) ${result.uids.join(', ')} from "${result.from}" to "${result.to}".`);
    })
  );

  server.registerTool(
    'yahoo_trash_messages',
    {
      title: 'Move Yahoo Mail messages to Trash',
      description:
        'Move messages to the account\'s Trash folder, resolved from the IMAP \\Trash special-use flag. This does not purge them; Yahoo empties Trash on its own schedule.',
      inputSchema: {
        folder: folderArg,
        uids: uidsArg,
      },
    },
    handler(async (args) => {
      const result = await moveMessages(config, {
        folder: args.folder,
        uids: args.uids,
        special: 'trash',
      });
      return ok(`Moved uid(s) ${result.uids.join(', ')} from "${result.from}" to "${result.to}".`);
    })
  );
}

export function createServer(config) {
  const server = new McpServer({ name: 'yahoo-mail', version: '1.0.0' });
  registerReadTools(server, config);
  if (!config.readOnly) {
    registerWriteTools(server, config);
  }
  return server;
}

async function main() {
  let config;
  try {
    config = loadConfig();
  } catch (error) {
    process.stderr.write(`yahoo-mail MCP: ${error.message}\n`);
    process.exit(1);
  }

  const server = createServer(config);
  if (config.readOnly) {
    process.stderr.write('yahoo-mail MCP: YAHOO_MCP_READ_ONLY is set; send/move/flag tools are not registered.\n');
  }
  await server.connect(new StdioServerTransport());
}

// Only run the server when executed directly, so tests can import createServer.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    process.stderr.write(`yahoo-mail MCP: fatal: ${error.stack || error.message}\n`);
    process.exit(1);
  });
}
