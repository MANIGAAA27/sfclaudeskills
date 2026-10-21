// Output formatting. Tool results are read by an agent, so they are plain text:
// compact, labelled, and free of JSON noise the model has to re-parse.

export function formatFolders(rows) {
  if (rows.length === 0) return 'No selectable folders found.';
  const lines = rows.map((row) => {
    const counts =
      row.messages === null ? 'counts unavailable' : `${row.messages} messages, ${row.unseen} unread`;
    const special = row.specialUse ? ` [${row.specialUse}]` : '';
    return `- ${row.path}${special} — ${counts}`;
  });
  return `${rows.length} folder(s):\n${lines.join('\n')}`;
}

function oneLine(message) {
  const flags = [];
  if (message.unread) flags.push('UNREAD');
  if (message.flags.includes('\\Flagged')) flags.push('FLAGGED');
  if (message.hasAttachments) flags.push('ATTACHMENTS');
  const marks = flags.length > 0 ? ` (${flags.join(', ')})` : '';
  const date = message.date ? message.date.slice(0, 16).replace('T', ' ') : 'unknown date';
  return [
    `uid ${message.uid} | ${date}${marks}`,
    `  from:    ${message.from.join(', ') || '(unknown)'}`,
    `  subject: ${message.subject}`,
  ].join('\n');
}

export function formatSearchResults(result) {
  if (result.returned === 0) {
    return `No messages matched in "${result.folder}".`;
  }
  const header =
    result.totalMatches > result.returned
      ? `${result.totalMatches} match(es) in "${result.folder}"; showing the ${result.returned} newest:`
      : `${result.returned} match(es) in "${result.folder}":`;
  return `${header}\n\n${result.messages.map(oneLine).join('\n\n')}`;
}

export function formatMessage(message) {
  const lines = [
    `Folder:     ${message.folder}`,
    `UID:        ${message.uid}`,
    `Date:       ${message.date || '(unknown)'}`,
    `From:       ${message.from || '(unknown)'}`,
    `To:         ${message.to || '(none)'}`,
  ];
  if (message.cc) lines.push(`Cc:         ${message.cc}`);
  if (message.replyTo) lines.push(`Reply-To:   ${message.replyTo}`);
  lines.push(`Subject:    ${message.subject}`);
  lines.push(`Message-ID: ${message.messageId || '(none)'}`);
  lines.push(`Flags:      ${message.flags.join(' ') || '(none)'}`);
  if (message.attachments.length > 0) {
    const list = message.attachments
      .map((a) => `#${a.index} ${a.filename} (${a.contentType}, ${a.sizeBytes} bytes)`)
      .join('; ');
    lines.push(`Attachments: ${list}`);
  }
  lines.push('', '--- body (text) ---', message.text || '(no text part)');
  if (message.html) {
    lines.push('', '--- body (html) ---', message.html);
  }
  return lines.join('\n');
}
