// Outbound mail: compose the RFC822 source once, then hand the same bytes to
// SMTP and to IMAP APPEND. Yahoo's SMTP does not file a copy in Sent by itself,
// so sending and saving have to share one byte-identical message.

import nodemailer from 'nodemailer';

function fromHeader(config) {
  return config.fromName ? { name: config.fromName, address: config.email } : config.email;
}

/** Pull the bare address out of "Name <a@b.com>" or a plain address. */
function bareAddress(value) {
  const match = /<([^>]+)>/.exec(String(value));
  return (match ? match[1] : String(value)).trim();
}

/**
 * Compose the message locally and return its raw bytes plus the SMTP envelope.
 *
 * Bcc is deliberately kept out of the composer: nodemailer's stream transport
 * forces keepBcc, which would write the Bcc header into the bytes we send and
 * expose those addresses to every recipient. Bcc is an envelope-only concept,
 * so the addresses are added to the envelope instead. Consequence: the copy
 * filed in Sent records To and Cc but not Bcc.
 */
export async function composeRaw(config, mail) {
  const { bcc, ...headers } = mail;
  const composer = nodemailer.createTransport({
    streamTransport: true,
    buffer: true,
    // CRLF line endings: required by IMAP APPEND and safe for SMTP.
    newline: 'windows',
  });
  const info = await composer.sendMail({ ...headers, from: mail.from || fromHeader(config) });

  const envelope = {
    ...info.envelope,
    to: [...(info.envelope.to || []), ...(bcc || []).map(bareAddress)],
  };
  return { raw: info.message, envelope, messageId: info.messageId };
}

/**
 * Yahoo listens on 465 (implicit TLS) and 587 (STARTTLS). Either way the
 * session must be encrypted before the app password goes over the wire.
 */
export function smtpTransportOptions(config) {
  const implicitTls = config.smtp.port === 465;
  return {
    host: config.smtp.host,
    port: config.smtp.port,
    secure: implicitTls,
    requireTLS: !implicitTls,
    auth: { user: config.email, pass: config.appPassword },
  };
}

function createSmtpTransport(config) {
  return nodemailer.createTransport(smtpTransportOptions(config));
}

export async function sendRaw(config, { raw, envelope }) {
  const transport = createSmtpTransport(config);
  try {
    const info = await transport.sendMail({ envelope, raw });
    return { accepted: info.accepted || [], rejected: info.rejected || [], response: info.response };
  } finally {
    transport.close();
  }
}

export async function verifySmtp(config) {
  const transport = createSmtpTransport(config);
  try {
    await transport.verify();
    return { host: config.smtp.host, port: config.smtp.port };
  } finally {
    transport.close();
  }
}

export { fromHeader };
