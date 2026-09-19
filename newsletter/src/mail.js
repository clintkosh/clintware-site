function base64Utf8(value) {
  const bytes = new TextEncoder().encode(String(value));
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
function base64UrlUtf8(value) {
  return base64Utf8(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function encodeHeader(value) {
  const text = String(value || "");
  return /^[\x20-\x7E]*$/.test(text) ? text : `=?UTF-8?B?${base64Utf8(text)}?=`;
}
function list(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean).map(String) : [String(value)];
}
function safeFilename(value) {
  return String(value || "attachment.bin").replace(/[\r\n"]/g, "_").slice(0, 120) || "attachment.bin";
}
function safeType(value) {
  return String(value || "application/octet-stream").replace(/[\r\n]/g, "").trim() || "application/octet-stream";
}
function mimeMessage(payload, from) {
  const mixed = `cw-mixed-${crypto.randomUUID()}`;
  const alt = `cw-alt-${crypto.randomUUID()}`;
  const lines = [];
  lines.push(`From: ${from}`);
  lines.push(`To: ${list(payload.to).join(", ")}`);
  const cc = list(payload.cc), bcc = list(payload.bcc);
  if (cc.length) lines.push(`Cc: ${cc.join(", ")}`);
  if (bcc.length) lines.push(`Bcc: ${bcc.join(", ")}`);
  if (payload.reply_to) lines.push(`Reply-To: ${payload.reply_to}`);
  lines.push(`Subject: ${encodeHeader(payload.subject)}`);
  lines.push("MIME-Version: 1.0");
  for (const [name, value] of Object.entries(payload.headers || {})) {
    const safeName = String(name).replace(/[^A-Za-z0-9-]/g, "");
    if (!safeName || /^(to|cc|bcc|from|subject|reply-to|mime-version)$/i.test(safeName)) continue;
    lines.push(`${safeName}: ${String(value).replace(/[\r\n]+/g, " ").slice(0, 1000)}`);
  }
  const attachments = Array.isArray(payload.attachments) ? payload.attachments : [];
  lines.push(`Content-Type: multipart/${attachments.length ? "mixed" : "alternative"}; boundary="${attachments.length ? mixed : alt}"`);
  lines.push("");
  if (attachments.length) {
    lines.push(`--${mixed}`);
    lines.push(`Content-Type: multipart/alternative; boundary="${alt}"`);
    lines.push("");
  }
  if (payload.text) {
    lines.push(`--${alt}`, 'Content-Type: text/plain; charset="UTF-8"', "Content-Transfer-Encoding: base64", "", base64Utf8(payload.text));
  }
  if (payload.html) {
    lines.push(`--${alt}`, 'Content-Type: text/html; charset="UTF-8"', "Content-Transfer-Encoding: base64", "", base64Utf8(payload.html));
  }
  lines.push(`--${alt}--`);
  if (attachments.length) {
    for (const item of attachments) {
      const filename = safeFilename(item.filename);
      lines.push(`--${mixed}`);
      lines.push(`Content-Type: ${safeType(item.content_type)}; name="${filename}"`);
      lines.push(`Content-Disposition: attachment; filename="${filename}"`);
      lines.push("Content-Transfer-Encoding: base64", "", String(item.content || "").replace(/\s+/g, ""));
    }
    lines.push(`--${mixed}--`);
  }
  return lines.join("\r\n");
}
export function mailProvider(env) {
  return String(env.MAIL_PROVIDER || "gmail").toLowerCase();
}
export function mailConfigured(env) {
  const provider = mailProvider(env);
  if (provider === "gmail") return Boolean(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET && env.GOOGLE_DELEGATED_REFRESH_TOKEN && env.FROM_EMAIL);
  if (provider === "smtp") return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USERNAME && env.SMTP_PASSWORD && env.FROM_EMAIL);
  return false;
}
async function gmailAccessToken(env) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      refresh_token: env.GOOGLE_DELEGATED_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    const error = new Error("gmail_oauth_refresh_failed");
    error.code = "gmail_oauth_refresh_failed";
    error.status = response.status;
    throw error;
  }
  return data.access_token;
}
async function sendGmail(env, payload) {
  const token = await gmailAccessToken(env);
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ raw: base64UrlUtf8(mimeMessage(payload, env.FROM_EMAIL)) }),
  });
  if (!response.ok) {
    const error = new Error("email_delivery_failed");
    error.code = "email_delivery_failed";
    error.status = response.status;
    error.detail = (await response.text().catch(() => "")).slice(0, 500);
    throw error;
  }
  return response.json().catch(() => ({ ok: true }));
}
async function sendSmtp() {
  const error = new Error("smtp_transport_not_enabled_on_cloudflare");
  error.code = "smtp_transport_not_enabled_on_cloudflare";
  throw error;
}
export async function sendMail(env, payload) {
  if (!mailConfigured(env)) {
    const error = new Error("mail_not_configured");
    error.code = "mail_not_configured";
    throw error;
  }
  const provider = mailProvider(env);
  if (provider === "gmail") return sendGmail(env, payload);
  if (provider === "smtp") return sendSmtp(env, payload);
  const error = new Error("unsupported_mail_provider");
  error.code = "unsupported_mail_provider";
  throw error;
}
export async function sendMailBatch(env, messages, concurrency = 5) {
  const queue = [...messages], results = [];
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, queue.length || 1)) }, async () => {
    while (queue.length) results.push(await sendMail(env, queue.shift()));
  });
  await Promise.all(workers);
  return results;
}
