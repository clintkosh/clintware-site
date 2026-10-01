const CONFIRMATION_COOLDOWN_MS = 10 * 60 * 1000;
const CONFIRMATION_TTL_MS = 48 * 60 * 60 * 1000;
const PUBLICATION_LOCK_MS = 20 * 60 * 1000;

function requireDb(db) {
  if (!db || typeof db.prepare !== "function") {
    const error = new Error("newsletter_state_not_configured");
    error.code = "newsletter_state_not_configured";
    throw error;
  }
  return db;
}

async function first(db, sql, ...values) {
  return requireDb(db).prepare(sql).bind(...values).first();
}

async function all(db, sql, ...values) {
  const result = await requireDb(db).prepare(sql).bind(...values).all();
  return Array.isArray(result?.results) ? result.results : [];
}

async function run(db, sql, ...values) {
  return requireDb(db).prepare(sql).bind(...values).run();
}

export class D1SubscriberRegistry {
  constructor(db, helpers = {}) {
    this.db = requireDb(db);
    this.createToken = helpers.createToken;
    this.sha256 = helpers.sha256;
    if (typeof this.createToken !== "function" || typeof this.sha256 !== "function") {
      throw new TypeError("D1SubscriberRegistry requires createToken and sha256 helpers");
    }
  }

  async reserveSubscription(email) {
    const now = Date.now();
    const existing = await first(this.db,
      "SELECT status, confirmation_sent_at FROM subscribers WHERE email = ?",
      email,
    );
    if (existing?.status === "confirmed") return { shouldSend: false };
    if (existing?.status === "pending" && Number(existing.confirmation_sent_at) > now - CONFIRMATION_COOLDOWN_MS) {
      return { shouldSend: false };
    }

    const confirmationToken = this.createToken();
    const confirmationHash = await this.sha256(confirmationToken);
    const unsubscribeToken = this.createToken();
    if (existing) {
      await run(this.db,
        `UPDATE subscribers
         SET status = 'pending',
             confirmation_token_hash = ?,
             confirmation_expires_at = ?,
             confirmation_sent_at = ?,
             unsubscribe_token = ?,
             updated_at = ?
         WHERE email = ? AND status != 'confirmed'`,
        confirmationHash,
        now + CONFIRMATION_TTL_MS,
        now,
        unsubscribeToken,
        now,
        email,
      );
    } else {
      await run(this.db,
        `INSERT INTO subscribers
          (email, status, confirmation_token_hash, confirmation_expires_at, confirmation_sent_at, unsubscribe_token, created_at, updated_at)
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

    const current = await first(this.db, "SELECT status FROM subscribers WHERE email = ?", email);
    return current?.status === "confirmed"
      ? { shouldSend: false }
      : { shouldSend: true, confirmationToken };
  }

  async confirmSubscription(token) {
    if (!token) return { state: "invalid" };
    const hash = await this.sha256(token);
    const row = await first(this.db,
      "SELECT email, status, confirmation_expires_at FROM subscribers WHERE confirmation_token_hash = ?",
      hash,
    );
    if (!row) return { state: "invalid" };
    if (row.status === "confirmed") return { state: "already_confirmed" };
    if (Number(row.confirmation_expires_at) < Date.now()) return { state: "expired" };
    const now = Date.now();
    await run(this.db,
      "UPDATE subscribers SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE email = ? AND status = 'pending'",
      now, now, row.email,
    );
    return { state: "confirmed" };
  }

  async unsubscribe(token) {
    if (!token) return { state: "invalid" };
    const row = await first(this.db,
      "SELECT email, status FROM subscribers WHERE unsubscribe_token = ?",
      token,
    );
    if (!row) return { state: "invalid" };
    if (row.status === "unsubscribed") return { state: "already_unsubscribed" };
    await run(this.db,
      "UPDATE subscribers SET status = 'unsubscribed', updated_at = ? WHERE email = ?",
      Date.now(), row.email,
    );
    return { state: "unsubscribed" };
  }

  async claimPublication(publication) {
    const now = Date.now();
    const existing = await first(this.db,
      "SELECT status, started_at FROM publications WHERE url = ?",
      publication.url,
    );
    if (existing?.status === "sent") return { state: "sent" };
    if (existing?.status === "sending" && Number(existing.started_at) > now - PUBLICATION_LOCK_MS) {
      return { state: "sending" };
    }

    await run(this.db,
      `INSERT INTO publications
         (url, publication_id, title, excerpt, status, started_at, sent_at, recipient_count)
       VALUES (?, ?, ?, ?, 'sending', ?, NULL, 0)
       ON CONFLICT(url) DO UPDATE SET
         publication_id = excluded.publication_id,
         title = excluded.title,
         excerpt = excluded.excerpt,
         status = 'sending',
         started_at = excluded.started_at`,
      publication.url,
      publication.id,
      publication.title,
      publication.excerpt,
      now,
    );
    return { state: "claimed" };
  }

  async confirmedSubscribers() {
    return all(this.db,
      "SELECT email, unsubscribe_token AS unsubscribeToken FROM subscribers WHERE status = 'confirmed' ORDER BY email ASC",
    );
  }

  async completePublication(url, recipientCount) {
    await run(this.db,
      "UPDATE publications SET status = 'sent', sent_at = ?, recipient_count = ? WHERE url = ?",
      Date.now(), recipientCount, url,
    );
  }

  async deferPublication(url) {
    await run(this.db,
      "UPDATE publications SET status = 'pending_auth' WHERE url = ?",
      url,
    );
  }

  async pendingPublications() {
    return all(this.db,
      "SELECT url, publication_id AS publicationId, title, excerpt FROM publications WHERE status = 'pending_auth' ORDER BY started_at ASC LIMIT 20",
    );
  }

  async pendingPublicationCount() {
    const row = await first(this.db,
      "SELECT COUNT(*) AS count FROM publications WHERE status = 'pending_auth'",
    );
    return Number(row?.count || 0);
  }

  async failPublication(url) {
    await run(this.db,
      "UPDATE publications SET status = 'failed' WHERE url = ?",
      url,
    );
  }

  async importLegacy(snapshot) {
    const subscribers = Array.isArray(snapshot?.subscribers) ? snapshot.subscribers : [];
    const publications = Array.isArray(snapshot?.publications) ? snapshot.publications : [];

    for (const row of subscribers) {
      if (!row?.email || !row?.unsubscribe_token) continue;
      await run(this.db,
        `INSERT INTO subscribers
          (email, status, confirmation_token_hash, confirmation_expires_at, confirmation_sent_at,
           unsubscribe_token, created_at, confirmed_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(email) DO UPDATE SET
           status = CASE
             WHEN excluded.updated_at >= subscribers.updated_at THEN excluded.status
             ELSE subscribers.status
           END,
           confirmation_token_hash = CASE
             WHEN excluded.updated_at >= subscribers.updated_at THEN excluded.confirmation_token_hash
             ELSE subscribers.confirmation_token_hash
           END,
           confirmation_expires_at = CASE
             WHEN excluded.updated_at >= subscribers.updated_at THEN excluded.confirmation_expires_at
             ELSE subscribers.confirmation_expires_at
           END,
           confirmation_sent_at = CASE
             WHEN excluded.updated_at >= subscribers.updated_at THEN excluded.confirmation_sent_at
             ELSE subscribers.confirmation_sent_at
           END,
           unsubscribe_token = CASE
             WHEN excluded.updated_at >= subscribers.updated_at THEN excluded.unsubscribe_token
             ELSE subscribers.unsubscribe_token
           END,
           confirmed_at = CASE
             WHEN excluded.updated_at >= subscribers.updated_at THEN excluded.confirmed_at
             ELSE subscribers.confirmed_at
           END,
           updated_at = MAX(subscribers.updated_at, excluded.updated_at)`,
        row.email,
        row.status || "pending",
        row.confirmation_token_hash || null,
        row.confirmation_expires_at ?? null,
        row.confirmation_sent_at ?? null,
        row.unsubscribe_token,
        Number(row.created_at || Date.now()),
        row.confirmed_at ?? null,
        Number(row.updated_at || row.created_at || Date.now()),
      );
    }

    for (const row of publications) {
      if (!row?.url || !row?.publication_id) continue;
      await run(this.db,
        `INSERT INTO publications
          (url, publication_id, title, excerpt, status, started_at, sent_at, recipient_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(url) DO UPDATE SET
           publication_id = excluded.publication_id,
           title = excluded.title,
           excerpt = excluded.excerpt,
           status = CASE
             WHEN publications.status = 'sent' THEN 'sent'
             WHEN excluded.status = 'sent' THEN 'sent'
             ELSE excluded.status
           END,
           started_at = MIN(publications.started_at, excluded.started_at),
           sent_at = COALESCE(publications.sent_at, excluded.sent_at),
           recipient_count = MAX(publications.recipient_count, excluded.recipient_count)`,
        row.url,
        row.publication_id,
        row.title || "",
        row.excerpt || "",
        row.status || "failed",
        Number(row.started_at || Date.now()),
        row.sent_at ?? null,
        Number(row.recipient_count || 0),
      );
    }

    await run(this.db,
      `INSERT INTO newsletter_meta(key, value, updated_at)
       VALUES ('legacy_do_migration', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      JSON.stringify({ subscribers: subscribers.length, publications: publications.length }),
      Date.now(),
    );
    return { subscribers: subscribers.length, publications: publications.length };
  }

  async migrationStatus() {
    const row = await first(this.db,
      "SELECT value, updated_at FROM newsletter_meta WHERE key = 'legacy_do_migration'",
    );
    if (!row) return { imported: false };
    let value = {};
    try { value = JSON.parse(row.value || "{}"); } catch {}
    return { imported: true, updatedAt: Number(row.updated_at || 0), ...value };
  }
}

export function stateBackend(env) {
  return env?.NEWSLETTER_DB && typeof env.NEWSLETTER_DB.prepare === "function"
    ? "d1"
    : "unconfigured";
}
