#!/usr/bin/env node
// Credential smoke test: proves the app password works for both IMAP and SMTP
// before wiring the server into Claude Code. Run with: npm run check

import { loadConfig } from '../src/config.js';
import { verifyImap } from '../src/imap.js';
import { verifySmtp } from '../src/smtp.js';

function hint(error) {
  const message = String(error.message || error);
  if (/AUTHENTICATIONFAILED|Invalid credentials|535|534/i.test(message)) {
    return (
      'Authentication was rejected. Yahoo does not accept account passwords for IMAP/SMTP — ' +
      'generate an app password at https://login.yahoo.com/account/security and use that as YAHOO_APP_PASSWORD.'
    );
  }
  if (/ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNREFUSED/i.test(message)) {
    return 'Could not reach the Yahoo server. Check network access and any outbound firewall on ports 993/465.';
  }
  return null;
}

async function step(label, fn) {
  process.stdout.write(`${label} ... `);
  try {
    const result = await fn();
    process.stdout.write('ok\n');
    return { ok: true, result };
  } catch (error) {
    process.stdout.write('FAILED\n');
    process.stdout.write(`  ${error.message}\n`);
    const extra = hint(error);
    if (extra) process.stdout.write(`  ${extra}\n`);
    return { ok: false };
  }
}

const config = loadConfig();
process.stdout.write(`Account: ${config.email}\n`);
process.stdout.write(`IMAP:    ${config.imap.host}:${config.imap.port}\n`);
process.stdout.write(`SMTP:    ${config.smtp.host}:${config.smtp.port}\n`);
process.stdout.write(`Mode:    ${config.readOnly ? 'read-only' : 'read/write'}\n\n`);

const imap = await step('IMAP login + INBOX status', () => verifyImap(config));
const smtp = await step('SMTP login', () => verifySmtp(config));

if (imap.ok) {
  process.stdout.write(
    `\nINBOX: ${imap.result.inboxMessages} message(s), ${imap.result.inboxUnseen} unread.\n`
  );
}

if (!imap.ok || !smtp.ok) {
  process.stdout.write('\nConnection check failed.\n');
  process.exit(1);
}
process.stdout.write('\nConnection check passed.\n');
