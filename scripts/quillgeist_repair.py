from pathlib import Path


def replace_required(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit(f"repair marker not found in {path}: {old!r}")
    p.write_text(text.replace(old, new), encoding="utf-8")


app = "agentbridge-cloud/public/app.js"
deploy = ".github/workflows/agentbridge-deploy-cloud.yml"

replacements = {
    'Run <code>agentbridge pair</code>': 'Run <code>quillgeist pair</code>',
    'No AgentBridge product bugs reported.': 'No Quillgeist product bugs reported.',
    'agentbridge-report-': 'quillgeist-report-',
    'AgentBridge Cloud ready.': 'Quillgeist Cloud ready.',
    'That key could not open an AgentBridge account.': 'That key could not open a Quillgeist account.',
    "Forget this browser's AgentBridge control key?": "Forget this browser's Quillgeist control key?",
    'title:"AgentBridge task"': 'title:"Quillgeist task"',
}
for old, new in replacements.items():
    replace_required(app, old, new)

replace_required(
    app,
    'if(token())try{await refresh()}catch(e){toast(e.message,"error")}',
    'if(token())try{await refresh()}catch(e){localStorage.removeItem(TOKEN_KEY);show();toast("Control key could not be restored. Create a new account or paste a valid key.","error")}',
)

replace_required(deploy, '\"service\":\"AgentBridge Cloud\"', '\"service\":\"Quillgeist Cloud\"')

print("Quillgeist browser and deployment smoke-test repairs applied")
