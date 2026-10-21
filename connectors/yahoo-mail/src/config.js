// Configuration for the Yahoo Mail MCP server. Everything comes from the
// environment so no credential is ever written into the repo or .mcp.json.

const DEFAULTS = {
  imapHost: 'imap.mail.yahoo.com',
  imapPort: 993,
  smtpHost: 'smtp.mail.yahoo.com',
  smtpPort: 465,
  maxBodyChars: 20000,
  downloadDir: 'yahoo-attachments',
};

function truthy(value) {
  if (value === undefined || value === null) return false;
  return !['', '0', 'false', 'no', 'off'].includes(String(value).trim().toLowerCase());
}

function port(value, fallback) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid port: ${value}`);
  }
  return parsed;
}

function positiveInt(value, fallback) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Expected a positive integer, got: ${value}`);
  }
  return parsed;
}

export function loadConfig(env = process.env) {
  const email = (env.YAHOO_EMAIL || '').trim();
  const appPassword = env.YAHOO_APP_PASSWORD || '';

  const missing = [];
  if (!email) missing.push('YAHOO_EMAIL');
  if (!appPassword) missing.push('YAHOO_APP_PASSWORD');
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}.\n` +
        'YAHOO_APP_PASSWORD must be a Yahoo app password (not your account password): ' +
        'https://login.yahoo.com/account/security -> "Generate app password".'
    );
  }

  return {
    email,
    appPassword,
    fromName: (env.YAHOO_FROM_NAME || '').trim(),
    imap: {
      host: env.YAHOO_IMAP_HOST || DEFAULTS.imapHost,
      port: port(env.YAHOO_IMAP_PORT, DEFAULTS.imapPort),
    },
    smtp: {
      host: env.YAHOO_SMTP_HOST || DEFAULTS.smtpHost,
      port: port(env.YAHOO_SMTP_PORT, DEFAULTS.smtpPort),
    },
    readOnly: truthy(env.YAHOO_MCP_READ_ONLY),
    maxBodyChars: positiveInt(env.YAHOO_MCP_MAX_BODY_CHARS, DEFAULTS.maxBodyChars),
    downloadDir: env.YAHOO_MCP_DOWNLOAD_DIR || DEFAULTS.downloadDir,
  };
}

export { DEFAULTS };
