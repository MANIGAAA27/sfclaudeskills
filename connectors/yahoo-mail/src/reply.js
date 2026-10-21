// Reply construction: recipients, threading headers, and the quoted original.

function sameAddress(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

function addressesOf(field) {
  return (field?.value || [])
    .map((entry) => entry.address)
    .filter(Boolean);
}

function unique(addresses, exclude) {
  const seen = new Set();
  const result = [];
  for (const address of addresses) {
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    if (exclude.some((skip) => sameAddress(skip, address))) continue;
    seen.add(key);
    result.push(address);
  }
  return result;
}

export function replySubject(subject) {
  const base = (subject || '').trim();
  if (!base) return 'Re:';
  return /^re:/i.test(base) ? base : `Re: ${base}`;
}

export function quoteOriginal(original) {
  const attribution = `On ${original.date || 'an earlier date'}, ${original.from || 'the sender'} wrote:`;
  const body = (original.text || '').split('\n').map((line) => `> ${line}`).join('\n');
  return `\n\n${attribution}\n${body}`;
}

/**
 * Turn a fetched message into reply mail options.
 * `replyAll` adds the original To and Cc recipients, minus our own address.
 */
export function buildReply(config, original, { text, html, replyAll = false, quote = true }) {
  const parsed = original.parsed;
  const replyToAddresses = addressesOf(parsed.replyTo);
  const fromAddresses = addressesOf(parsed.from);
  const primary = unique(
    replyToAddresses.length > 0 ? replyToAddresses : fromAddresses,
    [config.email]
  );

  if (primary.length === 0) {
    throw new Error(
      `Cannot determine a reply recipient for UID ${original.uid} (the message has no usable From or Reply-To).`
    );
  }

  const cc = replyAll
    ? unique([...addressesOf(parsed.to), ...addressesOf(parsed.cc)], [config.email, ...primary])
    : [];

  const references = [original.references, original.messageId]
    .flat()
    .filter(Boolean)
    .join(' ')
    .trim();

  const bodyText = quote && original.text ? `${text || ''}${quoteOriginal(original)}` : text;

  return {
    to: primary,
    cc: cc.length > 0 ? cc : undefined,
    subject: replySubject(original.subject),
    text: bodyText,
    html,
    inReplyTo: original.messageId || undefined,
    references: references || undefined,
  };
}
