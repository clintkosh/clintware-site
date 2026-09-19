import assert from "node:assert/strict";
import test, { after } from "node:test";
import worker from "../src/worker.js";

class FakeRegistry {
  constructor() {
    this.subscribers = new Map();
    this.publications = new Map();
  }

  async reserveSubscription(email) {
    const existing = this.subscribers.get(email);
    if (existing?.status === "confirmed") return { shouldSend: false };
    const confirmationToken = `confirm-${email}`;
    this.subscribers.set(email, {
      email,
      status: "pending",
      confirmationToken,
      unsubscribeToken: `unsubscribe-${email}`,
    });
    return { shouldSend: true, confirmationToken };
  }

  async confirmSubscription(token) {
    const subscriber = [...this.subscribers.values()].find((entry) => entry.confirmationToken === token);
    if (!subscriber) return { state: "invalid" };
    if (subscriber.status === "confirmed") return { state: "already_confirmed" };
    subscriber.status = "confirmed";
    return { state: "confirmed" };
  }

  async unsubscribe(token) {
    const subscriber = [...this.subscribers.values()].find((entry) => entry.unsubscribeToken === token);
    if (!subscriber) return { state: "invalid" };
    if (subscriber.status === "unsubscribed") return { state: "already_unsubscribed" };
    subscriber.status = "unsubscribed";
    return { state: "unsubscribed" };
  }

  async claimPublication(publication) {
    const existing = this.publications.get(publication.url);
    if (existing?.status === "sent") return { state: "sent" };
    if (existing?.status === "sending") return { state: "sending" };
    this.publications.set(publication.url, { ...publication, status: "sending" });
    return { state: "claimed" };
  }

  async confirmedSubscribers() {
    return [...this.subscribers.values()]
      .filter((entry) => entry.status === "confirmed")
      .map((entry) => ({ email: entry.email, unsubscribeToken: entry.unsubscribeToken }));
  }

  async completePublication(url, recipientCount) {
    this.publications.set(url, { ...this.publications.get(url), status: "sent", recipientCount });
  }

  async failPublication(url) {
    this.publications.set(url, { ...this.publications.get(url), status: "failed" });
  }
}

const registry = new FakeRegistry();
const outbox = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  const target = new URL(url);
  if (target.hostname === "oauth2.googleapis.com") {
    return new Response('{"access_token":"test-token","expires_in":3600,"token_type":"Bearer"}', {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
  if (target.hostname === "gmail.googleapis.com") {
    outbox.push({ pathname: target.pathname });
    return new Response('{"id":"test-message"}', {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
  throw new Error("Unexpected fetch target");
};
after(() => { globalThis.fetch = originalFetch; });

const env = {
  SUBSCRIBERS: { getByName: () => registry },
  PUBLIC_ENDPOINT: "https://clintware-blog-newsletter.clint-kosh.workers.dev",
  SITE_URL: "https://www.clintware.com",
  FROM_EMAIL: "Clintware <hello@clintware.com>",
  REPLY_TO: "hello@clintware.com",
  ALLOWED_ORIGINS: "https://www.clintware.com,https://clintware.com",
  MAIL_PROVIDER: "gmail",
  GOOGLE_OAUTH_CLIENT_ID: "test-client",
  GOOGLE_OAUTH_CLIENT_SECRET: "test-secret",
  GOOGLE_DELEGATED_REFRESH_TOKEN: "test-refresh",
  NEWSLETTER_PUBLISH_SECRET: "fixture-publish-secret",
};

async function invoke(path, options = {}) {
  return worker.fetch(new Request(`https://clintware-blog-newsletter.clint-kosh.workers.dev${path}`, options), env);
}

test("runs the complete request, confirmation, publish, and unsubscribe flow", async () => {
  const blocked = await invoke("/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://attacker.example" },
    body: JSON.stringify({ email: "reader@example.com", consent: true }),
  });
  assert.equal(blocked.status, 403);

  const subscription = await invoke("/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://www.clintware.com" },
    body: JSON.stringify({ email: "reader@example.com", consent: true, website: "" }),
  });
  assert.equal(subscription.status, 202);
  assert.equal(subscription.headers.get("access-control-allow-origin"), "https://www.clintware.com");
  assert.equal(outbox.length, 1);
  assert.equal(outbox[0].pathname, "/gmail/v1/users/me/messages/send");

  const confirmed = await invoke("/confirm?token=confirm-reader%40example.com");
  assert.equal(confirmed.status, 200);
  assert.match(await confirmed.text(), /You’re subscribed/);

  const publication = {
    title: "Fixture field note",
    excerpt: "A verified publication from the automated newsletter test.",
    url: "https://www.clintware.com/blog/fixture-field-note/",
  };
  const published = await invoke("/publish", {
    method: "POST",
    headers: { authorization: "Bearer fixture-publish-secret", "content-type": "application/json" },
    body: JSON.stringify(publication),
  });
  assert.equal(published.status, 202);
  assert.equal((await published.json()).recipients, 1);
  assert.equal(outbox.length, 2);
  assert.equal(outbox[1].pathname, "/gmail/v1/users/me/messages/send");

  const duplicate = await invoke("/publish", {
    method: "POST",
    headers: { authorization: "Bearer fixture-publish-secret", "content-type": "application/json" },
    body: JSON.stringify(publication),
  });
  assert.equal(duplicate.status, 200);
  assert.equal((await duplicate.json()).reason, "already_sent");
  assert.equal(outbox.length, 2);

  const unsubscribed = await invoke("/unsubscribe?token=unsubscribe-reader%40example.com", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "List-Unsubscribe=One-Click",
  });
  assert.equal(unsubscribed.status, 200);
  assert.match(await unsubscribed.text(), /You’re unsubscribed/);

  const afterUnsubscribe = await invoke("/publish", {
    method: "POST",
    headers: { authorization: "Bearer fixture-publish-secret", "content-type": "application/json" },
    body: JSON.stringify({ ...publication, url: "https://www.clintware.com/blog/second-fixture-field-note/" }),
  });
  assert.equal(afterUnsubscribe.status, 202);
  assert.equal((await afterUnsubscribe.json()).recipients, 0);
  assert.equal(outbox.length, 2);
});
