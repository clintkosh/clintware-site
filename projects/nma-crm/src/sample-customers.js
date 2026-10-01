export const SAMPLE_SEED_VERSION=2;
export const SAMPLE_CUSTOMERS=[
{
 n:"Harbor Financial Group",pv:"synthetic_sample",f:"harbor-financial.synthetic.json",i:"Financial services",
 st:"Discovery · estate mapping",phase:"discover",week:2,health:"Watch",trend:"Improving",progress:24,
 priority:"Complete developer-side AI/MCP discovery and assign owners before governance decisions.",
 nextAction:"Run the endpoint + developer-tools discovery workshop and classify the top 10 unapproved MCP servers.",
 sm:"CISO; AI platform; AppSec; GRC; developer productivity",sc:"AI-SPM + MCP Security",
 sys:"AWS; Azure; GitHub; Okta; internal RAG; coding agents; MCP servers",
 g:"Create a reliable enterprise AI asset and ownership map before expanding agentic development.",
 met:"95% priority AI inventory; 90% MCP owner attribution; 100% critical combinations assigned",
 tl:"Synthetic 90-day discovery-to-governance plan",
 cs:"Cloud AI inventory is well understood; developer-configured agents and MCP servers are still being reconciled.",
 dep:"Close endpoint and developer-tool discovery gaps; assign ownership to unapproved MCP servers.",
 stakeholders:[
  {name:"Elena Brooks (Synthetic)",role:"CISO",decisionRole:"Executive risk appetite and program funding",status:"Active"},
  {name:"Marcus Reed (Synthetic)",role:"VP, AI Platform",decisionRole:"AI platform architecture and workload inventory",status:"Active"},
  {name:"Priya Shah (Synthetic)",role:"Director, AppSec",decisionRole:"MCP/tool review and remediation ownership",status:"Engaged"}
 ],
 metrics:[
  {name:"Priority AI inventory coverage",baseline:"34%",current:"47%",target:"95%+",owner:"AI Platform + Security Architecture",cadence:"Weekly",source:"Synthetic AI asset ledger"},
  {name:"MCP owner attribution",baseline:"9%",current:"21%",target:"90%+",owner:"AppSec + Developer Productivity",cadence:"Weekly",source:"Synthetic MCP registry"},
  {name:"Critical risk combinations assigned",baseline:"18%",current:"38%",target:"100%",owner:"Security Architecture",cadence:"Weekly",source:"Synthetic risk register"}
 ],
 risks:[
  {title:"Developer-local MCP servers are missing from the central inventory",severity:"High",status:"Open",owner:"Developer Productivity",decision:"Approve endpoint discovery coverage plan"},
  {title:"Two high-scope MCP servers have no accountable business owner",severity:"High",status:"Investigating",owner:"AppSec",decision:"Assign owner or keep blocked"}
 ],
 actions:[
  {title:"Ingest endpoint and IDE-agent discovery feed",owner:"AI Platform",due:"2026-10-05",status:"In Progress"},
  {title:"Run MCP ownership workshop",owner:"Customer Solutions + AppSec",due:"2026-10-07",status:"Scheduled"},
  {title:"Classify top 10 unapproved MCP servers",owner:"AppSec + Developer Productivity",due:"2026-10-10",status:"Planned"}
 ],
 issues:[{title:"Endpoint inventory connector misses developer-local MCP configuration",owner:"Customer Solutions + Product",status:"Open",priority:"High"}],
 adoption:[
  {name:"Priority estate discovered",value:"47%",period:"Week 2",source:"Synthetic AI asset ledger",owner:"AI Platform"},
  {name:"MCP servers with owner",value:"21%",period:"Week 2",source:"Synthetic MCP registry",owner:"AppSec"}
 ],
 meeting:{title:"AI Estate Discovery Readout",type:"Discovery checkpoint",date:"2026-10-08",objective:"Validate the discovered estate, ownership gaps, and the first governance decisions."}
},
{
 n:"Aster Health Systems",pv:"synthetic_sample",f:"aster-health.synthetic.json",i:"Healthcare",
 st:"Governance design · evidence mapping",phase:"govern",week:5,health:"On Track",trend:"Improving",progress:43,
 priority:"Turn policy intent into named control owners, evidence requirements, and risk-acceptance authority.",
 nextAction:"Approve the evidence taxonomy and assign final risk-acceptance authority for high-risk clinical AI workflows.",
 sm:"CISO; privacy; AI governance; clinical platform; AppSec",sc:"AI-SPM + Access Control + AI Red Team",
 sys:"Azure AI; RAG; clinical knowledge systems; Entra ID; SaaS copilots",
 g:"Scale approved AI use cases while preserving identity boundaries, sensitive-data controls, and auditable evidence.",
 met:"100% high-risk apps with owner/policy; 90% critical test closure; 95% control-evidence mapping",
 tl:"Synthetic two-quarter governance plan",
 cs:"Policy language exists; ownership and evidence are being normalized across clinical and platform teams.",
 dep:"Normalize control evidence and define risk-acceptance authority.",
 stakeholders:[
  {name:"Dr. Maya Foster (Synthetic)",role:"CISO",decisionRole:"Executive sponsor and risk acceptance",status:"Active"},
  {name:"Noah Kim (Synthetic)",role:"Head of AI Governance",decisionRole:"Policy, control taxonomy, evidence cadence",status:"Active"},
  {name:"Lena Ortiz (Synthetic)",role:"VP, Clinical Platform",decisionRole:"Clinical workload readiness and identity design",status:"Engaged"}
 ],
 metrics:[
  {name:"High-risk AI apps with owner + policy",baseline:"39%",current:"62%",target:"100%",owner:"AI Governance",cadence:"Biweekly",source:"Synthetic governance registry"},
  {name:"Critical red-team findings closed",baseline:"41%",current:"58%",target:"90%+",owner:"AppSec + App Owners",cadence:"Per release",source:"Synthetic test ledger"},
  {name:"Control evidence mapped to accountable owner",baseline:"28%",current:"45%",target:"95%+",owner:"GRC + AI Governance",cadence:"Monthly",source:"Synthetic GRC evidence map"}
 ],
 risks:[
  {title:"Clinical RAG service identity spans two sensitive knowledge domains",severity:"Critical",status:"Mitigation In Progress",owner:"Identity Engineering",decision:"Approve segmented identity design"},
  {title:"Risk-acceptance authority differs by application team",severity:"Medium",status:"Open",owner:"GRC",decision:"Approve one enterprise decision-rights model"}
 ],
 actions:[
  {title:"Normalize AI control evidence taxonomy",owner:"GRC + AI Governance",due:"2026-10-03",status:"Complete"},
  {title:"Assign enterprise risk-acceptance authority",owner:"CISO + Legal + GRC",due:"2026-10-09",status:"In Progress"},
  {title:"Red-team clinical RAG after identity segmentation",owner:"AppSec",due:"2026-10-15",status:"Planned"}
 ],
 issues:[{title:"Identity Engineering capacity constrains segmented-service-account rollout",owner:"Customer Solutions + Identity Engineering",status:"In Progress",priority:"High"}],
 adoption:[
  {name:"High-risk apps with policy owner",value:"62%",period:"Week 5",source:"Synthetic governance registry",owner:"AI Governance"},
  {name:"Evidence controls mapped",value:"45%",period:"Week 5",source:"Synthetic GRC evidence map",owner:"GRC"}
 ],
 meeting:{title:"AI Governance Design Review",type:"Governance checkpoint",date:"2026-10-10",objective:"Approve control ownership, evidence contract, and risk-acceptance decision rights."}
},
{
 n:"Forge Industrial",pv:"synthetic_sample",f:"forge-industrial.synthetic.json",i:"Manufacturing",
 st:"Pre-production testing · release gates",phase:"test",week:7,health:"At Risk",trend:"Stable",progress:55,
 priority:"Make AI security testing a repeatable release gate for tier-1 engineering and operations workloads.",
 nextAction:"Resolve the release-gate threshold disagreement and retest the two blocked tier-1 workloads.",
 sm:"CISO; OT security; engineering; AI platform; GRC",sc:"AI Red Team + AI-SPM",
 sys:"Private cloud; engineering copilots; RAG; model gateway; OT knowledge systems",
 g:"Introduce repeatable pre-production AI security testing for engineering and operations workloads.",
 met:"100% tier-1 apps tested pre-release; 90% critical closure; 6 reusable test profiles",
 tl:"Synthetic 16-week test program",
 cs:"Testing coverage is improving, but release criteria differ across engineering and operations teams.",
 dep:"Agree severity thresholds, release gate, risk-acceptance path, and retest evidence.",
 stakeholders:[
  {name:"Owen Price (Synthetic)",role:"CISO",decisionRole:"Release-risk appetite and escalation authority",status:"Active"},
  {name:"Alicia Grant (Synthetic)",role:"VP, Engineering",decisionRole:"Tier-1 release readiness",status:"Active"},
  {name:"Derek Wu (Synthetic)",role:"Director, Product Security",decisionRole:"Test profiles, severity and closure evidence",status:"Active"}
 ],
 metrics:[
  {name:"Tier-1 workloads tested before release",baseline:"22%",current:"67%",target:"100%",owner:"Product Security",cadence:"Per release",source:"Synthetic release ledger"},
  {name:"Critical findings closed or accepted",baseline:"35%",current:"61%",target:"90%+",owner:"AppSec + App Owners",cadence:"Weekly",source:"Synthetic red-team ledger"},
  {name:"Reusable test profiles published",baseline:"0",current:"2 of 6",target:"6 of 6",owner:"Product Security",cadence:"Monthly",source:"Synthetic test-profile registry"}
 ],
 risks:[
  {title:"Engineering and OT teams use different critical-severity release thresholds",severity:"Critical",status:"Escalated",owner:"CISO + Engineering",decision:"Approve one tier-1 release threshold"},
  {title:"OT knowledge assistant has incomplete privileged-data test coverage",severity:"High",status:"Open",owner:"OT Security",decision:"Approve additional adversarial test set"}
 ],
 actions:[
  {title:"Publish common tier-1 release-gate rubric",owner:"Product Security + GRC",due:"2026-10-06",status:"In Progress"},
  {title:"Retest two blocked tier-1 workloads",owner:"AppSec + Engineering",due:"2026-10-11",status:"Blocked"},
  {title:"Create OT privileged-data test profile",owner:"OT Security",due:"2026-10-18",status:"Planned"}
 ],
 issues:[{title:"Release-gate decision is blocking two production promotions",owner:"Customer Solutions + CISO + Engineering",status:"Escalated",priority:"Critical"}],
 adoption:[
  {name:"Tier-1 workloads in standard test path",value:"67%",period:"Week 7",source:"Synthetic release ledger",owner:"Product Security"},
  {name:"Critical closure rate",value:"61%",period:"Week 7",source:"Synthetic red-team ledger",owner:"AppSec"}
 ],
 meeting:{title:"Tier-1 Release Gate Escalation",type:"Executive escalation",date:"2026-10-06",objective:"Resolve severity threshold, unblock safe releases, and assign retest evidence owners."}
},
{
 n:"Vector Commerce",pv:"synthetic_sample",f:"vector-commerce.synthetic.json",i:"Global retail and e-commerce",
 st:"Runtime protection · SOC operationalization",phase:"protect",week:9,health:"At Risk",trend:"Improving",progress:68,
 priority:"Stabilize production event routing and ownership without creating alert fatigue for high-volume AI workflows.",
 nextAction:"Complete SOC acceptance testing for high-consequence agent events and close the alert-routing ownership gap.",
 sm:"CISO; digital commerce; AI engineering; fraud; SOC",sc:"AI-DR + AI Red Team",
 sys:"AWS; agentic customer service; RAG; recommendation workflows; SIEM; API gateway",
 g:"Protect high-volume customer-facing AI workflows without creating excessive friction or alert noise.",
 met:"90% high-risk runtime coverage; 95% critical event routing; 90% priority alerts triaged within SLA",
 tl:"Synthetic 12-week runtime operationalization",
 cs:"Production controls are active across most priority workloads; SOC ownership and tuning are the remaining scale constraints.",
 dep:"Finalize event-routing acceptance, alert ownership, and high-consequence action policies.",
 stakeholders:[
  {name:"Grace Turner (Synthetic)",role:"CISO",decisionRole:"Production risk posture and executive escalation",status:"Active"},
  {name:"Leo Martin (Synthetic)",role:"VP, Digital Commerce",decisionRole:"Customer-facing AI availability and business impact",status:"Engaged"},
  {name:"Iris Park (Synthetic)",role:"SOC Director",decisionRole:"Alert routing, triage ownership and response SLA",status:"Active"}
 ],
 metrics:[
  {name:"High-risk runtime protection coverage",baseline:"31%",current:"72%",target:"90%+",owner:"AI Security + SOC",cadence:"Weekly",source:"Synthetic runtime ledger"},
  {name:"Critical event routing accepted by SOC",baseline:"18%",current:"84%",target:"95%+",owner:"SOC + Security Engineering",cadence:"Weekly",source:"Synthetic event-routing test"},
  {name:"Priority AI alerts triaged within SLA",baseline:"44%",current:"62%",target:"90%+",owner:"SOC",cadence:"Weekly",source:"Synthetic SIEM queue"}
 ],
 risks:[
  {title:"High-consequence agent events still route to an unowned shared queue",severity:"Critical",status:"Mitigation In Progress",owner:"SOC",decision:"Assign permanent queue ownership and paging path"},
  {title:"One recommendation workflow produces noisy low-value policy events",severity:"Medium",status:"Tuning",owner:"AI Security",decision:"Approve tuned policy threshold"}
 ],
 actions:[
  {title:"Complete SOC acceptance for high-consequence events",owner:"SOC + Security Engineering",due:"2026-10-04",status:"In Progress"},
  {title:"Assign permanent owner for AI runtime queue",owner:"SOC Director",due:"2026-10-03",status:"In Progress"},
  {title:"Tune recommendation-workflow policy",owner:"AI Security + Commerce Engineering",due:"2026-10-09",status:"Planned"}
 ],
 issues:[{title:"Critical runtime alerts have inconsistent queue ownership after business hours",owner:"Customer Solutions + SOC",status:"In Progress",priority:"Critical"}],
 adoption:[
  {name:"High-risk production workloads protected",value:"72%",period:"Week 9",source:"Synthetic runtime ledger",owner:"AI Security"},
  {name:"Critical event routes accepted",value:"84%",period:"Week 9",source:"Synthetic event-routing test",owner:"SOC"}
 ],
 meeting:{title:"Runtime Operations Readiness Review",type:"Operational readiness",date:"2026-10-04",objective:"Accept event routing, response ownership, tuning cadence, and remaining production-risk decisions."}
},
{
 n:"Summit SaaS",pv:"synthetic_sample",f:"summit-saas.synthetic.json",i:"B2B software",
 st:"Adoption + value proof · MCP governance",phase:"prove",week:11,health:"On Track",trend:"Improving",progress:82,
 priority:"Prove that governed MCP adoption can increase while shadow usage and high-scope access decline.",
 nextAction:"Finalize the quarterly value evidence pack and convert product friction into a closed-loop roadmap signal.",
 sm:"CISO; platform engineering; product security; DevEx; product",sc:"MCP Security + Access Control",
 sys:"GitHub; CI/CD; coding agents; internal MCP registry; Slack/Jira tools; cloud",
 g:"Keep developer agent and MCP adoption fast while reducing supply-chain, permission, and tool-poisoning risk.",
 met:"90% approved registry usage; 100% high-scope tools reviewed; 80% shadow MCP reduction",
 tl:"Synthetic 90-day MCP program",
 cs:"Governed adoption is strong and measurable; the remaining work is shadow-server reduction and product-friction closure.",
 dep:"Complete shadow-MCP reduction plan and close owner-attribution workflow friction.",
 stakeholders:[
  {name:"Camille Ross (Synthetic)",role:"CISO",decisionRole:"Executive value and risk narrative",status:"Active"},
  {name:"Ben Alvarez (Synthetic)",role:"VP, Developer Experience",decisionRole:"Developer adoption and approved-tool experience",status:"Active"},
  {name:"Tess Nguyen (Synthetic)",role:"Director, Product Security",decisionRole:"MCP review and high-scope access decisions",status:"Active"}
 ],
 metrics:[
  {name:"Approved MCP registry usage",baseline:"51%",current:"88%",target:"90%+",owner:"Developer Experience",cadence:"Weekly",source:"Synthetic MCP registry"},
  {name:"High-scope MCP tools reviewed",baseline:"29%",current:"94%",target:"100%",owner:"Product Security",cadence:"Weekly",source:"Synthetic governance ledger"},
  {name:"Shadow MCP usage reduction",baseline:"0%",current:"68%",target:"80%+",owner:"Developer Experience + AppSec",cadence:"Monthly",source:"Synthetic endpoint comparison"}
 ],
 risks:[
  {title:"New local MCP servers can appear faster than owner attribution",severity:"Medium",status:"Monitoring",owner:"Developer Experience",decision:"Approve automated ownership enrichment experiment"},
  {title:"Two high-scope tools remain in review pending product-owner evidence",severity:"Medium",status:"Open",owner:"Product Security",decision:"Approve or narrow access scope"}
 ],
 actions:[
  {title:"Publish quarterly MCP governance value pack",owner:"Customer Solutions + CISO",due:"2026-10-05",status:"In Progress"},
  {title:"Close two remaining high-scope tool reviews",owner:"Product Security",due:"2026-10-06",status:"In Progress"},
  {title:"Send owner-attribution friction signal to Product",owner:"Customer Solutions",due:"2026-10-02",status:"Complete"}
 ],
 issues:[{title:"Owner attribution workflow adds manual review time for newly discovered MCP servers",owner:"Customer Solutions → Product / Research",status:"Open",priority:"Medium"}],
 adoption:[
  {name:"Approved registry usage",value:"88%",period:"Week 11",source:"Synthetic MCP registry",owner:"Developer Experience"},
  {name:"Shadow MCP reduction",value:"68%",period:"Week 11",source:"Synthetic endpoint comparison",owner:"AppSec"}
 ],
 meeting:{title:"Quarterly MCP Governance Value Review",type:"Executive value review",date:"2026-10-07",objective:"Approve value evidence, remaining governance actions, and next-quarter scaling priorities."}
},
{
 n:"Northwind Technology Services",pv:"synthetic_sample",f:"northwind-services.synthetic.json",i:"Technology services",
 st:"Renewal + expansion · multi-practice rollout",phase:"expand",week:14,health:"Healthy",trend:"Improving",progress:93,
 priority:"Convert proven core-team outcomes into a capacity-aware expansion plan for two additional practices.",
 nextAction:"Approve the two-practice expansion sequence, named control owners, and joint Customer Solutions/Sales success criteria.",
 sm:"CTO; CISO; AI practice; customer delivery; Sales",sc:"AI-SPM + MCP Security + AI-DR",
 sys:"Multi-cloud; customer delivery agents; internal accelerators; GitHub; knowledge systems",
 g:"Turn proven AI security outcomes in the core platform team into a scalable program for additional practices and regions.",
 met:"3 approved value stories; 2 expansion practices selected; 90% control-owner readiness before rollout",
 tl:"Synthetic quarterly expansion plan",
 cs:"Core-team outcomes are documented and renewal confidence is strong; expansion demand now exceeds governance staffing.",
 dep:"Sequence expansion to match control-owner capacity and preserve evidence quality.",
 stakeholders:[
  {name:"Rachel Stone (Synthetic)",role:"CTO",decisionRole:"Executive expansion sponsor",status:"Active"},
  {name:"Victor Hale (Synthetic)",role:"CISO",decisionRole:"Risk posture and control-owner readiness",status:"Active"},
  {name:"Jamal Reed (Synthetic)",role:"VP, AI Practice",decisionRole:"Practice rollout, adoption and resource allocation",status:"Active"}
 ],
 metrics:[
  {name:"Approved customer value stories",baseline:"0",current:"3 of 3",target:"3 of 3",owner:"Customer Solutions + Executive Sponsor",cadence:"Quarterly",source:"Synthetic executive evidence pack"},
  {name:"Expansion practices selected",baseline:"0",current:"2 of 2",target:"2 of 2",owner:"Sales + AI Practice",cadence:"Quarterly",source:"Synthetic expansion scorecard"},
  {name:"Control-owner readiness",baseline:"46%",current:"87%",target:"90%+",owner:"CISO + Practice Leads",cadence:"Biweekly",source:"Synthetic readiness scorecard"}
 ],
 risks:[
  {title:"Expansion demand exceeds current governance-owner capacity",severity:"High",status:"Accepted with Plan",owner:"CISO + AI Practice",decision:"Sequence two practices rather than launch all requested teams"},
  {title:"Regional delivery practice needs an additional runtime-response owner",severity:"Medium",status:"Open",owner:"Customer Delivery",decision:"Name owner before rollout"}
 ],
 actions:[
  {title:"Approve two-practice expansion sequence",owner:"CTO + CISO + Sales",due:"2026-10-03",status:"Ready for Decision"},
  {title:"Name runtime-response owner for regional delivery",owner:"Customer Delivery",due:"2026-10-08",status:"In Progress"},
  {title:"Publish joint expansion success criteria",owner:"Customer Solutions + Sales",due:"2026-10-10",status:"Planned"}
 ],
 issues:[{title:"Control-owner staffing is the gating dependency for additional practice expansion",owner:"Customer Solutions + Sales + CISO",status:"Decision Required",priority:"High"}],
 adoption:[
  {name:"Core-team value stories approved",value:"3 of 3",period:"Quarter close",source:"Synthetic executive evidence pack",owner:"Customer Solutions"},
  {name:"Control-owner readiness",value:"87%",period:"Week 14",source:"Synthetic readiness scorecard",owner:"CISO"}
 ],
 meeting:{title:"Renewal + Expansion Executive Review",type:"Commercial + executive review",date:"2026-10-03",objective:"Confirm renewal value, approve the two-practice expansion sequence, and lock readiness owners."}
}
];
