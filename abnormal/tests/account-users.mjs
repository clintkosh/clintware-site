import { enhanceApp } from '../src/enhancer.js';
import { enhanceAccountUsers } from '../src/account-users.js';

const base = '<!doctype html><html><body><main>CRM</main></body></html>';
const workspace = enhanceApp(base);
const once = enhanceAccountUsers(workspace);

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
  if (!once.includes(required)) throw new Error(`missing account-user feature: ${required}`);
}

const twice = enhanceAccountUsers(once);
if (twice !== once) throw new Error('account-user enhancer is not idempotent');
console.log('PASS: editable per-account stakeholder/user workspace injection');
