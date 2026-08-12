import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { enhanceApp } from '../src/enhancer.js';
import { enhanceAccountUsers } from '../src/account-users.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const src = await fs.readFile(path.join(root, 'src', 'index.js'), 'utf8');
const match = src.match(/const APP_GZ_B64="([A-Za-z0-9+/=]+)"/);
if (!match) throw new Error('compressed app bundle missing');
const base = zlib.gunzipSync(Buffer.from(match[1], 'base64')).toString('utf8');
const html = enhanceAccountUsers(enhanceApp(base));
const outDir = process.env.ABNORMAL_BROWSER_FIXTURE || '/tmp/abnormal-browser-fixture';
await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(path.join(outDir, 'index.html'), html);

const executablePath = process.env.CHROME;
if (!executablePath) throw new Error('CHROME environment variable is required');
const browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
page.on('dialog', async dialog => { await dialog.accept(); });
await page.goto('http://127.0.0.1:8765/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.click('#cwDemoFab');
await page.waitForSelector('#cwList .cw-account');
const firstCard = page.locator('#cwList .cw-account').first();
await firstCard.locator('[data-user-action="open-account"]').waitFor();
const initialButtonText = await firstCard.locator('[data-user-action="open-account"]').textContent();
if (!initialButtonText?.includes('3')) throw new Error(`expected 3 seeded users, got: ${initialButtonText}`);
await firstCard.locator('[data-user-action="open-account"]').click();
await page.waitForSelector('#cwAccountWorkspaceModal.cw-open');
if ((await page.locator('#cwAwUsers .cw-aw-user').count()) !== 3) throw new Error('expected three seeded stakeholders');

await page.click('[data-user-action="add-user"]');
await page.fill('#cwUserForm [name="name"]', 'Interview Test User');
await page.fill('#cwUserForm [name="title"]', 'VP, Security Operations');
await page.selectOption('#cwUserForm [name="level"]', 'VP');
await page.fill('#cwUserForm [name="lane"]', 'Executive technical sponsor');
await page.fill('#cwUserForm [name="email"]', 'interview.user@test-account.example');
await page.selectOption('#cwUserForm [name="status"]', 'Engaged');
await page.click('#cwUserForm button[type="submit"]');
if ((await page.locator('#cwAwUsers .cw-aw-user').count()) !== 4) throw new Error('add user did not persist in open account');
const added = page.locator('#cwAwUsers .cw-aw-user', { hasText: 'Interview Test User' });
if ((await added.count()) !== 1) throw new Error('added user not rendered');

await added.locator('[data-user-action="edit-user"]').click();
await page.fill('#cwUserForm [name="title"]', 'Senior VP, Security Operations');
await page.click('#cwUserForm button[type="submit"]');
const edited = page.locator('#cwAwUsers .cw-aw-user', { hasText: 'Senior VP, Security Operations' });
if ((await edited.count()) !== 1) throw new Error('edit user did not persist');

await page.click('#cwAwClose');
await page.reload({ waitUntil: 'domcontentloaded' });
await page.click('#cwDemoFab');
await page.waitForSelector('#cwList .cw-account');
const firstAfterReload = page.locator('#cwList .cw-account').first();
await firstAfterReload.locator('[data-user-action="open-account"]').click();
await page.waitForSelector('#cwAccountWorkspaceModal.cw-open');
if ((await page.locator('#cwAwUsers .cw-aw-user', { hasText: 'Interview Test User' }).count()) !== 1) throw new Error('user did not persist across reload');

const persisted = page.locator('#cwAwUsers .cw-aw-user', { hasText: 'Interview Test User' });
await persisted.locator('[data-user-action="remove-user"]').click();
await page.waitForTimeout(100);
if ((await page.locator('#cwAwUsers .cw-aw-user', { hasText: 'Interview Test User' }).count()) !== 0) throw new Error('remove user failed');
if ((await page.locator('#cwAwUsers .cw-aw-user').count()) !== 3) throw new Error('expected seeded users after removal');

await browser.close();
console.log('PASS: account open + seeded stakeholders + add/edit/reload/remove user flow works in real Chrome');
