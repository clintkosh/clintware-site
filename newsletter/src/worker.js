import { DurableObject } from "cloudflare:workers";
import {
  chunks,
  cleanText,
  createToken,
  escapeHtml,
  isValidEmail,
  normalizeEmail,
  readRequestPayload,
  secureEquals,
  sha256,
  validBlogPostUrl,
} from "./lib.js";

const CONFIRMATION_COOLDOWN_MS = 10 * 60 * 1000;
const CONFIRMATION_TTL_MS = 48 * 60 * 60 * 1000;
const PUBLICATION_LOCK_MS = 20 * 60 * 1000;
const EMAIL_BATCH_SIZE = 100;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

function plain(text, status = 200, headers = {}) {
  return new Response(text, { status, headers: { "content-type": "text/plain; charset=utf-8", ...headers } });
}

function origins(env) {
  return String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function approvedOrigin(request, env) {
  const origin = request.headers.get("origin");
  return origin && origins(env).includes(origin) ? origin : "";
}

function corsHeaders(origin) {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function endpointUrl(env, pathname, params = {}) {
  const url = new URL(pathname, env.PUBLIC_ENDPOINT);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

function registry(env) {
  return env.SUBSCRIBERS.getByName("clintware-blog-newsletter-v1");
}

function mailConfigured(env) {
  return Boolean(env.RESEND_API_KEY && env.PUBLIC_ENDPOINT && env.SITE_URL && env.FROM_EMAIL);
}

function blogUrl(env) {
  return new URL("/blog/", env.SITE_URL).toString();
}

function confirmationEmail(env, confirmationUrl) {
  const link = escapeHtml(confirmationUrl);
  return {
    from: env.FROM_EMAIL,
    to: [],
    reply_to: env.REPLY_TO || undefined,
    subject: "Confirm your Clintware Blog subscription",
    html: `<!doctype html><html><body style="margin:0;background:#080a0e;color:#f4f7fb;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:auto;background:#10151b;border:1px solid #28323d;border-radius:16px"><tr><td style="padding:32px"><p style="margin:0 0 10px;color:#68e4f6;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">Clintware Blog</p><h1 style="margin:0 0 16px;font-size:28px;line-height:1.15">Confirm your subscription.</h1><p style="margin:0 0 24px;color:#c2cbd7;line-height:1.55">Click once to receive new Clintware field notes when they are published.</p><p style="margin:0 0 26px"><a href="${link}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#68e4f6;color:#071115;font-weight:700;text-decoration:none">Confirm subscription</a></p><p style="margin:0;color:#8290a1;font-size:12px;line-height:1.45">If you did not request this, no action is needed and no subscription will be activated.</p></td></tr></table></td></tr></table></body></html>`,
    text: `Confirm your Clintware Blog subscription:\n${confirmationUrl}\n\nIf you did not request this, no action is needed.`,
  };
}

function notificationEmail(env, publication, subscriber) {
  const unsubscribeUrl = endpointUrl(env, "/unsubscribe", { token: subscriber.unsubscribeToken });
  const title = escapeHtml(publication.title);
  const excerpt = escapeHtml(publication.excerpt);
  const postUrl = escapeHtml(publication.url);
  const unsubscribe = escapeHtml(unsubscribeUrl);
  return {
    from: env.FROM_EMAIL,
    to: [subscriber.email],
    reply_to: env.REPLY_TO || undefined,
    subject: `New Clintware field note: ${publication.title}`,
    html: `<!doctype html><html><body style="margin:0;background:#080a0e;color:#f4f7fb;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;margin:auto;background:#10151b;border:1px solid #28323d;border-radius:16px"><tr><td style="padding:32px"><p style="margin:0 0 10px;color:#82e7b4;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">New field note</p><h1 style="margin:0 0 16px;font-size:28px;line-height:1.15">${title}</h1><p style="margin:0 0 24px;color:#c2cbd7;line-height:1.55">${excerpt}</p><p style="margin:0 0 30px"><a href="${postUrl}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#68e4f6;color:#071115;font-weight:700;text-decoration:none">Read the post</a></p><p style="margin:0;padding-top:18px;border-top:1px solid #28323d;color:#8290a1;font-size:12px;line-height:1.45">You received this because you confirmed Clintware Blog updates. <a href="${unsubscribe}" style="color:#bdf7ff">Unsubscribe</a>.</p></td></tr></table></td></tr></table></body></html>`,
    text: `${publication.title}\n\n${publication.excerpt}\n\nRead: ${publication.url}\n\nUnsubscribe: ${unsubscribeUrl}`,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    tags: [{ name: "category", value: "blog_update" }],
  };
}

async function sendResend(env, path, payload, idempotencyKey) {
  const response = await fetch(`${String(env.RESEND_API_BASE_URL || "https://api.resend.com").replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
      "idempotency-key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const error = new Error("email_delivery_failed");
    error.code = "email_delivery_failed";
    error.status = response.status;
    throw error;
  }
}

function page(title, body) {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#080a0e;color:#f4f7fb;font-family:Inter,Arial,sans-serif}.card{width:min(100%,560px);padding:30px;border:1px solid #28323d;border-radius:18px;background:#10151b}.eyebrow{color:#68e4f6;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase}h1{margin:10px 0 12px;font-size:30px;line-height:1.1}p{color:#c2cbd7;line-height:1.58}a{color:#bdf7ff}</style></head><body><main class="card"><div class="eyebrow">Clintware Blog</div><h1>${escapeHtml(title)}</h1>${body}</main></body></html>`, { headers: { "content-type": "text/html; charset=utf-8" } });
}

function normalizePublication(input, env) {
  const title = cleanText(input.title, 160);
  const excerpt = cleanText(input.excerpt, 500);
  const url = cleanText(input.url, 500);
  if (!title || !excerpt || !validBlogPostUrl(url, env.SITE_URL)) return null;
  return { title, excerpt, url };
}

async function subscribe(request, env) {
  const origin = approvedOrigin(request, env);
  if (!origin) return json({ error: "This subscription request was not accepted." }, 403);
  if (!mailConfigured(env)) return json({ error: "Subscriptions are temporarily unavailable." }, 503, corsHeaders(origin));

  const payload = await readRequestPayload(request);
  if (String(payload.website || "")) {
    return json({ ok: true, message: "Check your inbox to confirm your subscription." }, 202, corsHeaders(origin));
  }
  const consent = payload.consent === true || payload.consent === "true" || payload.consent === "on";
  const email = normalizeEmail(payload.email);
  if (!consent || !isValidEmail(email)) {
    return json({ error: "Enter a valid email address and confirm that you want blog updates." }, 422, corsHeaders(origin));
  }

  const reservation = await registry(env).reserveSubscription(email);
  if (reservation.shouldSend) {
    const confirmUrl = endpointUrl(env, "/confirm", { token: reservation.confirmationToken });
    const message = confirmationEmail(env, confirmUrl);
    message.to = [email];
    await sendResend(env, "/emails", message, `cw-confirm-${await sha256(reservation.confirmationToken)}`);
  }
  return json({ ok: true, message: "Check your inbox to confirm your subscription." }, 202, corsHeaders(origin));
}

async function confirm(url, env) {
  const result = await registry(env).confirmSubscription(url.searchParams.get("token") || "");
  if (result.state === "confirmed") {
    return page("You’re subscribed.", `<p>New Clintware field notes will arrive when they are published.</p><p><a href="${escapeHtml(blogUrl(env))}">Return to the blog</a></p>`);
  }
  if (result.state === "already_confirmed") {
    return page("You’re already subscribed.", `<p>This address is already confirmed for Clintware Blog updates.</p><p><a href="${escapeHtml(blogUrl(env))}">Return to the blog</a></p>`);
  }
  if (result.state === "expired") {
    return page("That confirmation link expired.", `<p>Return to the blog and submit your address again to receive a fresh confirmation email.</p><p><a href="${escapeHtml(blogUrl(env))}">Return to the blog</a></p>`);
  }
  return page("That confirmation link is not valid.", `<p>Return to the blog and submit your address again to receive a fresh confirmation email.</p><p><a href="${escapeHtml(blogUrl(env))}">Return to the blog</a></p>`);
}

async function unsubscribeForm(url, env) {
  const token = url.searchParams.get("token") || "";
  if (!token) return page("That unsubscribe link is not valid.", `<p><a href="${escapeHtml(blogUrl(env))}">Return to the blog</a></p>`);
  const action = escapeHtml(endpointUrl(env, "/unsubscribe", { token }));
  return page("Unsubscribe from blog updates?", `<p>This stops future Clintware Blog notification emails for this address.</p><form method="post" action="${action}"><button type="submit" style="padding:12px 18px;border:0;border-radius:8px;background:#f4f7fb;color:#080a0e;font:inherit;font-weight:700;cursor:pointer">Unsubscribe</button></form>`);
}

async function unsubscribe(request, url, env) {
  let token = url.searchParams.get("token") || "";
  if (!token) {
    const payload = await readRequestPayload(request);
    token = String(payload.token || "");
  }
  const result = await registry(env).unsubscribe(token);
  if (result.state === "unsubscribed" || result.state === "already_unsubscribed") {
    return page("You’re unsubscribed.", `<p>You will not receive future Clintware Blog update emails.</p><p><a href="${escapeHtml(blogUrl(env))}">Return to the blog</a></p>`);
  }
  return page("That unsubscribe link is not valid.", `<p><a href="${escapeHtml(blogUrl(env))}">Return to the blog</a></p>`);
}

async function publish(request, env) {
  if (!mailConfigured(env) || !env.NEWSLETTER_PUBLISH_SECRET) return json({ error: "Newsletter delivery is not configured." }, 503);
  const header = request.headers.get("authorization") || "";
  const suppliedSecret = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!(await secureEquals(env.NEWSLETTER_PUBLISH_SECRET, suppliedSecret))) return json({ error: "Unauthorized." }, 401);

  const payload = await readRequestPayload(request);
  const publication = normalizePublication(payload, env);
  if (!publication) return json({ error: "A valid Clintware blog post is required." }, 422);

  publication.id = (await sha256(publication.url)).slice(0, 32);
  const store = registry(env);
  const claim = await store.claimPublication(publication);
  if (claim.state === "sent") return json({ ok: true, notified: false, reason: "already_sent" });
  if (claim.state === "sending") return json({ error: "This publication is already being delivered." }, 409);

  try {
    const subscribers = await store.confirmedSubscribers();
    const batches = chunks(subscribers, EMAIL_BATCH_SIZE);
    for (const [index, batch] of batches.entries()) {
      const messages = batch.map((subscriber) => notificationEmail(env, publication, subscriber));
      await sendResend(env, "/emails/batch", messages, `cw-blog-${publication.id}-${index}`);
    }
    await store.completePublication(publication.url, subscribers.length);
    return json({ ok: true, notified: true, recipients: subscribers.length }, 202);
  } catch (error) {
    await store.failPublication(publication.url);
    throw error;
  }
}

export class SubscriberRegistry extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS subscribers (
        email TEXT PRIMARY KEY NOT NULL,
        status TEXT NOT NULL,
        confirmation_token_hash TEXT,
        confirmation_expires_at INTEGER,
        confirmation_sent_at INTEGER,
        unsubscribe_token TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        confirmed_at INTEGER,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS publications (
        url TEXT PRIMARY KEY NOT NULL,
        publication_id TEXT NOT NULL,
        title TEXT NOT NULL,
        excerpt TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        sent_at INTEGER,
        recipient_count INTEGER NOT NULL DEFAULT 0
      );
    `);
  }

  async reserveSubscription(email) {
    const now = Date.now();
    const existing = this.sql.exec("SELECT status, confirmation_sent_at FROM subscribers WHERE email = ?", email).toArray()[0];
    if (existing?.status === "confirmed") return { shouldSend: false };
    if (existing?.status === "pending" && Number(existing.confirmation_sent_at) > now - CONFIRMATION_COOLDOWN_MS) {
      return { shouldSend: false };
    }

    const confirmationToken = createToken();
    const confirmationHash = await sha256(confirmationToken);
    const unsubscribeToken = createToken();
    if (existing) {
      this.sql.exec(
        `UPDATE subscribers
         SET status = 'pending', confirmation_token_hash = ?, confirmation_expires_at = ?, confirmation_sent_at = ?, unsubscribe_token = ?, updated_at = ?
         WHERE email = ? AND status != 'confirmed'`,
        confirmationHash,
        now + CONFIRMATION_TTL_MS,
        now,
        unsubscribeToken,
        now,
        email,
      );
    } else {
      this.sql.exec(
        `INSERT INTO subscribers (email, status, confirmation_token_hash, confirmation_expires_at, confirmation_sent_at, unsubscribe_token, created_at, updated_at)
         VALUES (?, 'pending', ?, ?, ?, ?, ?, ?)`,
        email,
        confirmationHash,
        now + CONFIRMATION_TTL_MS,
        now,
        unsubscribeToken,
        now,
        now,
      );
    }
    const current = this.sql.exec("SELECT status FROM subscribers WHERE email = ?", email).toArray()[0];
    return current?.status === "confirmed" ? { shouldSend: false } : { shouldSend: true, confirmationToken };
  }

  async confirmSubscription(token) {
    if (!token) return { state: "invalid" };
    const hash = await sha256(token);
    const row = this.sql.exec(
      "SELECT email, status, confirmation_expires_at FROM subscribers WHERE confirmation_token_hash = ?",
      hash,
    ).toArray()[0];
    if (!row) return { state: "invalid" };
    if (row.status === "confirmed") return { state: "already_confirmed" };
    if (Number(row.confirmation_expires_at) < Date.now()) return { state: "expired" };
    const now = Date.now();
    this.sql.exec(
      "UPDATE subscribers SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE email = ? AND status = 'pending'",
      now,
      now,
      row.email,
    );
    return { state: "confirmed" };
  }

  async unsubscribe(token) {
    if (!token) return { state: "invalid" };
    const row = this.sql.exec("SELECT email, status FROM subscribers WHERE unsubscribe_token = ?", token).toArray()[0];
    if (!row) return { state: "invalid" };
    if (row.status === "unsubscribed") return { state: "already_unsubscribed" };
    this.sql.exec("UPDATE subscribers SET status = 'unsubscribed', updated_at = ? WHERE email = ?", Date.now(), row.email);
    return { state: "unsubscribed" };
  }

  async claimPublication(publication) {
    const now = Date.now();
    const existing = this.sql.exec("SELECT status, started_at FROM publications WHERE url = ?", publication.url).toArray()[0];
    if (existing?.status === "sent") return { state: "sent" };
    if (existing?.status === "sending" && Number(existing.started_at) > now - PUBLICATION_LOCK_MS) return { state: "sending" };
    if (existing) {
      this.sql.exec(
        "UPDATE publications SET publication_id = ?, title = ?, excerpt = ?, status = 'sending', started_at = ? WHERE url = ?",
        publication.id,
        publication.title,
        publication.excerpt,
        now,
        publication.url,
      );
    } else {
      this.sql.exec(
        "INSERT INTO publications (url, publication_id, title, excerpt, status, started_at) VALUES (?, ?, ?, ?, 'sending', ?)",
        publication.url,
        publication.id,
        publication.title,
        publication.excerpt,
        now,
      );
    }
    return { state: "claimed" };
  }

  async confirmedSubscribers() {
    return this.sql.exec(
      "SELECT email, unsubscribe_token AS unsubscribeToken FROM subscribers WHERE status = 'confirmed' ORDER BY email ASC",
    ).toArray();
  }

  async completePublication(url, recipientCount) {
    this.sql.exec(
      "UPDATE publications SET status = 'sent', sent_at = ?, recipient_count = ? WHERE url = ?",
      Date.now(),
      recipientCount,
      url,
    );
  }

  async failPublication(url) {
    this.sql.exec("UPDATE publications SET status = 'failed' WHERE url = ?", url);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (request.method === "OPTIONS" && url.pathname === "/subscribe") {
        const origin = approvedOrigin(request, env);
        return origin ? new Response(null, { status: 204, headers: corsHeaders(origin) }) : plain("Forbidden", 403);
      }
      if (request.method === "GET" && url.pathname === "/health") return json({ ok: true, deliveryConfigured: mailConfigured(env) });
      if (request.method === "POST" && url.pathname === "/subscribe") return subscribe(request, env);
      if (request.method === "GET" && url.pathname === "/confirm") return confirm(url, env);
      if (request.method === "GET" && url.pathname === "/unsubscribe") return unsubscribeForm(url, env);
      if (request.method === "POST" && url.pathname === "/unsubscribe") return unsubscribe(request, url, env);
      if (request.method === "POST" && url.pathname === "/publish") return publish(request, env);
      return plain("Not found", 404);
    } catch (error) {
      console.error(JSON.stringify({ event: "newsletter_error", route: url.pathname, code: error.code || "internal_error" }));
      const status = error.code === "payload_too_large" ? 413 : error.code === "invalid_payload" ? 400 : 500;
      return json({ error: "The request could not be completed." }, status);
    }
  },
};
