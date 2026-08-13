# Active CRM Health and Functionality Audit — 2026-08-13

## Scope

This pass reviewed the other existing Clintware interview CRM demos that remained relevant to active job conversations after the Abnormal CRM had already been corrected. The two other active existing CRM builds identified for correction were:

- Zscaler
- DTEX

No new CRM was invented for companies that did not have a separate current CRM implementation in this repository.

## Model rule used across the demos

The Customer Health design is defaulted to Gainsight-style Customer Success health practices: a small number of understandable, weighted health dimensions combining adoption, value/outcomes, relationship/engagement, technical/deployment context, support/risk, and success-plan execution.

Each company may override the default weighting only where its public Customer Success/product strategy supports a different emphasis. Every corrected CRM states this directly in Settings rather than implying the weights are the target company's internal scorecard.

Required visible note pattern:

> Defaulted to Gainsight-style Customer Success health practices except where overridden by [Company] priorities.

These are independent interview-prototype interpretations. They are not Gainsight software and are not the target companies' internal scorecards.

## Common scoring logic

Health is a calculated 0–100 weighted average, not a manually entered number.

Common signal definitions:

- **Adoption:** stored product/workflow adoption signal.
- **Value realization:** documented outcome / ROI / value-evidence signal.
- **Relationship & engagement:** 60% relationship-quality assessment + 25% meeting recency + 15% executive coverage.
- **Technical / deployment:** technical or program coverage/readiness signal.
- **Support / risk:** support-confidence signal adjusted downward by the strongest active support severity / customer-risk penalty.
- **Success-plan execution:** average progress across documented success-plan objectives, with a neutral 50 when no plan exists.

Default health thresholds are:

- Healthy: 80+
- Watch: 65–79
- At Risk: below 65

The six weights must total 100%. Weights and thresholds are adjustable in Settings and recalculate the portfolio.

**Commercial readiness and renewal timing are deliberately not inputs to Health.** They remain separate readiness indicators so the model does not create circular renewal logic.

## Company weighting matrix

| CRM | Adoption | Value | Relationship | Technical / program | Support / risk | Success plan | Company-specific emphasis |
|---|---:|---:|---:|---:|---:|---:|---|
| Abnormal | 25% | 25% | 20% | 15% | 10% | 5% | Enterprise adoption, measurable security value, executive/champion alignment |
| Zscaler | 20% | 20% | 15% | 25% | 15% | 5% | Technical deployment, Support/Professional Services alignment, adoption and measurable value |
| DTEX | 20% | 20% | 15% | 25% | 10% | 10% | Insider-risk program coverage/maturity plus documented outcome execution |

## Zscaler

Production hosts:

- https://zsc.clintware.com
- https://zc.clintware.com

### Logic changes

- Removed arbitrary/manual Health as an editable account field.
- Added the 20/20/15/25/15/5 calculated Health model.
- Added six adjustable weights plus Healthy/Watch thresholds in Settings.
- Added the visible Gainsight-default / Zscaler-priority provenance note.
- Increased Technical / deployment and Support / risk versus the baseline because the public Zscaler Customer Success model combines Customer Success, Professional Services and Support around adoption and measurable/scalable value.
- Kept commercial readiness and renewal timing separate from Health.

### P1 functionality

The Zscaler P1 layer supports:

- Risk: add / edit / remove
- Stakeholder: add / edit / remove
- Success-plan objective: add / edit / remove
- Meeting: add / edit / remove
- Note: add / edit / remove
- Technical & Services: editable technical coverage, support confidence/severity, service ownership, utilization, integrations and active modules
- Commercial & Value: editable ARR, renewal date, value evidence, relationship quality, commercial readiness and Account Executive
- Health recalculation after relevant edits
- Settings save / reset
- Existing private lock/login behavior
- Google Analytics SPA page views under `/zsc/<route>` and `/zsc/account/<tab>`

A live end-to-end run exercised the mutable P1 workflows successfully and initially exposed only the old SPA Analytics defect. The tracker was then corrected to use a Zscaler-owned de-duplication key and to queue `page_view` events directly into `dataLayer` even if gtag.js has not finished loading.

Final authoritative Zscaler deployment run: `31669566819` — SUCCESS.

Final stable Zscaler Analytics run: `31669717884` — SUCCESS across both `zsc.clintware.com` and `zc.clintware.com`, all discovered main routes, and all account tabs.

The redundant competing Zscaler deployment workflow was removed so future `zscaler/**` changes use one authoritative release path.

## DTEX

Production custom domain verified:

- https://summertime-crmdemo.clintware.com

### Logic changes

- Added a native DTEX Health Settings workspace instead of copying the Abnormal/Zscaler data model wholesale.
- Health is calculated from DTEX-native adoption, value, stakeholder, technical/program coverage, support severity/confidence, meetings, and success-plan signals.
- Added the 20/20/15/25/10/10 weighting model.
- Added adjustable weights and thresholds.
- Added the visible Gainsight-default / DTEX-priority provenance note.
- Increased Technical / program coverage and Success-plan execution to reflect proactive insider-risk program maturity, operational coverage and measurable outcome execution.
- Kept commercial readiness and renewal timing separate from Health.

### P1 functionality

DTEX now supports:

- Technical / program context editing and browser persistence
- Adoption, Value, relationship quality and Commercial context editing and persistence
- Success-plan objective add / edit / remove
- Local Account Note add / edit / remove
- Local Meeting add / edit / remove
- Local Stakeholder add / edit / remove
- Existing seeded records remain visibly seeded rather than silently pretending they are newly mutable external-system records
- Existing private Lock behavior
- Google Analytics SPA page views under `/dtex/<view>`
- Browser-local persistence after reload

Final stable DTEX verifier run: `31669185481` — SUCCESS for scoring, Settings, formula check, edit parity, persistence, Lock and Analytics.

Custom-domain marker verification run: `31669775042` — SUCCESS; the historical DTEX custom domain serves the corrected Gainsight/P1/Analytics build.

## Analytics

Measurement ID across the Clintware CRM demos remains:

`G-DCY144YM9P`

- Abnormal: `/an/<route>` and `/an/account/<tab>`
- Zscaler: `/zsc/<route>` and `/zsc/account/<tab>`
- DTEX: `/dtex/<view>`

## Remaining prototype constraints

The following are intentional prototype limitations, not dummy UI:

1. Customer/account datasets are synthetic.
2. Signal inputs are not connected to the target companies, Gainsight, Salesforce, product telemetry, Support, billing or other production sources.
3. The weights are reasoned best-practice/company-priority defaults, not statistically calibrated against each target company's historical churn, renewal, expansion or adoption outcomes.
4. Persistence remains browser-local unless the particular demo explicitly uses another store.
5. Demo locks are not enterprise identity/session infrastructure.
6. The scorecards must not be represented as the target companies' actual internal models.

## Conclusion

The active existing CRM demos now use transparent, adjustable, internally coherent Customer Health logic rather than arbitrary manual Health values. The baseline is explicitly Gainsight-style Customer Success practice, and company-specific overrides are documented in Settings. Zscaler and DTEX have also been brought to the requested P1 functionality standard, with live production verification and route-level Analytics coverage.
