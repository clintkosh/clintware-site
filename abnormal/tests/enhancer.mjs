import { enhanceApp } from '../src/enhancer.js';

const base = '<!doctype html><html><body><main>CRM</main></body></html>';
const once = enhanceApp(base);
if (!once.includes('id="cw-demo-workspace-script"')) throw new Error('workspace script not injected');
if (!once.includes('id="cw-demo-workspace-style"')) throw new Error('workspace style not injected');
if (!once.includes('an_demo_workspace_v2')) throw new Error('persistent storage key missing');
if (!once.includes('demo_data_regenerated')) throw new Error('regeneration event missing');
if (!once.includes('demo_account_updated')) throw new Error('account update event missing');
if (!once.includes('window.clintwareDemoTracking')) throw new Error('tracking variables missing');
const twice = enhanceApp(once);
if (twice !== once) throw new Error('enhancer is not idempotent');
console.log('PASS: editable workspace injection smoke test');
