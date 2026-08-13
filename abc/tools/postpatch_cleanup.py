from pathlib import Path
import re, base64, gzip, math

root=Path(__file__).resolve().parents[1]/'src'
parts=[]
for i in range(1,6):
    p=root/f'app-part{i}.js'
    m=re.search(r'"([A-Za-z0-9+/=]+)"',p.read_text())
    assert m,p
    parts.append(m.group(1))
html=gzip.decompress(base64.b64decode(''.join(parts))).decode()

replacements=[
    ('<title>Post-Sales Business Operations</title>','<title>Enterprise Customer Success</title>'),
    ('Synthetic enterprise account used to demonstrate post-sales operating rigor, customer context, and executive review readiness.','Synthetic enterprise account used to demonstrate Customer Success rigor, customer context, adoption, risk, value, and executive review readiness.'),
    ("owner:'CS Business Operations'","owner:'Customer Success'"),
    ("owner:'Strategy & Operations'","owner:'Customer Success Leadership'"),
    ("focus:'Headcount, budget, capacity, operating priorities'","focus:'Customer outcomes, adoption, renewal risk, coverage, and growth priorities'"),
    ("Modeled on the DTex Command Center flow: portfolio health → account drill-down → working records → meeting readiness, with the resource, finance, cadence, and prioritization layers required for a Business Operations leader.","Enterprise Customer Success flow: portfolio health → account drill-down → working records → meeting readiness, with adoption, value, stakeholder, risk, and renewal signals mapped to the role."),
    ('DTex-style portfolio table with the business-operations signals this role needs.','Enterprise portfolio view of health, adoption, executive coverage, renewal timing, and value evidence.'),
    ('Open any account into a DTex-style working workspace: contract and metrics, stakeholders, success plan, technical/service context, meetings, notes, and commercial readiness.','Open any account into an enterprise Customer Success workspace: contract and metrics, stakeholders, success criteria, technical context, meetings, notes, risk, and renewal readiness.'),
    ('DTex-style renewal board: exact timing together with health, value evidence, stakeholder strength, and commercial readiness.','Enterprise renewal board: exact timing together with health, adoption, value evidence, stakeholder strength, and commercial readiness.'),
    ('Capacity & resource planning','Engagement coverage'),
    ('A concise resource picture across Support, Technical Success, Professional Services, and Business Operations.','A concise coverage picture across enterprise CSM ownership, technical engagement, executive sponsorship, and customer-facing dependencies.'),
    ('Capacity planning should expose trade-offs, not hide them.','Customer coverage planning should expose risks and trade-offs, not hide them.'),
    ('Headcount plan','Coverage plan'),
    ('Budget, forecast and investment visibility','Value evidence, executive confidence and commercial readiness'),
    ('Structured intake and decision transparency','Customer feedback, product requests, risk signals and commitment follow-through'),
]
for old,new in replacements:
    html=html.replace(old,new)

# Also remove the exact inherited brand phrase wherever it might remain.
html=html.replace('Post-Sales Business Operations','Enterprise Customer Success')

assert 'Post-Sales Business Operations' not in html
assert '<title>Enterprise Customer Success</title>' in html
assert 'ABNORMAL // CUSTOMER SUCCESS' in html
assert 'Print / Save PDF' in html
assert 'trackPageView' in html

encoded=base64.b64encode(gzip.compress(html.encode(),compresslevel=9,mtime=0)).decode()
size=math.ceil(len(encoded)/5)
chunks=[encoded[i*size:(i+1)*size] for i in range(5)]
assert ''.join(chunks)==encoded and all(chunks)
for i,chunk in enumerate(chunks,1):
    (root/f'app-part{i}.js').write_text(f'export const PART_{i} = "{chunk}";\n')
print('POSTPATCH cleanup complete')
