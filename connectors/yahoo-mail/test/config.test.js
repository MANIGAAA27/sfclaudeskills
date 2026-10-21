import assert from 'node:assert/strict';
import { test } from 'node:test';

import { loadConfig } from '../src/config.js';

const base = { YAHOO_EMAIL: 'me@yahoo.com', YAHOO_APP_PASSWORD: 'app-password' };

test('defaults point at Yahoo and read/write mode', () => {
  const config = loadConfig(base);
  assert.equal(config.imap.host, 'imap.mail.yahoo.com');
  assert.equal(config.imap.port, 993);
  assert.equal(config.smtp.host, 'smtp.mail.yahoo.com');
  assert.equal(config.smtp.port, 465);
  assert.equal(config.readOnly, false);
  assert.equal(config.maxBodyChars, 20000);
});

test('missing credentials name the variables and the app-password requirement', () => {
  assert.throws(() => loadConfig({}), /YAHOO_EMAIL, YAHOO_APP_PASSWORD/);
  assert.throws(() => loadConfig({}), /app password/i);
});

test('read-only flag accepts the usual truthy and falsey spellings', () => {
  for (const value of ['1', 'true', 'yes', 'on']) {
    assert.equal(loadConfig({ ...base, YAHOO_MCP_READ_ONLY: value }).readOnly, true, value);
  }
  for (const value of ['', '0', 'false', 'no', 'off']) {
    assert.equal(loadConfig({ ...base, YAHOO_MCP_READ_ONLY: value }).readOnly, false, value);
  }
});

test('invalid numeric settings are rejected rather than silently defaulted', () => {
  assert.throws(() => loadConfig({ ...base, YAHOO_IMAP_PORT: '0' }), /Invalid port/);
  assert.throws(() => loadConfig({ ...base, YAHOO_SMTP_PORT: 'smtp' }), /Invalid port/);
  assert.throws(() => loadConfig({ ...base, YAHOO_MCP_MAX_BODY_CHARS: '-5' }), /positive integer/);
});
