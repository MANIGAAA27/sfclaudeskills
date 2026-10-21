// Protocol-level test: boots the real server over stdio with dummy credentials
// and asserts the advertised tool surface. No network and no Yahoo account needed.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const serverPath = fileURLToPath(new URL('../src/index.js', import.meta.url));

const READ_TOOLS = [
  'yahoo_list_folders',
  'yahoo_search_messages',
  'yahoo_get_message',
  'yahoo_save_attachment',
];

const WRITE_TOOLS = [
  'yahoo_send_message',
  'yahoo_reply_message',
  'yahoo_create_draft',
  'yahoo_set_flags',
  'yahoo_move_messages',
  'yahoo_trash_messages',
];

async function toolNames(env) {
  const client = new Client({ name: 'tool-surface-test', version: '1.0.0' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    env: { PATH: process.env.PATH, ...env },
  });
  await client.connect(transport);
  try {
    const { tools } = await client.listTools();
    return { names: tools.map((t) => t.name).sort(), tools };
  } finally {
    await client.close();
  }
}

const CREDENTIALS = {
  YAHOO_EMAIL: 'test@yahoo.com',
  YAHOO_APP_PASSWORD: 'dummy-app-password',
};

test('registers every read and write tool by default', async () => {
  const { names, tools } = await toolNames(CREDENTIALS);
  assert.deepEqual(names, [...READ_TOOLS, ...WRITE_TOOLS].sort());
  for (const tool of tools) {
    assert.ok(tool.description, `${tool.name} is missing a description`);
    assert.equal(tool.inputSchema.type, 'object', `${tool.name} has no object input schema`);
  }
});

test('read-only mode drops the write tools', async () => {
  const { names } = await toolNames({ ...CREDENTIALS, YAHOO_MCP_READ_ONLY: '1' });
  assert.deepEqual(names, [...READ_TOOLS].sort());
});

test('search schema exposes the documented criteria', async () => {
  const { tools } = await toolNames(CREDENTIALS);
  const search = tools.find((t) => t.name === 'yahoo_search_messages');
  const properties = Object.keys(search.inputSchema.properties).sort();
  assert.deepEqual(properties, [
    'before',
    'body',
    'flagged_only',
    'folder',
    'from',
    'limit',
    'since',
    'subject',
    'to',
    'unread_only',
  ]);
});

test('exits with a clear error when credentials are missing', async () => {
  await assert.rejects(() => toolNames({ YAHOO_EMAIL: 'test@yahoo.com' }));
});
