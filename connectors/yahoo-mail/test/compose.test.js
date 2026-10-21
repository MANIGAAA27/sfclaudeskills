// Offline tests for message composition, threading headers and transport
// options. These cover the parts that are easy to get subtly wrong and that a
// live mailbox would only reveal after the fact.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { simpleParser } from 'mailparser';

import { loadConfig } from '../src/config.js';
import { composeRaw, smtpTransportOptions } from '../src/smtp.js';
import { buildReply, replySubject } from '../src/reply.js';
import { buildSearchQuery } from '../src/imap.js';

const config = loadConfig({
  YAHOO_EMAIL: 'me@yahoo.com',
  YAHOO_APP_PASSWORD: 'app-password',
  YAHOO_FROM_NAME: 'Test Sender',
});

test('composed message uses CRLF and the connected account as From', async () => {
  const { raw, envelope, messageId } = await composeRaw(config, {
    to: ['someone@example.com'],
    subject: 'Status',
    text: 'Line one\nLine two',
  });
  const source = raw.toString('utf8');

  assert.ok(source.includes('\r\n'), 'expected CRLF line endings for IMAP APPEND');
  assert.ok(!/[^\r]\n/.test(source), 'expected no bare LF line endings');
  assert.match(source, /^From: Test Sender <me@yahoo\.com>$/m);
  assert.equal(envelope.from, 'me@yahoo.com');
  assert.deepEqual(envelope.to, ['someone@example.com']);
  assert.ok(messageId.startsWith('<'));

  const parsed = await simpleParser(raw);
  assert.equal(parsed.subject, 'Status');
  assert.equal(parsed.text.trim(), 'Line one\nLine two');
});

test('bcc stays out of the headers but inside the envelope', async () => {
  const { raw, envelope } = await composeRaw(config, {
    to: ['a@example.com'],
    bcc: ['hidden@example.com', 'Quiet Watcher <watcher@example.com>'],
    subject: 'Quiet',
    text: 'body',
  });
  const source = raw.toString('utf8');
  assert.ok(!source.includes('hidden@example.com'), 'bcc must not appear in the message headers');
  assert.ok(!/^Bcc:/m.test(source), 'no Bcc header may survive into the sent bytes');
  assert.deepEqual(envelope.to, ['a@example.com', 'hidden@example.com', 'watcher@example.com']);
});

test('reply carries the threading headers the original dictates', async () => {
  const original = {
    uid: 11,
    subject: 'Deploy window',
    date: '2026-03-02T10:00:00.000Z',
    from: 'Boss <boss@example.com>',
    messageId: '<original@example.com>',
    references: '<root@example.com>',
    text: 'When are we shipping?',
    parsed: {
      from: { value: [{ address: 'boss@example.com' }] },
      to: { value: [{ address: 'me@yahoo.com' }, { address: 'peer@example.com' }] },
      cc: { value: [{ address: 'cfo@example.com' }] },
      replyTo: null,
    },
  };

  const mail = buildReply(config, original, { text: 'Friday.', replyAll: true });
  assert.deepEqual(mail.to, ['boss@example.com']);
  assert.deepEqual(mail.cc, ['peer@example.com', 'cfo@example.com']);
  assert.ok(!mail.cc.includes('me@yahoo.com'), 'must not Cc the connected account');
  assert.equal(mail.subject, 'Re: Deploy window');
  assert.equal(mail.inReplyTo, '<original@example.com>');
  assert.equal(mail.references, '<root@example.com> <original@example.com>');
  assert.match(mail.text, /^Friday\./);
  assert.match(mail.text, /> When are we shipping\?/);

  const { raw } = await composeRaw(config, mail);
  const parsed = await simpleParser(raw);
  assert.equal(parsed.inReplyTo, '<original@example.com>');
  assert.deepEqual(parsed.references, ['<root@example.com>', '<original@example.com>']);
});

test('reply prefers Reply-To over From', () => {
  const original = {
    uid: 12,
    subject: 'Re: Ticket 9',
    messageId: '<m@example.com>',
    parsed: {
      from: { value: [{ address: 'noreply@example.com' }] },
      replyTo: { value: [{ address: 'support@example.com' }] },
      to: { value: [] },
      cc: { value: [] },
    },
  };
  const mail = buildReply(config, original, { text: 'thanks', quote: false });
  assert.deepEqual(mail.to, ['support@example.com']);
  assert.equal(mail.subject, 'Re: Ticket 9', 'must not double up the Re: prefix');
});

test('reply fails loudly when there is nobody to reply to', () => {
  const original = {
    uid: 13,
    subject: 'Orphan',
    parsed: { from: { value: [{ address: 'me@yahoo.com' }] }, to: { value: [] }, cc: { value: [] } },
  };
  assert.throws(() => buildReply(config, original, { text: 'hi' }), /Cannot determine a reply recipient/);
});

test('replySubject handles missing and prefixed subjects', () => {
  assert.equal(replySubject(undefined), 'Re:');
  assert.equal(replySubject('RE: shout'), 'RE: shout');
  assert.equal(replySubject('plain'), 'Re: plain');
});

test('search query maps arguments to IMAP criteria', () => {
  assert.deepEqual(buildSearchQuery({}), { all: true });
  assert.deepEqual(buildSearchQuery({ unread_only: true }), { seen: false });
  assert.deepEqual(buildSearchQuery({ flagged_only: true }), { flagged: true });

  const dated = buildSearchQuery({ from: 'boss', since: '2026-03-01' });
  assert.equal(dated.from, 'boss');
  assert.equal(dated.since.toISOString().slice(0, 10), '2026-03-01');

  assert.throws(() => buildSearchQuery({ since: 'last tuesday' }), /Invalid since date/);
});

test('smtp transport options encrypt on both supported ports', () => {
  const implicit = smtpTransportOptions(config);
  assert.equal(implicit.port, 465);
  assert.equal(implicit.secure, true);
  assert.equal(implicit.requireTLS, false);

  const starttls = smtpTransportOptions(
    loadConfig({ YAHOO_EMAIL: 'me@yahoo.com', YAHOO_APP_PASSWORD: 'p', YAHOO_SMTP_PORT: '587' })
  );
  assert.equal(starttls.port, 587);
  assert.equal(starttls.secure, false);
  assert.equal(starttls.requireTLS, true);
});
