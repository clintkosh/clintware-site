#!/usr/bin/env python3
"""
Clintware vidCRM Knowledge Folder Agent
Local-first crawler for a user-selected knowledge dump. Extracts text locally and
sends only normalized text + metadata to the authenticated vidCRM ingestion API.
"""
from __future__ import annotations
import argparse, csv, hashlib, json, os, re, sys, time, urllib.request, urllib.error, zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

DEFAULT_EXT={".txt",".md",".log",".csv",".json",".xml",".html",".htm",".docx",".pptx",".xlsx",".pdf"}
MAX_TEXT=120_000

def sha(path:Path)->str:
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""): h.update(chunk)
    return h.hexdigest()

def xml_text(data:bytes)->str:
    try:
        root=ET.fromstring(data)
        return " ".join(t.strip() for t in root.itertext() if t and t.strip())
    except Exception:
        return ""

def office_zip(path:Path)->str:
    out=[]
    with zipfile.ZipFile(path) as z:
        names=z.namelist()
        if path.suffix.lower()==".docx":
            chosen=[n for n in names if n=="word/document.xml" or n.startswith("word/header") or n.startswith("word/footer")]
        elif path.suffix.lower()==".pptx":
            chosen=sorted(n for n in names if re.fullmatch(r"ppt/slides/slide\d+\.xml",n))
        else:
            chosen=sorted(n for n in names if n.startswith("xl/worksheets/") and n.endswith(".xml"))
            chosen+=([ "xl/sharedStrings.xml" ] if "xl/sharedStrings.xml" in names else [])
        for n in chosen:
            try: out.append(xml_text(z.read(n)))
            except Exception: pass
    return "\n".join(x for x in out if x)

def pdf_text(path:Path)->str:
    try:
        from pypdf import PdfReader
        return "\n".join((p.extract_text() or "") for p in PdfReader(str(path)).pages)
    except Exception:
        return "[PDF text extraction unavailable. Install pypdf for local PDF parsing.]"

def extract(path:Path)->str:
    ext=path.suffix.lower()
    if ext in {".docx",".pptx",".xlsx"}: text=office_zip(path)
    elif ext==".pdf": text=pdf_text(path)
    elif ext==".csv":
        try:
            with path.open("r",encoding="utf-8-sig",errors="replace",newline="") as f:
                text="\n".join(" | ".join(row) for row in csv.reader(f))
        except Exception: text=path.read_text(encoding="utf-8",errors="replace")
    else: text=path.read_text(encoding="utf-8",errors="replace")
    return text[:MAX_TEXT]

def post(endpoint:str,token:str,payload:dict)->dict:
    req=urllib.request.Request(endpoint,data=json.dumps(payload).encode(),method="POST",
        headers={"content-type":"application/json","authorization":"Bearer "+token,"user-agent":"Clintware-vidCRM-Knowledge-Agent/1.0"})
    try:
        with urllib.request.urlopen(req,timeout=60) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {e.read().decode(errors='replace')[:500]}")

def load_state(path:Path)->dict:
    try:return json.loads(path.read_text())
    except Exception:return {}

def save_state(path:Path,state:dict):
    path.write_text(json.dumps(state,indent=2,sort_keys=True))

def scan(root:Path,endpoint:str,token:str,state_file:Path,extensions:set[str])->tuple[int,int]:
    state=load_state(state_file); sent=skipped=0
    for p in sorted(root.rglob("*")):
        if not p.is_file() or p==state_file or p.suffix.lower() not in extensions: continue
        try:
            digest=sha(p)
            key=str(p.resolve())
            if state.get(key)==digest: skipped+=1; continue
            text=extract(p)
            if not text.strip(): skipped+=1; state[key]=digest; continue
            rel=str(p.relative_to(root))
            payload={"name":p.name,"path":rel,"source":"local-folder-agent","mime":"application/octet-stream",
                "sha256":digest,"modified_at":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime(p.stat().st_mtime)),
                "metadata":{"extension":p.suffix.lower(),"size":p.stat().st_size},"text":text}
            result=post(endpoint,token,payload)
            state[key]=digest; save_state(state_file,state); sent+=1
            print(f"[INGESTED] {rel} -> {result.get('queued',0)} proposals")
        except Exception as e:
            print(f"[ERROR] {p}: {e}",file=sys.stderr)
    return sent,skipped

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("folder",help="Central knowledge-dump folder to crawl")
    ap.add_argument("--endpoint",default=os.getenv("VIDCRM_KNOWLEDGE_ENDPOINT","https://vidcrmdemo.clintware.com/api/knowledge/ingest/external"))
    ap.add_argument("--token",default=os.getenv("VIDCRM_INGEST_TOKEN",""))
    ap.add_argument("--watch",action="store_true",help="Repeat scans until stopped")
    ap.add_argument("--interval",type=int,default=60)
    args=ap.parse_args()
    root=Path(args.folder).expanduser().resolve()
    if not root.is_dir(): raise SystemExit("Folder not found: "+str(root))
    if not args.token: raise SystemExit("Set VIDCRM_INGEST_TOKEN or pass --token.")
    state_file=root/".vidcrm-agent-state.json"
    while True:
        sent,skipped=scan(root,args.endpoint,args.token,state_file,DEFAULT_EXT)
        print(f"[SCAN] sent={sent} unchanged={skipped}")
        if not args.watch: break
        time.sleep(max(15,args.interval))
if __name__=="__main__": main()
