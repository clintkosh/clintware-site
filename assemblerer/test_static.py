from html.parser import HTMLParser
from pathlib import Path
import re

page = Path(__file__).resolve().parents[1] / "public" / "tools" / "assemblerer" / "index.html"
text = page.read_text(encoding="utf-8")

required = [
    'id="brief"', 'id="authority"', 'id="budget"', 'id="routing"',
    'id="assemble"', 'id="runNext"', 'id="export"', 'id="reset"',
    'AssemblererMVP', "G-DCY144YM9P", "External writes"
]
missing = [x for x in required if x not in text]
if missing:
    raise SystemExit("missing required markers: " + ", ".join(missing))

forbidden = [r'api[_-]?key\s*=', r'sk-[A-Za-z0-9]{12,}', r'Bearer\s+[A-Za-z0-9._-]{20,}']
for pattern in forbidden:
    if re.search(pattern, text, flags=re.I):
        raise SystemExit(f"possible secret/provider credential pattern: {pattern}")

class StrictishParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.duplicates = set()
    def handle_starttag(self, tag, attrs):
        for k,v in attrs:
            if k == "id" and v:
                if v in self.ids: self.duplicates.add(v)
                self.ids.add(v)

p = StrictishParser()
p.feed(text)
if p.duplicates:
    raise SystemExit("duplicate IDs: " + ", ".join(sorted(p.duplicates)))
print({"ok": True, "ids": len(p.ids), "bytes": len(text.encode("utf-8"))})
