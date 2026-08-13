import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import { enhanceApp } from '../src/enhancer.js';
import { enhanceAccountUsers } from '../src/account-users.js';
import { enhanceFunctionalCards } from '../src/functional-cards.js';

const toy = '<!doctype html><html><body><main>CRM</main></body></html>';
const toyOnce = enhanceAccountUsers(enhanceApp(toy));

for (const required of [
  'id="cw-account-users-script"',
  'id="cw-account-users-style"',
  'an_demo_workspace_v2',
  'Open account',
  'Stakeholders & users',
  '+ Add user',
  'Edit user',
  'Remove user',
  'demo_account_user_added',
  'demo_account_user_updated',
  'demo_account_user_removed',
  'Chief Information Security Officer',
  'VP, Information Technology',
  'Director, Security Operations',
  '.example',
]) {
  if (!toyOnce.includes(required)) throw new Error(`missing account-user feature: ${required}`);
}
if (enhanceAccountUsers(toyOnce) !== toyOnce) throw new Error('account-user enhancer is not idempotent');

// Validate placement against the real compressed Abnormal application, not only a toy page.
const src = await fs.readFile(new URL('../src/index.js', import.meta.url), 'utf8');
const match = src.match(/const APP_GZ_B64="([A-Za-z0-9+/=]+)"/);
if (!match) throw new Error('compressed app bundle missing');
const base = zlib.gunzipSync(Buffer.from(match[1], 'base64')).toString('utf8');
const workspace = enhanceApp(base);
const real = enhanceAccountUsers(workspace);

function beforeIndexBalance(html, marker) {
  const idx = html.indexOf(marker);
  if (idx < 0) throw new Error(`marker missing: ${marker}`);
  const prefix = html.slice(0, idx);
  const opens = (prefix.match(/<script\b/gi) || []).length;
  const closes = (prefix.match(/<\/script>/gi) || []).length;
  return { idx, opens, closes, context: html.slice(Math.max(0, idx - 220), idx + 220) };
}
for (const marker of ['id="cw-demo-workspace-style"', 'id="cw-account-users-style"']) {
  const x = beforeIndexBalance(real, marker);
  console.log(`PLACEMENT ${marker}: index=${x.idx} scriptOpen=${x.opens} scriptClose=${x.closes}`);
  if (x.opens !== x.closes) {
    console.log('BAD_CONTEXT', JSON.stringify(x.context));
    throw new Error(`${marker} was injected inside an existing script element`);
  }
}
const bodyClose = real.toLowerCase().lastIndexOf('</body>');
const usersIndex = real.indexOf('id="cw-account-users-style"');
if (bodyClose < 0 || usersIndex > bodyClose) throw new Error('account user injection is not inside the final body');
console.log('PASS: editable per-account stakeholder/user workspace injection and real-app HTML placement');

const functional = enhanceFunctionalCards(real);
for (const required of ['id="cw-functional-cards-script"','Custom overview cards','Download meeting brief PDF','Download formatted meeting brief PDF','cwBuildAbnormalMeetingBrief','cwBaseAbnormalBriefAccount','demo_custom_card_added','demo_portfolio_card_drilldown']) {
  if (!functional.includes(required)) throw new Error(`missing functional-card feature: ${required}`);
}
if (enhanceFunctionalCards(functional) !== functional) throw new Error('functional-card enhancer is not idempotent');
console.log('PASS: functional cards, drill-downs, and PDF brief injection');
