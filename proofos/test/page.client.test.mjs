import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { renderPage } from '../src/page.js';

test('rendered ProofOS browser script is valid JavaScript', () => {
  const html = renderPage({ version: 'test' });
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, 'inline browser script should exist');
  assert.doesNotThrow(() => new vm.Script(match[1]), 'rendered browser JavaScript must parse');
});

test('company query links are wired to auto-run research', () => {
  const html = renderPage({ version: 'test' });
  assert.match(html, /URLSearchParams\(window\.location\.search\)/);
  assert.match(html, /get\('company'\)/);
  assert.match(html, /form\.requestSubmit/);
});
