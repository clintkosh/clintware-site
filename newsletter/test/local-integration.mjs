import assert from "node:assert/strict";
import { once } from "node:events";
import { rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const workerPort = 8787;
const resendPort = 8790;
const workerUrl = `http://127.0.0.1:${workerPort}`;
const resendUrl = `http://127.0.0.1:${resendPort}`;
const stateDirectory = join(tmpdir(), `clintware-newsletter-test-${process.pid}`);
const outbox = [];
const wranglerBinary = process.env.WRANGLER_BIN || "npx";

function pause(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function body(request) {
  return new Promise((resolve, reject) => {
    const parts = [];
    request.on("data", (chunk) => parts.push(chunk));
    request.on("end", () => resolve(Buffer.concat(parts).toString("utf8")));
    request.on("error", reject);
  });
}

function listen(server, port) {
  return new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
}

async function request(path, options = {}) {
  const response = await fetch(`${workerUrl}${path}`, options);
  const payload = response.headers.get("content-type")?.includes("application/json")
    ? await response.json()
    : await response.text();
  return { response, payload };
}

async function waitForWorker() {
  let lastError;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const { response } = await request("/health");
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await pause(100);
  }
  throw lastError || new Error("Newsletter Worker did not start.");
}

async function stop(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([once(child, "exit"), pause(4000)]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

const resend = createServer(async (incoming, outgoing) => {
  const raw = await body(incoming);
  if (incoming.method === "POST" && ["/emails", "/emails/batch"].includes(incoming.url)) {
    outbox.push({ path: incoming.url, body: JSON.parse(raw) });
    outgoing.writeHead(200, { "content-type": "application/json" });
    outgoing.end(incoming.url === "/emails" ? '{"id":"fixture-message"}' : '{"data":[{"id":"fixture-message"}]}');
    return;
  }
  outgoing.writeHead(404).end();
});

let worker;
try {
  await listen(resend, resendPort);
  const devArgs = [
      "--local",
      "--config", "wrangler.jsonc",
      "--ip", "127.0.0.1",
      "--port", String(workerPort),
      "--log-level", "error",
      "--show-interactive-dev-session", "false",
      "--persist-to", stateDirectory,
      "--var", `PUBLIC_ENDPOINT:${workerUrl}`,
      "--var", "SITE_URL:https://www.clintware.com",
      "--var", "FROM_EMAIL:Clintware <hello@clintware.com>",
      "--var", "REPLY_TO:hello@clintware.com",
      "--var", "ALLOWED_ORIGINS:http://127.0.0.1:4173",
      "--var", `RESEND_API_BASE_URL:${resendUrl}`,
      "--var", "RESEND_API_KEY:fixture-resend-key",
      "--var", "NEWSLETTER_PUBLISH_SECRET:fixture-publish-secret",
  ];
  const commandArgs = wranglerBinary === "npx"
    ? ["--yes", "--cache", "/tmp/clintware-newsletter-npm-cache", "wrangler@4", "dev", ...devArgs]
    : ["dev", ...devArgs];
  worker = spawn(
    wranglerBinary,
    commandArgs,
    {
      cwd: new URL("..", import.meta.url),
      env: { ...process.env, XDG_CONFIG_HOME: "/tmp/clintware-newsletter-xdg" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let workerOutput = "";
  worker.stderr.on("data", (chunk) => { workerOutput += chunk.toString(); });
  worker.stdout.on("data", (chunk) => { workerOutput += chunk.toString(); });
  worker.once("exit", (code) => {
    if (code && !workerOutput.includes("SIGTERM")) workerOutput += `\nWorker exited with code ${code}`;
  });

  await waitForWorker();

  const blocked = await request("/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://attacker.example" },
    body: JSON.stringify({ email: "reader@example.com", consent: true }),
  });
  assert.equal(blocked.response.status, 403);

  const subscription = await request("/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://127.0.0.1:4173" },
    body: JSON.stringify({ email: "reader@example.com", consent: true, website: "" }),
  });
  assert.equal(subscription.response.status, 202);
  assert.equal(subscription.response.headers.get("access-control-allow-origin"), "http://127.0.0.1:4173");
  assert.equal(outbox.length, 1);
  assert.equal(outbox[0].path, "/emails");

  const confirmationUrl = /href="([^"]+\/confirm\?token=[^"]+)"/.exec(outbox[0].body.html)?.[1];
  assert.ok(confirmationUrl, "confirmation email should include its confirmation link");
  const confirmation = await fetch(confirmationUrl);
  assert.equal(confirmation.status, 200);
  assert.match(await confirmation.text(), /You’re subscribed/);

  const publication = {
    title: "Fixture field note",
    excerpt: "A verified post notification from the local test harness.",
    url: "https://www.clintware.com/blog/fixture-field-note/",
  };
  const firstPublish = await request("/publish", {
    method: "POST",
    headers: {
      authorization: "Bearer fixture-publish-secret",
      "content-type": "application/json",
    },
    body: JSON.stringify(publication),
  });
  assert.equal(firstPublish.response.status, 202);
  assert.equal(firstPublish.payload.recipients, 1);
  assert.equal(outbox.length, 2);
  assert.equal(outbox[1].path, "/emails/batch");

  const repeatPublish = await request("/publish", {
    method: "POST",
    headers: {
      authorization: "Bearer fixture-publish-secret",
      "content-type": "application/json",
    },
    body: JSON.stringify(publication),
  });
  assert.equal(repeatPublish.response.status, 200);
  assert.equal(repeatPublish.payload.reason, "already_sent");
  assert.equal(outbox.length, 2);

  const notification = outbox[1].body[0];
  const unsubscribeUrl = /href="([^"]+\/unsubscribe\?token=[^"]+)"/.exec(notification.html)?.[1];
  assert.ok(unsubscribeUrl, "notification email should include an unsubscribe link");
  const unsubscribe = await request(new URL(unsubscribeUrl).pathname + new URL(unsubscribeUrl).search, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "List-Unsubscribe=One-Click",
  });
  assert.equal(unsubscribe.response.status, 200);
  assert.match(unsubscribe.payload, /You’re unsubscribed/);

  const secondPublish = await request("/publish", {
    method: "POST",
    headers: {
      authorization: "Bearer fixture-publish-secret",
      "content-type": "application/json",
    },
    body: JSON.stringify({ ...publication, url: "https://www.clintware.com/blog/second-fixture-field-note/" }),
  });
  assert.equal(secondPublish.response.status, 202);
  assert.equal(secondPublish.payload.recipients, 0);
  assert.equal(outbox.length, 2);

  console.log("Newsletter local integration: PASS");
} finally {
  if (worker) await stop(worker);
  await new Promise((resolve) => resend.close(resolve));
  await rm(stateDirectory, { recursive: true, force: true });
}
