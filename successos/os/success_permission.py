#!/usr/bin/env python3
from __future__ import annotations
import fnmatch, json, os, time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Literal

Decision=Literal["allow","prompt","deny"]
Mode=Literal["once","session","always","deny"]
FRESH_ONLY={"disk.partition","disk.format","bootloader.write","credential.export","identity.change","security.disable","os.replace"}

@dataclass(frozen=True)
class Request:
    subject:str; capability:str; operation:str; resource:str; host:str; risk:str

@dataclass
class Rule:
    subject:str; capability:str; operation:str; resource:str; host:str; risk:str; mode:Mode; created_at:int; expires_at:int|None=None
    def matches(self,req:Request)->bool:
        return self.subject in ("*",req.subject) and self.capability in ("*",req.capability) and self.operation in ("*",req.operation) and self.host in ("*",req.host) and self.risk in ("*",req.risk) and fnmatch.fnmatch(req.resource,self.resource)

class PolicyStore:
    def __init__(self,path:str|os.PathLike):
        self.path=Path(path); self.rules:list[Rule]=[]; self.session_rules:list[Rule]=[]; self.once_rules:list[Rule]=[]; self.load()
    def load(self)->None:
        if not self.path.exists(): return
        data=json.loads(self.path.read_text(encoding="utf-8")); now=int(time.time())
        for raw in data.get("rules",[]):
            rule=Rule(**raw)
            if rule.expires_at is not None and rule.expires_at<=now: continue
            if rule.mode in {"always","deny"}: self.rules.append(rule)
    def save(self)->None:
        self.path.parent.mkdir(parents=True,exist_ok=True); tmp=self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps({"version":1,"rules":[asdict(r) for r in self.rules]},indent=2)+"\n",encoding="utf-8"); os.replace(tmp,self.path)
    @staticmethod
    def durable_allowed(req:Request)->bool:
        if req.risk in {"R2","R3"} or req.capability in FRESH_ONLY: return False
        return req.resource.strip() not in {"","*","/**","**"}
    def evaluate(self,req:Request)->Decision:
        for collection in (self.once_rules,self.session_rules,self.rules):
            for rule in reversed(collection):
                if rule.matches(req):
                    if rule.mode=="deny": return "deny"
                    if rule.mode=="once": collection.remove(rule)
                    return "allow"
        return "allow" if req.risk=="R0" else "prompt"
    def grant(self,req:Request,mode:Mode)->Rule:
        if mode=="always" and not self.durable_allowed(req): raise ValueError("Durable approval is not allowed for this scope or risk class")
        rule=Rule(req.subject,req.capability,req.operation,req.resource,req.host,req.risk,mode,int(time.time()))
        if mode=="once": self.once_rules.append(rule)
        elif mode=="session": self.session_rules.append(rule)
        elif mode in {"always","deny"}: self.rules.append(rule); self.save()
        else: raise ValueError("Unknown mode")
        return rule

def interactive_approve(store:PolicyStore,req:Request)->Decision:
    decision=store.evaluate(req)
    if decision!="prompt": return decision
    print(f"Capability: {req.capability}\nOperation: {req.operation}\nResource: {req.resource}\nHost: {req.host}\nRisk: {req.risk}")
    print("\n1 Allow once\n2 Allow for this session\n3 Always allow this exact scope\n4 Deny")
    mode={"1":"once","2":"session","3":"always","4":"deny"}.get(input("> ").strip())
    if not mode: return "deny"
    try: store.grant(req,mode)
    except ValueError as exc: print(f"Cannot persist approval: {exc}"); return "deny"
    return "deny" if mode=="deny" else "allow"

if __name__=="__main__":
    import argparse
    p=argparse.ArgumentParser(); p.add_argument("--policy",default=os.environ.get("SUCCESSOS_POLICY","/var/lib/successos/policies.json")); p.add_argument("--subject",default=os.environ.get("USER","local-user")); p.add_argument("--capability",required=True); p.add_argument("--operation",required=True); p.add_argument("--resource",required=True); p.add_argument("--host",default=os.uname().nodename); p.add_argument("--risk",choices=["R0","R1","R2","R3"],required=True)
    a=p.parse_args(); req=Request(a.subject,a.capability,a.operation,a.resource,a.host,a.risk); store=PolicyStore(a.policy)
    raise SystemExit(0 if interactive_approve(store,req)=="allow" else 20)
