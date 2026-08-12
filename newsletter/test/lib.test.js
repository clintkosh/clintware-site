import assert from "node:assert/strict";
import test from "node:test";
import {
  chunks,
  cleanText,
  escapeHtml,
  isValidEmail,
  normalizeEmail,
  readRequestPayload,
  validBlogPostUrl,
} from "../src/lib.js";

test("normalizes and validates subscriber email addresses", () => {
  const email = normalizeEmail("  Reader+notes@Example.COM ");
  assert.equal(email, "reader+notes@example.com");
  assert.equal(isValidEmail(email), true);
  assert.equal(isValidEmail("not-an-email"), false);
  assert.equal(isValidEmail("reader@example"), false);
});

test("escapes publication content before it becomes email HTML", () => {
  assert.equal(escapeHtml(`<script>alert('x')</script>`), "&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
  assert.equal(cleanText("  Useful\n\tpost  "), "Useful post");
});

test("splits recipients into provider-safe batches", () => {
  const recipients = Array.from({ length: 205 }, (_, index) => index);
  assert.deepEqual(chunks(recipients, 100).map((batch) => batch.length), [100, 100, 5]);
});

test("reads small JSON and form payloads without unbounded parsing", async () => {
  const jsonRequest = new Request("https://newsletter.example/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "reader@example.com", consent: true }),
  });
  assert.deepEqual(await readRequestPayload(jsonRequest), { email: "reader@example.com", consent: true });

  const formRequest = new Request("https://newsletter.example/subscribe", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "email=reader%40example.com&consent=on",
  });
  assert.deepEqual(await readRequestPayload(formRequest), { email: "reader@example.com", consent: "on" });
});

test("accepts only canonical Clintware blog post URLs for notification", () => {
  assert.equal(validBlogPostUrl("https://www.clintware.com/blog/new-post/", "https://www.clintware.com"), true);
  assert.equal(validBlogPostUrl("https://www.clintware.com/blog/", "https://www.clintware.com"), false);
  assert.equal(validBlogPostUrl("https://attacker.example/blog/new-post/", "https://www.clintware.com"), false);
});
