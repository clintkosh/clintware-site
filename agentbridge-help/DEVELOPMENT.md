# AgentBridge Help Center development invariant

AgentBridge treats product help as part of the feature, not as a later documentation task.

## Required rule

When a change alters user-visible AgentBridge behavior, the same change must update the relevant Help Center material in both runtime sources:

- `agentbridge-node/agentbridge_node/helpdb.py`
- `agentbridge-cloud/src/help.js`

Use the most relevant section rather than adding noise:

- `getting_started` for first-run or workflow changes
- `setup_removal` for installation, pairing, permissions, daemon, upgrade, or removal behavior
- `faq` for behavior users are likely to ask about
- `glossary` for new public terms or concepts
- `fixes` for released fixes or material behavior changes

Stable entry IDs and glossary terms must remain aligned between Node and Cloud so additive merging is deterministic.

## Runtime synchronization

The paired Node and AgentBridge Cloud use a two-way merge:

1. The Node loads its local Help Center, including packaged base help and locally learned/patch-added entries.
2. The Node sends that Help document to `/api/device/help/sync` using its device credential.
3. The account-scoped Cloud `HelpHub` merges Node help with the Cloud copy and Cloud base help.
4. Cloud returns the merged document in the same response.
5. The Node applies the returned entries locally.
6. The daemon repeats synchronization periodically and after a Cloud connection is established.

This means a relevant help change originating on either side converges onto both the paired client and the user's online Help Center.

## Execution Pack documentation updates

A successful Execution Pack may include `help_updates`.  `runner.py` applies those updates only after a passing run, so a patch that changes functionality can ship the matching FAQ/setup/glossary/fix entry with the code change.  The next help sync carries that entry to Cloud.

## CI enforcement

`scripts/check_agentbridge_help_docs.py` is run by AgentBridge CI.  It enforces two conditions:

1. Stable Help Center IDs and glossary terms remain aligned between the Node and Cloud base help.
2. A commit that changes user-facing AgentBridge Node, Cloud, dashboard, or mobile behavior must also modify both Help Center runtime sources.

If a feature does not require end-user documentation, keep the change outside user-facing runtime paths or explicitly structure it as tests/build/release metadata.  Do not bypass the guard for a real behavior change.
