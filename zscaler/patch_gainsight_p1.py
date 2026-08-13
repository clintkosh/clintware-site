from pathlib import Path
import json

abc_path = Path('abc/src/index.js')
zsc_path = Path('zscaler/src/index.js')
auth_path = Path('zscaler/tests/auth-roundtrip.mjs')
abc = abc_path.read_text()
zsc = zsc_path.read_text()

prefix = 'const ABNORMAL_HEALTH_P1_SCRIPT = '
line = next((x for x in abc.splitlines() if x.startswith(prefix)), None)
if not line:
    raise SystemExit('Abnormal health/P1 reference script not found')
base = json.loads(line[len(prefix):-1])

script = base
script = script.replace(
    'const ABC_HEALTH_DEFAULTS={adoption:25,value:25,relationship:20,technical:15,supportRisk:10,successPlan:5};',
    'const ABC_HEALTH_DEFAULTS={adoption:20,value:20,relationship:15,technical:25,supportRisk:15,successPlan:5};'
)
script = script.replace(
    "Transparent weighted scorecard based on standard Customer Success health dimensions, tuned for Abnormal's enterprise cybersecurity motion.",
    "Defaulted to Gainsight-style Customer Success health practices except where overridden by Zscaler priorities. Zscaler weighting increases Technical / deployment and Support / risk to reflect its public Customer Success, Professional Services, Support, adoption, and measurable-value model."
)
script = script.replace('Reset recommended weights', 'Reset Zscaler recommended weights')
script = script.replace("region:'TOLA'", "region:'USA'")
script = script.replace("demo_name:'abnormal_enterprise_customer_success'", "demo_name:'zscaler_cs_business_operations'")
script = script.replace("page_title:'Abnormal CS '+view", "page_title:'Zscaler CS '+view")
script = script.replace("const root=location.hostname.toLowerCase().startsWith('an.')?'/an/':'/abc/';", "const root='/zsc/';")

const_line = 'const ZSCALER_HEALTH_P1_SCRIPT = ' + json.dumps(script) + ';\n\n'
if 'const ZSCALER_HEALTH_P1_SCRIPT =' not in zsc:
    marker = 'function responseHeaders(type = "text/html; charset=utf-8") {'
    if marker not in zsc:
        raise SystemExit('Zscaler responseHeaders marker not found')
    zsc = zsc.replace(marker, const_line + marker, 1)

# Keep the private gate isolated from the CRM renderer. The old global bind()
# name collides with the app's own bind() after a SPA re-render.
zsc = zsc.replace("function bind(){const form=document.getElementById('access-form')", "function bindGate(){const form=document.getElementById('access-form')")
zsc = zsc.replace("document.addEventListener('DOMContentLoaded',bind);", "document.addEventListener('DOMContentLoaded',bindGate);")

# Inject the scoring/P1 runtime into the rendered document.
zsc = zsc.replace('out = out.replace("</head>", `${DTEX_GATE_CSS}</head>`);', 'out = out.replace("</head>", `${DTEX_GATE_CSS}${ZSCALER_HEALTH_P1_SCRIPT}</head>`);')

# Use the last real body close. Printable brief HTML can contain a literal
# </body> inside a JavaScript string and must never steal the gate injection.
old_body = 'out = out.replace(/<\\/body>/i, `${DTEX_GATE_JS}</body>`);'
if old_body in zsc:
    zsc = zsc.replace(old_body, 'const bodyClose = out.toLowerCase().lastIndexOf("</body>");\n  out = bodyClose >= 0 ? `${out.slice(0, bodyClose)}${DTEX_GATE_JS}${out.slice(bodyClose)}` : `${out}${DTEX_GATE_JS}`;', 1)

# Health endpoint should prove the model layer is actually in the response.
zsc = zsc.replace(
    'const appOk = html.includes("Command Center") && html.includes("Seed Demo Accounts") && html.length > 10000;',
    'const appOk = html.includes("Command Center") && html.includes("Seed Demo Accounts") && html.includes("abc-health-p1-script") && html.includes("Gainsight-style Customer Success health practices") && html.length > 10000;'
)

zsc_path.write_text(zsc)

# Keep the auth regression aligned with the collision-safe gate name.
auth = auth_path.read_text()
auth = auth.replace("vm.runInContext('bind()', context);", "vm.runInContext('bindGate()', context);")
auth_path.write_text(auth)

print('patched Zscaler Gainsight/company-priority health model and P1 workflows')
