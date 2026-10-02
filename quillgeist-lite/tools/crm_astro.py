#!/usr/bin/env python3
import argparse, json, pathlib, re, sys
from urllib.parse import urlparse

REQUIRED_ACTIONS={"describe","validate","plan"}
DEFAULT_SEED_CONTRACT={
    "portfolio_accounts_min":5,
    "lifecycle_stages_min":4,
    "contacts_per_account_min":3,
    "kpis_per_account_min":3,
    "actions_per_account_min":2,
    "risk_or_issue_per_account_min":1,
    "mixed_statuses_required":True,
    "meeting_context_per_account":True,
    "flow_coherence_required":True,
}

def load_manifest(path):
    p=pathlib.Path(path).expanduser().resolve()
    if not p.is_file():
        raise ValueError(f"manifest_not_found: {p}")
    data=json.loads(p.read_text(encoding="utf-8"))
    return p,data

def validate(data):
    errors=[]
    for key in ("project_id","company","name","domain","base_project","roles","tracks"):
        if not data.get(key):
            errors.append(f"missing:{key}")
    domain=str(data.get("domain",""))
    if domain and urlparse(domain).scheme!="https":
        errors.append("domain_must_be_https")
    tracks=data.get("tracks",[])
    if not isinstance(tracks,list):
        errors.append("tracks_must_be_list"); tracks=[]
    mode=str(data.get("mode") or "dual-track").strip().lower()
    ids=[]
    groups={"CSM":0,"Support":0}
    if mode=="dual-track" and len(tracks)!=12:
        errors.append(f"track_count:{len(tracks)}")
    if mode=="one-off" and not (4 <= len(tracks) <= 12):
        errors.append(f"one_off_track_count:{len(tracks)}")
    for idx,t in enumerate(tracks):
        if not isinstance(t,dict):
            errors.append(f"track_{idx+1}_not_object"); continue
        tid=str(t.get("id","")).strip()
        if not tid: errors.append(f"track_{idx+1}_missing_id")
        ids.append(tid)
        for key in ("label","tab","objective"):
            if not str(t.get(key,"")).strip():
                errors.append(f"track_{idx+1}_missing_{key}")
        if mode=="dual-track":
            group=str(t.get("group","")).strip()
            if group not in groups: errors.append(f"track_{idx+1}_bad_group:{group}")
            else: groups[group]+=1
    if len([x for x in ids if x]) != len(set(x for x in ids if x)):
        errors.append("duplicate_track_id")
    roles=data.get("roles",[])
    if not isinstance(roles,list) or len(roles)<1:
        errors.append("roles_must_include_at_least_one_role")
    if mode=="dual-track":
        if groups["CSM"]!=6 or groups["Support"]!=6:
            errors.append(f"unbalanced_groups:{groups}")
        if len(roles)<2:
            errors.append("dual_track_roles_must_include_two_roles")
    elif mode!="one-off":
        errors.append(f"unsupported_mode:{mode}")

    bundle=data.get("application_bundle")
    if bundle is not None:
        if not isinstance(bundle,dict):
            errors.append("application_bundle_must_be_object")
        else:
            profile=str(bundle.get("profile","")).strip().lower()
            if profile and profile!="crm+cover":
                errors.append(f"unsupported_application_profile:{profile}")
            if profile=="crm+cover":
                policy=str(bundle.get("crm_link_policy") or "live-verified-only").strip().lower()
                if policy!="live-verified-only":
                    errors.append(f"unsupported_crm_link_policy:{policy}")
                why=bundle.get("why_company")
                if why is not None and not isinstance(why,dict):
                    errors.append("why_company_must_be_object")
                elif isinstance(why,dict) and why.get("enabled",True):
                    lo=why.get("word_min")
                    hi=why.get("word_max")
                    if lo is not None and (not isinstance(lo,int) or lo < 1):
                        errors.append("why_company_word_min_invalid")
                    if hi is not None and (not isinstance(hi,int) or hi < 1):
                        errors.append("why_company_word_max_invalid")
                    if isinstance(lo,int) and isinstance(hi,int) and lo > hi:
                        errors.append("why_company_word_range_invalid")
                cover=bundle.get("cover_letter")
                if cover is not None and not isinstance(cover,dict):
                    errors.append("cover_letter_must_be_object")

                local_factory=bool(bundle.get("local_factory",False))
                if local_factory:
                    if str(data.get("implementation_reference") or "").strip()!="dplr-crm":
                        errors.append("local_factory_requires_dplr_crm_reference")
                    host=(urlparse(domain).hostname or "").lower()
                    explicit_domain_override=bool(data.get("domain_override_authorized",False))
                    if not explicit_domain_override and not re.fullmatch(r"[a-z0-9]{3}\.clintware\.com",host):
                        errors.append("local_factory_domain_must_be_three_letter_clintware_subdomain_unless_explicitly_overridden")
                    if explicit_domain_override and not re.fullmatch(r"[a-z0-9][a-z0-9-]{2,15}\.clintware\.com",host):
                        errors.append("local_factory_explicit_domain_override_invalid")
                    sources=data.get("public_sources")
                    if not isinstance(sources,list) or not any(isinstance(x,dict) and str(x.get("url") or "").startswith("http") for x in sources):
                        errors.append("local_factory_requires_public_job_source")
                    evidence=data.get("candidate_evidence")
                    if not isinstance(evidence,list) or len([x for x in evidence if str(x).strip()])<3:
                        errors.append("local_factory_requires_candidate_evidence")
                    scenarios=data.get("seed_scenarios")
                    if not isinstance(scenarios,list) or len(scenarios)<5:
                        errors.append("local_factory_requires_five_seed_scenarios")
                    else:
                        stages=set()
                        for idx,s in enumerate(scenarios):
                            if not isinstance(s,dict):
                                errors.append(f"seed_scenario_{idx+1}_not_object")
                                continue
                            stage=str(s.get("stage") or "").strip()
                            if stage: stages.add(stage.lower())
                            kpis=s.get("kpis")
                            actions=s.get("actions")
                            if not isinstance(kpis,list) or len(kpis)<3:
                                errors.append(f"seed_scenario_{idx+1}_requires_three_kpis")
                            else:
                                for kidx,k in enumerate(kpis):
                                    if not isinstance(k,dict) or not str(k.get("name") or "").strip() or not str(k.get("target") or "").strip() or not str(k.get("source") or "").strip():
                                        errors.append(f"seed_scenario_{idx+1}_kpi_{kidx+1}_missing_name_target_or_source")
                            if not isinstance(actions,list) or len(actions)<2:
                                errors.append(f"seed_scenario_{idx+1}_requires_two_actions")
                            if not str(s.get("goal") or "").strip():
                                errors.append(f"seed_scenario_{idx+1}_missing_goal")
                        if len(stages)<4:
                            errors.append("local_factory_requires_four_lifecycle_stages")
                    if not isinstance(why,dict) or not str(why.get("draft") or "").strip():
                        errors.append("local_factory_requires_why_company_draft")
                    if not isinstance(cover,dict) or not str(cover.get("draft") or "").strip():
                        errors.append("local_factory_requires_cover_letter_draft")
                    gates=str(bundle.get("interview_quality_gates") or "")
                    for required_gate in ("source","compression","core-before-extras","follow-up-restraint","human-validation"):
                        if required_gate not in gates:
                            errors.append(f"local_factory_missing_quality_gate:{required_gate}")
    persistence=str(data.get("persistence_mode") or "browser-local").strip().lower()
    remote_required=bool(data.get("remote_state_required",False))
    durable_required=bool(data.get("durable_objects_required",False))
    remote_reason=str(data.get("remote_state_reason") or "").strip()
    allowed_persistence={"browser-local","stateless","remote-required"}
    if persistence not in allowed_persistence:
        errors.append(f"unsupported_persistence_mode:{persistence}")
    if durable_required and not remote_required:
        errors.append("durable_objects_require_remote_state")
    if remote_required and persistence!="remote-required":
        errors.append("remote_state_requires_remote-required_persistence_mode")
    if persistence=="remote-required" and not remote_required:
        errors.append("remote-required_mode_requires_remote_state")
    if remote_required and not remote_reason:
        errors.append("remote_state_reason_required")
    if persistence in {"browser-local","stateless"} and durable_required:
        errors.append("local_or_stateless_mode_cannot_require_durable_objects")
    return errors,groups,mode,persistence,remote_required,durable_required,remote_reason

def result(action,path,data):
    errors,groups,mode,persistence,remote_required,durable_required,remote_reason=validate(data)
    bundle=data.get("application_bundle") if isinstance(data.get("application_bundle"),dict) else {}
    synthetic_default=bool(data.get("synthetic_data_default", True if mode=="one-off" else False))
    seed_contract=data.get("seed_expectations") if isinstance(data.get("seed_expectations"),dict) else (dict(DEFAULT_SEED_CONTRACT) if synthetic_default else None)
    application_profile=str(bundle.get("profile","")).strip().lower() or None
    base={
        "ok":not errors,
        "action":action,
        "manifest":str(path),
        "project_id":data.get("project_id"),
        "company":data.get("company"),
        "domain":data.get("domain"),
        "mode":mode,
        "track_count":len(data.get("tracks",[]) if isinstance(data.get("tracks"),list) else []),
        "groups":groups if mode=="dual-track" else None,
        "errors":errors,
        "application_profile":application_profile,
        "crm_link_policy":bundle.get("crm_link_policy") if application_profile else None,
        "local_first":True,
        "persistence_mode":persistence,
        "remote_state_required":remote_required,
        "durable_objects_required":durable_required,
        "remote_state_reason":remote_reason,
        "quota_independent":not durable_required,
        "remote_shell_exposed":False,
        "synthetic_data_default":synthetic_default,
        "seed_contract":seed_contract
    }
    if action=="describe":
        base["capabilities"]=[
            "one-off or dual-track manifest validation",
            "deterministic materialization handoff",
            "local npm/source checks",
            "reviewed deployment handoff",
            "browser-smoke handoff",
            "CRM+Cover application bundle validation and planning",
            "browser-local persistence by default for demos",
            "Durable Object rejection unless remote state is explicitly required",
            "multi-account multi-stage synthetic seed contract for one-off demos",
            "DPLR-derived local CRM+Cover factory validation",
            "three-letter Clintware domain validation for local application factory builds",
            "parallel local CRM+Cover build compatibility independent of QQ",
            "explicit user-authorized compact-domain override beyond the three-letter default",
            "synthetic KPI provenance fields and generated evidence-provenance ledger"
        ]
    elif action=="plan":
        pid=data.get("project_id","PROJECT")
        base["steps"]=[
            f"validate projects/{pid}/manifest.json",
            f"node projects/{pid}/scripts/materialize.mjs",
            f"run checks inside .build/{pid}",
            "verify browser-local/stateless builds contain no durable_objects binding",
            "seed a coherent portfolio across materially different lifecycle stages",
            "verify stakeholder/KPI/action/risk/meeting depth and mixed statuses",
            "run role-specific browser smoke",
            "deploy only when explicitly requested",
            "verify live domain before reporting live"
        ]
        if application_profile=="crm+cover":
            base["steps"] += [
                "draft Why Company against the verified application prompt and word range",
                "draft a distinct role-specific cover letter with the CRM as optional proof-of-work",
                "insert the CRM URL only after live + interactive browser verification",
                "run redundancy, claim, and synthetic-data disclosure checks",
                "apply source, answer-compression, core-before-extras, follow-up-restraint, and human-validation gates",
                "when local_factory is enabled, materialize from the shared DPLR reference and preserve three-letter domain identity"
            ]
    return base

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--Action",default="validate",choices=sorted(REQUIRED_ACTIONS))
    ap.add_argument("--Manifest",required=True)
    ap.add_argument("--Json",action="store_true")
    args=ap.parse_args()
    try:
        path,data=load_manifest(args.Manifest)
        out=result(args.Action,path,data)
    except Exception as exc:
        out={"ok":False,"action":args.Action,"error":str(exc)}
    print(json.dumps(out,indent=2))
    return 0 if out.get("ok") else 2

if __name__=="__main__":
    sys.exit(main())
