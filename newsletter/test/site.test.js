import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("both blog source copies expose the same confirmed-subscription form", async () => {
  for (const path of ["blog/index.html", "public/blog/index.html"]) {
    const html = await source(path);
    assert.match(html, /data-newsletter-form/);
    assert.match(html, /https:\/\/newsletter\.clintware\.com\/subscribe/);
    assert.match(html, /newsletter\.js/);
    assert.match(html, /newsletter\.css/);
  }
});

test("the production bundle contains the RSS feed and newsletter privacy disclosure", async () => {
  const [feed, privacy] = await Promise.all([
    source("public/blog/feed.xml"),
    source("public/privacy/index.html"),
  ]);
  assert.match(feed, /<rss version="2\.0">/);
  assert.match(feed, /Building the Next Step/);
  assert.match(privacy, /Blog updates/);
  assert.match(privacy, /unsubscribe path/);
});
