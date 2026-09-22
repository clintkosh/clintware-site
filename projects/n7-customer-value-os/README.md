# Neuron Seven — N7 Customer Value OS

**Candidate-built concept prototype** for a Neuron7 Customer Success case study.
This is **not** an official Neuron7 product, and it does not use any Neuron7
internal API, data, or policy. Planned demo hostname: `N7crm.clintware.com`.

A reusable, multi-customer Customer Value Operating System: it turns what was
sold into an implemented, adopted, measurable business outcome, and makes the
operating judgement behind that visible and defensible under panel pressure.

## What is inside

- **Portfolio home** (`/`) — customer cards, health, stage, target outcome, next
  milestone, plus a real Add Customer wizard that builds a full reusable
  workspace (not a static card).
- **Customer workspace** (`/customers/:customerId/:section`) — Executive
  Summary, Implementation, Critical Path, Risks + Decisions, RACI / Governance,
  Environment, Documents / Knowledge, Customer Messaging, ROI Workshop, KPI
  Contract, Accuracy Triage, Executive QBR, Readiness Gate, Virtual Liaison,
  Panel Defense, Assumption Change, Evidence / Artifacts.
- **Presentation mode** (`/present/:customerId`) — 30-second, 5-minute, full
  15–18 minute and direct-answer modes, with an executive/technical audience
  toggle and editing chrome hidden.
- **Architecture & Assumptions** (`/architecture`) — provenance model, data
  model, mock vs future integrations, credential boundaries, human approval
  gates, and what must be validated inside Neuron7 before production.

## Provenance rules

Every statement is labelled: `CASE FACT`, `WORKING ASSUMPTION`,
`ILLUSTRATIVE / DEMO DATA`, `HUMAN DECISION`, or `AUTOMATED SIGNAL`. The
supplied case is authoritative and is never "corrected" with public
information. Demo data is always labelled as demo data.

## Tech stack

TanStack Start (React 19, file-based routing, SSR), Vite, TypeScript,
Tailwind CSS v4, shadcn/ui, Recharts. The environment topology mapper is a
custom SVG implementation — no diagramming dependency.

**No database, no auth, no AI service.** All state is held in the browser
(`localStorage`). All "AI-style" behaviour is deterministic local computation.

## Development

```sh
git clone <this-repository-url>
cd <repository-name>
npm install
npm run dev        # http://localhost:8080
```

Other scripts: `npm run build` (production), `npm run build:dev`,
`npm run preview`, `npm run lint`, `npm run format`.

## Environment variables

None are required. The app builds and runs with no configuration and no
secrets. See `.env.example` for the single optional flag.

## Deployment and portability

Lovable is an implementation tool only; it is **not required at runtime**.
The production build targets Cloudflare Workers by default. See
[EXIT.md](./EXIT.md) for independent clone → build → deploy instructions and
for where future auth, database, and control-plane integrations belong.