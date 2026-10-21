// IMAP access to the Yahoo mailbox.
//
// Every call opens its own connection and tears it down again. Yahoo drops idle
// IMAP sessions aggressively, and an MCP server can sit unused for hours, so a
// pooled/persistent client would mostly be a source of stale-socket bugs.

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

const SPECIAL_USE = {
  inbox: '\\Inbox',
  sent: '\\Sent',
  drafts: '\\Drafts',
  trash: '\\Trash',
  junk: '\\Junk',
  archive: '\\Archive',
};

function newClient(config) {
  return new ImapFlow({
    host: config.imap.host,
    port: config.imap.port,
    secure: true,
    auth: { user: config.email, pass: config.appPassword },
    logger: false,
    emitLogs: false,
  });
}

/** Connect, run `fn(client)`, then always log out. */
export async function withClient(config, fn) {
  const client = newClient(config);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    // logout() can throw if the server already hung up; close() is the fallback.
    try {
      await client.logout();
    } catch {
      client.close();
    }
  }
}

/** Connect, lock `mailbox`, run `fn(client)`, release the lock, log out. */
export async function withMailbox(config, mailbox, fn, { readOnly = false } = {}) {
  return withClient(config, async (client) => {
    const lock = await client.getMailboxLock(mailbox, { readOnly });
    try {
      return await fn(client);
    } finally {
      lock.release();
    }
  });
}

export async function listFolders(config) {
  return withClient(config, async (client) => {
    const folders = await client.list();
    const rows = [];
    for (const folder of folders) {
      if (folder.flags?.has('\\Noselect')) continue;
      let status = {};
      try {
        status = await client.status(folder.path, { messages: true, unseen: true });
      } catch {
        // A folder can refuse STATUS (e.g. no \Select right); report it without counts.
      }
      rows.push({
        path: folder.path,
        name: folder.name,
        specialUse: folder.specialUse || null,
        messages: status.messages ?? null,
        unseen: status.unseen ?? null,
      });
    }
    return rows;
  });
}

/**
 * Resolve a logical folder name ("trash", "sent", ...) to the real IMAP path.
 * Yahoo uses plain English names today, but special-use flags are the contract.
 */
export async function resolveSpecialFolder(client, kind) {
  const flag = SPECIAL_USE[kind];
  if (!flag) throw new Error(`Unknown special folder: ${kind}`);
  const folders = await client.list();
  const bySpecialUse = folders.find((f) => f.specialUse === flag);
  if (bySpecialUse) return bySpecialUse.path;
  const byName = folders.find((f) => f.path.toLowerCase() === kind.toLowerCase());
  if (byName) return byName.path;
  throw new Error(
    `Could not find the ${kind} folder on this account. Use yahoo_list_folders and pass an explicit folder path.`
  );
}

function hasAttachment(node) {
  if (!node) return false;
  if (node.disposition === 'attachment') return true;
  if (node.dispositionParameters?.filename || node.parameters?.name) return true;
  return (node.childNodes || []).some(hasAttachment);
}

function addressList(addresses) {
  return (addresses || [])
    .map((a) => (a.name ? `${a.name} <${a.address}>` : a.address))
    .filter(Boolean);
}

function summarize(message) {
  const envelope = message.envelope || {};
  return {
    uid: message.uid,
    date: envelope.date ? new Date(envelope.date).toISOString() : null,
    subject: envelope.subject || '(no subject)',
    from: addressList(envelope.from),
    to: addressList(envelope.to),
    cc: addressList(envelope.cc),
    messageId: envelope.messageId || null,
    flags: message.flags ? [...message.flags] : [],
    unread: message.flags ? !message.flags.has('\\Seen') : null,
    sizeBytes: message.size ?? null,
    hasAttachments: hasAttachment(message.bodyStructure),
  };
}

function toDate(value, label) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${label} date: ${value}. Use YYYY-MM-DD or a full ISO timestamp.`);
  }
  return date;
}

/** Build an ImapFlow search query from the tool arguments. */
export function buildSearchQuery(args) {
  const query = {};
  if (args.from) query.from = args.from;
  if (args.to) query.to = args.to;
  if (args.subject) query.subject = args.subject;
  if (args.body) query.body = args.body;
  if (args.since) query.since = toDate(args.since, 'since');
  if (args.before) query.before = toDate(args.before, 'before');
  if (args.unread_only) query.seen = false;
  if (args.flagged_only) query.flagged = true;
  if (Object.keys(query).length === 0) query.all = true;
  return query;
}

export async function searchMessages(config, args) {
  const folder = args.folder || 'INBOX';
  const limit = args.limit ?? 20;

  return withMailbox(
    config,
    folder,
    async (client) => {
      const uids = await client.search(buildSearchQuery(args), { uid: true });
      const all = Array.isArray(uids) ? uids : [];
      // search() returns ascending UIDs; newest mail is what a caller almost always wants.
      const selected = all.slice(-limit).reverse();
      if (selected.length === 0) {
        return { folder, totalMatches: 0, returned: 0, messages: [] };
      }

      const messages = [];
      for await (const message of client.fetch(
        selected,
        { uid: true, envelope: true, flags: true, size: true, bodyStructure: true },
        { uid: true }
      )) {
        messages.push(summarize(message));
      }
      messages.sort((a, b) => b.uid - a.uid);
      return { folder, totalMatches: all.length, returned: messages.length, messages };
    },
    { readOnly: true }
  );
}

function clip(text, maxChars) {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[truncated: ${text.length - maxChars} more characters]`;
}

/** Fetch one message, fully parsed. `raw` is the RFC822 source (needed for replies). */
export async function getMessage(config, { folder = 'INBOX', uid, includeHtml = false, maxBodyChars }) {
  const limit = maxBodyChars ?? config.maxBodyChars;

  return withMailbox(
    config,
    folder,
    async (client) => {
      const message = await client.fetchOne(
        String(uid),
        { uid: true, envelope: true, flags: true, size: true, source: true },
        { uid: true }
      );
      if (!message) {
        throw new Error(`No message with UID ${uid} in folder "${folder}".`);
      }

      const parsed = await simpleParser(message.source);
      const attachments = (parsed.attachments || []).map((a, index) => ({
        index,
        filename: a.filename || `attachment-${index + 1}`,
        contentType: a.contentType,
        sizeBytes: a.size,
      }));

      return {
        folder,
        uid: message.uid,
        date: parsed.date ? parsed.date.toISOString() : null,
        subject: parsed.subject || '(no subject)',
        from: parsed.from?.text || null,
        to: parsed.to?.text || null,
        cc: parsed.cc?.text || null,
        replyTo: parsed.replyTo?.text || null,
        messageId: parsed.messageId || null,
        inReplyTo: parsed.inReplyTo || null,
        references: parsed.references || null,
        flags: message.flags ? [...message.flags] : [],
        unread: message.flags ? !message.flags.has('\\Seen') : null,
        sizeBytes: message.size ?? null,
        text: clip(parsed.text || '', limit),
        html: includeHtml ? clip(parsed.html || '', limit) : undefined,
        attachments,
        raw: message.source,
        parsed,
      };
    },
    { readOnly: true }
  );
}

export async function setFlags(config, { folder = 'INBOX', uids, seen, flagged, answered }) {
  return withMailbox(config, folder, async (client) => {
    const applied = [];
    const add = [];
    const remove = [];
    if (seen === true) add.push('\\Seen');
    if (seen === false) remove.push('\\Seen');
    if (flagged === true) add.push('\\Flagged');
    if (flagged === false) remove.push('\\Flagged');
    if (answered === true) add.push('\\Answered');
    if (answered === false) remove.push('\\Answered');

    if (add.length > 0) {
      await client.messageFlagsAdd(uids, add, { uid: true });
      applied.push(...add.map((f) => `+${f}`));
    }
    if (remove.length > 0) {
      await client.messageFlagsRemove(uids, remove, { uid: true });
      applied.push(...remove.map((f) => `-${f}`));
    }
    return { folder, uids, applied };
  });
}

export async function moveMessages(config, { folder = 'INBOX', uids, targetFolder, special }) {
  return withMailbox(config, folder, async (client) => {
    const destination = special ? await resolveSpecialFolder(client, special) : targetFolder;
    if (!destination) throw new Error('A destination folder is required.');
    if (destination === folder) {
      throw new Error(`Source and destination folder are the same ("${folder}").`);
    }
    await client.messageMove(uids, destination, { uid: true });
    return { from: folder, to: destination, uids };
  });
}

export async function appendMessage(config, { special, folder, raw, flags = [] }) {
  return withClient(config, async (client) => {
    const path = special ? await resolveSpecialFolder(client, special) : folder;
    if (!path) throw new Error('A destination folder is required.');
    const result = await client.append(path, raw, flags, new Date());
    return { folder: path, uid: result?.uid ?? null };
  });
}

export async function getAttachment(config, { folder = 'INBOX', uid, filename, index }) {
  const message = await getMessage(config, { folder, uid, maxBodyChars: 1 });
  const attachments = message.parsed.attachments || [];
  if (attachments.length === 0) {
    throw new Error(`Message UID ${uid} in "${folder}" has no attachments.`);
  }

  let attachment;
  if (filename) {
    attachment = attachments.find((a) => a.filename === filename);
    if (!attachment) {
      throw new Error(
        `No attachment named "${filename}". Available: ${attachments
          .map((a) => a.filename || '(unnamed)')
          .join(', ')}`
      );
    }
  } else {
    const position = index ?? 0;
    attachment = attachments[position];
    if (!attachment) {
      throw new Error(`No attachment at index ${position}; the message has ${attachments.length}.`);
    }
  }

  return {
    filename: attachment.filename || `attachment-${uid}`,
    contentType: attachment.contentType,
    content: attachment.content,
  };
}

export async function verifyImap(config) {
  return withClient(config, async (client) => {
    const status = await client.status('INBOX', { messages: true, unseen: true });
    return { host: config.imap.host, inboxMessages: status.messages, inboxUnseen: status.unseen };
  });
}
