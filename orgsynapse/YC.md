# OrgSynapse — YC positioning draft

## One line

OrgSynapse replaces departmental system-of-record silos with one permissioned operational graph that Sales, Customer Success, Support, Product, Engineering, Finance, Operations, People teams, executives, and AI agents can use through role-specific views.

## Problem

A company's real operating state is fragmented across CRM, support tickets, project tools, documents, spreadsheets, chat, finance systems, and individual AI sessions. Each department maintains a partial copy. Handoffs lose context, metrics disagree, and agents inherit the same fragmentation.

## Product

OrgSynapse stores organizational entities and relationships once, then exposes them through purpose-built views. CRM is the initial wedge, but an account is connected to people, work, risks, opportunities, decisions, and activity in the same state used by other departments.

The current working alpha includes:

- CRM account state
- people and department relationships
- cross-functional work
- risk/opportunity/change/decision signals
- role lenses over the same underlying records
- global organization search
- organization graph visualization
- mutation/activity ledger
- portable JSON state

## Why this is not another company-brain product

The crowded category indexes company knowledge for search and agents. OrgSynapse's intended boundary is broader: it becomes operational state itself. Department applications become views and workflows over the graph rather than separate copies that must be synchronized.

The product must prove this distinction through workflows that modify shared state across departments, not by producing better answers to questions.

## Initial wedge

Customer Success / CRM for companies where customer state already spans Sales, Support, Product, Engineering, and Finance. A customer risk can immediately connect the account, technical issue, owner, product request, commercial value, and next work item without creating a second reconciliation workflow.

## Current evidence

Working local-first alpha exists. No claim of external product-market fit, multi-tenant production security, or live third-party connectors yet.

## Evidence gates before making this a primary YC application

1. At least one external company uses the shared-state model for real recurring work.
2. Connect at least two existing systems and demonstrate that OrgSynapse eliminates a manual reconciliation/handoff.
3. Measure one concrete result: time saved, fewer duplicate updates, faster handoff, reduced risk detection latency, or improved workflow completion.
4. Demonstrate tenant isolation and role-scoped production access.
5. Show why a customer would move operational state into OrgSynapse rather than only adding a search/memory layer above existing tools.

## Current YC assessment

Application-worthy validation track, but not the strongest Clintware YC candidate yet. Recent YC companies already cover company memory, shared agent context, knowledge graphs, and AI-native CRM. OrgSynapse becomes substantially stronger if the system-of-record replacement thesis is demonstrated with real cross-department workflows and customer evidence.
