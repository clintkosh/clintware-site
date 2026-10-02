#!/usr/bin/env python3
"""Fail-closed evidence-provenance validator for Clintware artifacts."""
from __future__ import annotations
import argparse, json, pathlib, re, shutil, subprocess, sys, zipfile
from html import unescape

NUM_RE = re.compile(r"(?<![A-Za-z0-9_])(?:[$€£])?[-+]?\d[\d,]*(?:\.\d+)?(?:\s?%|\s?[KkMmBb])?(?![A-Za-z0-9_])")
TAG_RE = re.compile(r"<[^>]+>")
XML_TEXT_RE = re.compile(r"<(?:w:t|a:t|t)(?:\s[^>]*)?>(.*?)</(?:w:t|a:t|t)>", re.S)
VALID_CLASSES={"MEASURED","TARGET","DERIVED","ESTIMATE","SYNTHETIC","PUBLIC FACT","LOGISTICS"}

def norm(v:str)->str:
    return re.sub(r"\s+","",v or "").replace(",","").lower()

def extract_ooxml(path:pathlib.Path)->str:
    out=[]
    with zipfile.ZipFile(path) as z:
        for n in z.namelist():
            if not n.endswith(".xml"):
                continue
            if not any(k in n for k in ("document.xml","slide","notesSlide","sharedStrings","sheet","comments","footnotes","endnotes")):
                continue
            try:
                s=z.read(n).decode("utf-8","ignore")
                out.extend(unescape(x) for x in XML_TEXT_RE.findall(s))
            except Exception:
                pass
    return "\n".join(out)

def extract_pdf(path:pathlib.Path)->str:
    try:
        import pypdf  # type: ignore
        r=pypdf.PdfReader(str(path))
        return "\n".join((p.extract_text() or "") for p in r.pages)
    except Exception:
        exe=shutil.which("pdftotext")
        if not exe:
            raise RuntimeError("pdf_text_extractor_unavailable")
        p=subprocess.run([exe,str(path),"-"],capture_output=True,text=True,timeout=60)
        if p.returncode:
            raise RuntimeError("pdftotext_failed:"+p.stderr[:300])
        return p.stdout

def extract(path:pathlib.Path)->str:
    ext=path.suffix.lower()
    if ext in {".txt",".md",".csv",".json",".yaml",".yml",".js",".ts",".tsx",".jsx",".astro",".css",".html",".htm"}:
        s=path.read_text(encoding="utf-8",errors="ignore")
        return unescape(TAG_RE.sub(" ",s)) if ext in {".html",".htm"} else s
    if ext in {".docx",".pptx",".xlsx"}:
        return extract_ooxml(path)
    if ext==".pdf":
        return extract_pdf(path)
    raise RuntimeError("unsupported_artifact:"+ext)

def load_ledger(path:pathlib.Path):
    data=json.loads(path.read_text(encoding="utf-8"))
    claims=data.get("claims",data if isinstance(data,list) else [])
    if not isinstance(claims,list):
        raise ValueError("ledger_claims_must_be_list")
    errors=[]
    allowed=set()
    for i,c in enumerate(claims):
        if not isinstance(c,dict):
            errors.append(f"claim_{i+1}_not_object"); continue
        cid=str(c.get("id") or f"claim_{i+1}")
        cls=str(c.get("claim_class") or "").upper()
        if cls not in VALID_CLASSES:
            errors.append(f"{cid}:invalid_claim_class:{cls}")
        vals=c.get("rendered_values")
        if not isinstance(vals,list) or not vals:
            errors.append(f"{cid}:rendered_values_required")
            vals=[]
        src=c.get("source")
        if cls in {"MEASURED","TARGET","PUBLIC FACT","LOGISTICS"}:
            if not isinstance(src,dict) or not str(src.get("ref") or "").strip():
                errors.append(f"{cid}:source_ref_required")
        if cls=="DERIVED":
            if not str(c.get("formula") or "").strip() or not isinstance(c.get("inputs"),list) or not c.get("inputs"):
                errors.append(f"{cid}:derived_requires_formula_and_inputs")
        if cls=="ESTIMATE" and (not isinstance(c.get("assumptions"),list) or not c.get("assumptions")):
            errors.append(f"{cid}:estimate_requires_assumptions")
        if cls=="SYNTHETIC" and not str(c.get("scenario_purpose") or "").strip():
            errors.append(f"{cid}:synthetic_requires_scenario_purpose")
        for v in vals:
            allowed.add(norm(str(v)))
    for v in data.get("allowlist",[]) if isinstance(data,dict) else []:
        allowed.add(norm(str(v)))
    return data,allowed,errors

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--ledger",required=True)
    ap.add_argument("--artifact",action="append",default=[])
    ap.add_argument("--text")
    ap.add_argument("--allow-unreadable",action="store_true")
    args=ap.parse_args()
    ledger,allowed,errors=load_ledger(pathlib.Path(args.ledger))
    texts=[]
    if args.text:
        texts.append(("inline",args.text))
    for f in args.artifact:
        p=pathlib.Path(f)
        try:
            texts.append((str(p),extract(p)))
        except Exception as exc:
            if not args.allow_unreadable:
                errors.append(f"{p}:unreadable:{exc}")
    unmatched=[]
    for label,text in texts:
        for raw in NUM_RE.findall(text):
            n=norm(raw)
            if not n:
                continue
            # Ignore bare tiny integers usually used for list numbering/page numbering.
            if re.fullmatch(r"[0-9]{1,2}",n):
                continue
            if n not in allowed:
                unmatched.append({"artifact":label,"value":raw})
    if unmatched:
        errors.append("unmatched_metrics:"+json.dumps(unmatched[:100]))
    out={"ok":not errors,"errors":errors,"claims":len(ledger.get("claims",[]) if isinstance(ledger,dict) else ledger),"artifacts_checked":len(texts)}
    print(json.dumps(out,indent=2))
    return 0 if out["ok"] else 2

if __name__=="__main__":
    sys.exit(main())
