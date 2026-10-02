window.SYNERGY_SEED={
  version:1,
  disclaimer:"Synthetic training and workflow data only. No real customer records or private company process data.",
  personas:{
    shared:{label:"Shared View",tracks:["command","journey","coverage","handoffs","risks","themes","meetings","training","evidence"]},
    csm:{label:"CSM",tracks:["command","journey","coverage","adoption","risks","meetings","training","evidence"]},
    tam:{label:"TAM",tracks:["command","journey","coverage","handoffs","technical","threats","adoption","risks","themes","meetings","training","evidence"]},
    partner:{label:"Partner",tracks:["command","journey","coverage","handoffs","technical","risks","themes","meetings","training","evidence"]}
  },
  values:{
    trust:{label:"TRUST",note:"Source boundaries, visible ownership, and evidence before escalation."},
    think:{label:"THINK BIG",note:"Convert repeated friction into scalable system improvement."},
    respect:{label:"MUTUAL RESPECT",note:"Preserve context and resolve boundaries without customer ping-pong."},
    success:{label:"CUSTOMER SUCCESS",note:"Anchor decisions to the customer's outcome and adoption path."}
  },
  accounts:[
    {
      id:"meridian",name:"Meridian Finance",synthetic:true,industry:"Financial Services",motion:"Partner-Sourced",stage:"Partner Onboarding",health:"Watch",progress:20,
      objective:"Launch the white-label service with clear service boundaries, validated protected assets, and one post-implementation technical owner.",
      csm:"Partner relationship owner",tam:"Avery Chen",partner:"Service Account Manager",nextDecision:"Confirm who owns ongoing protected-asset maintenance after the paid integration package closes.",
      successSignals:["Customer can identify one owner for every open workstream","Protected assets accepted","Automation acceptance criteria approved"],
      journey:[
        ["Discovery","Done","Partner package, business objective, security contacts captured","trust"],
        ["Entitlement map","Done","Account, break-fix, integration package, managed services, vendor TAM boundaries mapped","respect"],
        ["Protected assets","Active","Asset inventory validation in progress","success"],
        ["Automation acceptance","Next","Takedown configuration test and exception policy","trust"],
        ["Steady-state handoff","Next","CSM/TAM/Partner operating cadence","respect"]
      ],
      handoffs:[
        {id:"h-m1",from:"Partner Integration Services",to:"TAM",status:"Pending acceptance",type:"Service boundary",summary:"Initial configuration package is closing; ongoing tuning and asset maintenance need a named owner.",evidence:"Package scope + open maintenance checklist",value:"respect"},
        {id:"h-m2",from:"Partner SAM",to:"CSM/TAM",status:"Ready",type:"Customer context",summary:"Business objective and executive contacts captured for steady-state success plan.",evidence:"Kickoff notes",value:"trust"}
      ],
      technical:[
        {item:"SSO/admin access validation",owner:"Partner Integration Services",status:"Done",evidence:"Synthetic acceptance record"},
        {item:"Protected-asset import",owner:"TAM",status:"Active",evidence:"Synthetic asset checklist"},
        {item:"Automated-takedown configuration",owner:"TAM + Customer Security",status:"Next",evidence:"Synthetic acceptance criteria"}
      ],
      threats:[
        {surface:"Domains",protected:"42 assets",monitoring:"Configured",enforcement:"Acceptance test pending",source:"Synthetic platform state"},
        {surface:"Social",protected:"8 brand handles",monitoring:"Discovery",enforcement:"Not yet enabled",source:"Synthetic platform state"}
      ],
      adoption:[
        {metric:"Workflow readiness",current:"78%",target:"100%",class:"SYNTHETIC",source:"Synthetic onboarding checklist",meaning:"Share of agreed setup controls validated"},
        {metric:"Named-owner coverage",current:"92%",target:"100%",class:"SYNTHETIC",source:"Synthetic assignment ledger",meaning:"Active work with one accountable lane"}
      ],
      risks:[{title:"Post-package ownership gap",severity:"High",owner:"TAM + Partner SAM",status:"Open",next:"Approve steady-state responsibility matrix",evidence:"One maintenance workstream lacks accepted ownership",value:"respect"}],
      themes:[{theme:"Service-package boundary questions",count:4,class:"SYNTHETIC",action:"Convert into entitlement decision tree",destination:"Partner enablement",value:"think"}],
      meetings:[{title:"Partner onboarding boundary review",audience:"CSM + TAM + Partner",when:"Next checkpoint",decision:"Approve steady-state ownership and automation acceptance plan"}]
    },
    {
      id:"atlas",name:"Atlas Retail Group",synthetic:true,industry:"Retail",motion:"Partner-Sourced",stage:"Steady-State Optimization",health:"Healthy",progress:80,
      objective:"Reduce repeat routing and tuning friction after launch without absorbing paid-service work into an undefined support lane.",
      csm:"Partner relationship owner",tam:"Jordan Lee",partner:"Partner Support Lead",nextDecision:"Publish the reviewed tuning decision tree and measure recurrence next cycle.",
      successSignals:["Fewer repeat transfers","Known-answer coverage increases","Recurring themes close into documentation or service design"],
      journey:[["Launch","Done","Core monitoring active","success"],["Pattern review","Done","Repeat tuning requests classified","trust"],["Ownership decision tree","Done","Partner and TAM boundaries reviewed","respect"],["Knowledge publication","Active","Final article in review","think"],["Recurrence check","Next","Measure whether routing friction falls","success"]],
      handoffs:[{id:"h-a1",from:"Partner Support",to:"TAM",status:"Accepted",type:"Deep product tuning",summary:"Recurring configuration pattern moved from break-fix to product-depth guidance.",evidence:"Three synthetic cases with same pattern",value:"respect"}],
      technical:[{item:"Monitoring rule tuning",owner:"TAM",status:"Done",evidence:"Synthetic case comparison"},{item:"Knowledge decision tree",owner:"TAM + Partner Support",status:"Review",evidence:"Synthetic runbook"}],
      threats:[{surface:"Domains",protected:"126 assets",monitoring:"Steady state",enforcement:"Automated where eligible",source:"Synthetic platform state"},{surface:"Marketplaces",protected:"3 storefront identities",monitoring:"Pilot",enforcement:"Manual review",source:"Synthetic platform state"}],
      adoption:[{metric:"Known-answer coverage",current:"76%",target:"90%",class:"SYNTHETIC",source:"Synthetic knowledge audit",meaning:"Recurring patterns with reviewed guidance"},{metric:"Repeat handoff rate",current:"18%",target:"<10%",class:"SYNTHETIC",source:"Synthetic case audit",meaning:"Sample requests transferred more than once"}],
      risks:[{title:"Tuning requests re-enter baseline support",severity:"Medium",owner:"TAM",status:"Watch",next:"Publish decision tree and review recurrence",evidence:"Synthetic recurring-case sample",value:"trust"}],
      themes:[{theme:"Monitoring tuning",count:7,class:"SYNTHETIC",action:"Publish knowledge + clarify service boundary",destination:"Documentation + Partner enablement",value:"think"}],
      meetings:[{title:"Monthly partner operations review",audience:"TAM + Partner Support + Services",when:"Monthly",decision:"Close or escalate recurring themes"}]
    },
    {
      id:"northstar",name:"Northstar Travel",synthetic:true,industry:"Travel Technology",motion:"Partner-Sourced",stage:"API Escalation",health:"At Risk",progress:40,
      objective:"Resolve intermittent callback failures with enough evidence to distinguish partner configuration, integration behavior, and reproducible product defect.",
      csm:"Partner relationship owner",tam:"Avery Chen",partner:"Partner Support Engineer",nextDecision:"Complete correlation-ID evidence and minimal reproduction before Product/Engineering escalation.",
      successSignals:["One reproducible problem statement","Customer does not repeat discovery","Engineering receives evidence-complete handoff"],
      journey:[["Impact confirmation","Done","Affected workflow and business impact confirmed","trust"],["Working/failing samples","Done","Comparative requests captured","trust"],["Correlation evidence","Active","IDs and auth context being collected","trust"],["Minimal reproduction","Next","Strip to smallest failing request","think"],["Escalation/closure","Next","Correct owner acts with preserved context","respect"]],
      handoffs:[{id:"h-n1",from:"Partner Support",to:"TAM",status:"Accepted",type:"Advanced integration investigation",summary:"Baseline support isolated the issue beyond standard configuration guidance.",evidence:"Synthetic case history + request samples",value:"respect"},{id:"h-n2",from:"TAM",to:"Product/Engineering",status:"Blocked on evidence",type:"Defect candidate",summary:"Escalation packet intentionally held until correlation IDs and minimal reproduction are complete.",evidence:"Expected vs actual + synthetic logs",value:"trust"}],
      technical:[{item:"Auth scope comparison",owner:"TAM",status:"Done",evidence:"Synthetic working/failing sample"},{item:"Correlation ID capture",owner:"TAM + Partner Support",status:"Active",evidence:"Synthetic request log"},{item:"Minimal reproduction",owner:"TAM",status:"Next",evidence:"Pending"}],
      threats:[{surface:"API-driven enforcement callback",protected:"Integration workflow",monitoring:"Active investigation",enforcement:"Delayed by callback failure",source:"Synthetic integration state"}],
      adoption:[{metric:"Evidence completeness",current:"80%",target:"100%",class:"SYNTHETIC",source:"Synthetic diagnostic checklist",meaning:"Required fields captured for advanced escalation"},{metric:"Cases with correlation ID",current:"86%",target:"100%",class:"SYNTHETIC",source:"Synthetic case audit",meaning:"Active integration cases with request/event identifiers"}],
      risks:[{title:"Premature Engineering escalation",severity:"High",owner:"TAM",status:"Open",next:"Finish minimal reproduction",evidence:"Current packet missing one evidence class",value:"trust"}],
      themes:[{theme:"Callback troubleshooting evidence",count:3,class:"SYNTHETIC",action:"Create API escalation checklist",destination:"Partner Support + TAM enablement",value:"think"}],
      meetings:[{title:"API escalation working session",audience:"TAM + Partner Support + Customer Integration",when:"Today",decision:"Confirm next test and escalation gate"}]
    },
    {
      id:"pinecrest",name:"Pinecrest Bank",synthetic:true,industry:"Banking",motion:"Direct Enterprise",stage:"Enterprise Onboarding",health:"Healthy",progress:60,
      objective:"Move a named enterprise customer from discovery to accepted monitoring/takedown operations with CSM/TAM ownership clear from day one.",
      csm:"Morgan Rivera",tam:"Jordan Lee",partner:"N/A - Direct",nextDecision:"Complete automated-takedown acceptance test before steady-state graduation.",
      successSignals:["Customer outcome documented","Protected assets accepted","Primary integration passes acceptance","CSM/TAM cadence established"],
      journey:[["Outcome discovery","Done","Risk profile and success criteria documented","success"],["Asset configuration","Done","Core protected assets configured","trust"],["Integration validation","Done","Primary integration acceptance passed","trust"],["Automation acceptance","Active","Customer security reviewing exceptions","success"],["Steady-state graduation","Next","CSM/TAM cadence and ownership activated","respect"]],
      handoffs:[{id:"h-p1",from:"Solutions/Implementation context",to:"CSM + TAM",status:"Accepted",type:"Direct customer launch",summary:"Success criteria and technical requirements translated into onboarding plan.",evidence:"Synthetic discovery brief",value:"success"}],
      technical:[{item:"Protected asset configuration",owner:"TAM",status:"Done",evidence:"Synthetic asset checklist"},{item:"Primary integration",owner:"TAM + Customer Integration",status:"Done",evidence:"Synthetic acceptance test"},{item:"Automated-takedown policy",owner:"TAM + Customer Security",status:"Active",evidence:"Synthetic exception review"}],
      threats:[{surface:"Domains",protected:"88 assets",monitoring:"Configured",enforcement:"Acceptance test active",source:"Synthetic platform state"},{surface:"App stores",protected:"5 app identities",monitoring:"Configured",enforcement:"Manual review until acceptance",source:"Synthetic platform state"}],
      adoption:[{metric:"Asset validation",current:"88%",target:"100%",class:"SYNTHETIC",source:"Synthetic asset tracker",meaning:"Agreed assets reviewed and accepted"},{metric:"Training completion",current:"83%",target:"100%",class:"SYNTHETIC",source:"Synthetic enablement tracker",meaning:"Named operational users completed role-based training"}],
      risks:[{title:"Security approval dependency",severity:"Medium",owner:"CSM + Customer Security",status:"Watch",next:"Close automation exception review",evidence:"One approval remains open",value:"success"}],
      themes:[{theme:"Automation exception criteria",count:2,class:"SYNTHETIC",action:"Add acceptance checklist to onboarding playbook",destination:"CSM/TAM enablement",value:"think"}],
      meetings:[{title:"Enterprise onboarding checkpoint",audience:"CSM + TAM + Customer Security",when:"Weekly",decision:"Approve automation acceptance and steady-state graduation"}]
    },
    {
      id:"harbor",name:"Harbor Marketplace",synthetic:true,industry:"Marketplace",motion:"Direct Enterprise",stage:"Adoption & Tuning",health:"Healthy",progress:83,
      objective:"Improve multi-channel operating fit and prove adjacent value before opening any expansion conversation.",
      csm:"Morgan Rivera",tam:"Avery Chen",partner:"N/A - Direct",nextDecision:"Review pilot evidence against the customer's decision criterion before proposing broader platform use.",
      successSignals:["Customer-defined decision criterion exists","Automation exceptions understood","Adjacent use case has evidence before commercial motion"],
      journey:[["Baseline workflow","Done","Current channels and operator workflow mapped","success"],["Tuning review","Done","Domain/social configuration reviewed","trust"],["Exception review","Done","Automation exceptions understood","trust"],["Decision criterion","Done","Customer defined what would make adjacent channel useful","success"],["Adjacent pilot","Done","Synthetic pilot completed","think"],["Evidence review","Active","CSM/TAM reviewing result before expansion","success"]],
      handoffs:[{id:"h-h1",from:"CSM",to:"TAM",status:"Accepted",type:"Adoption hypothesis",summary:"Customer interest in app-store monitoring converted into a technical pilot with an explicit decision criterion.",evidence:"Synthetic success-plan note",value:"success"}],
      technical:[{item:"Domain/social tuning",owner:"TAM",status:"Done",evidence:"Synthetic configuration review"},{item:"App-store pilot",owner:"TAM",status:"Done",evidence:"Synthetic pilot brief"},{item:"Expansion evidence review",owner:"CSM + TAM",status:"Active",evidence:"Synthetic decision matrix"}],
      threats:[{surface:"Domains",protected:"74 assets",monitoring:"Steady state",enforcement:"Automated where eligible",source:"Synthetic platform state"},{surface:"Social",protected:"18 identities",monitoring:"Tuned",enforcement:"Automated where eligible",source:"Synthetic platform state"},{surface:"App stores",protected:"6 app identities",monitoring:"Pilot complete",enforcement:"Pilot only",source:"Synthetic platform state"}],
      adoption:[{metric:"Reviewed workflow coverage",current:"82%",target:"100%",class:"SYNTHETIC",source:"Synthetic workflow review",meaning:"Active workflows reviewed against customer goals"},{metric:"Unvalidated expansion hypotheses",current:"1",target:"0",class:"SYNTHETIC",source:"Synthetic account plan",meaning:"Adjacent ideas lacking customer problem + evidence criterion"}],
      risks:[{title:"Expansion outruns value evidence",severity:"Low",owner:"CSM",status:"Watch",next:"Review pilot against decision criterion",evidence:"Commercial motion intentionally paused",value:"success"}],
      themes:[{theme:"Cross-channel tuning",count:5,class:"SYNTHETIC",action:"Turn pilot checklist into reusable adoption playbook",destination:"Customer Success enablement",value:"think"}],
      meetings:[{title:"Adoption + workflow tuning review",audience:"CSM + TAM + Customer Fraud Ops",when:"This week",decision:"Continue, modify, or retire adjacent use-case pilot"}]
    },
    {
      id:"redwood",name:"Redwood SaaS",synthetic:true,industry:"SaaS",motion:"Direct Enterprise",stage:"Risk Recovery",health:"At Risk",progress:50,
      objective:"Separate protected-asset quality, configuration, integration, and product behavior before choosing the remediation path.",
      csm:"Taylor Brooks",tam:"Jordan Lee",partner:"N/A - Direct",nextDecision:"Complete configuration correction, then escalate only the reproducible product-behavior candidates.",
      successSignals:["Every open issue classified by layer","Customer sees one recovery owner","Product/Engineering receives only evidence-ready candidates"],
      journey:[["Reproduce symptoms","Done","Representative examples captured","trust"],["Asset-quality audit","Done","New imports reviewed","trust"],["Layer classification","Done","Data/config/integration/product split established","trust"],["Corrective work","Active","Configuration fixes underway","success"],["Product escalation","Next","Only reproducible candidates move","respect"],["Recovery acceptance","Next","Customer confirms outcome restored","success"]],
      handoffs:[{id:"h-r1",from:"CSM",to:"TAM",status:"Accepted",type:"Risk recovery",summary:"Customer-reported noise moved into structured layer diagnosis instead of immediate Product escalation.",evidence:"Synthetic issue sample",value:"trust"}],
      technical:[{item:"Asset import audit",owner:"TAM + Customer Security",status:"Done",evidence:"Synthetic asset QA"},{item:"Issue-layer classification",owner:"TAM",status:"Done",evidence:"Synthetic triage matrix"},{item:"Configuration correction",owner:"TAM",status:"Active",evidence:"Synthetic change log"},{item:"Product defect candidates",owner:"TAM + Product/Engineering",status:"Next",evidence:"Pending post-fix reproduction"}],
      threats:[{surface:"Domains",protected:"203 assets",monitoring:"Recovery tuning",enforcement:"Selective automation",source:"Synthetic platform state"}],
      adoption:[{metric:"Cases classified by layer",current:"90%",target:"100%",class:"SYNTHETIC",source:"Synthetic triage queue",meaning:"Issues assigned to source-data/config/integration/product layer"},{metric:"Asset review completeness",current:"81%",target:"100%",class:"SYNTHETIC",source:"Synthetic asset QA",meaning:"New assets reviewed against configuration criteria"}],
      risks:[{title:"Wrong-layer escalation",severity:"High",owner:"TAM",status:"Open",next:"Re-test after configuration correction",evidence:"Some reported behavior still lacks clean reproduction",value:"trust"}],
      themes:[{theme:"Asset import quality",count:6,class:"SYNTHETIC",action:"Add import QA guardrail and customer checklist",destination:"Product + Documentation",value:"think"}],
      meetings:[{title:"Risk recovery checkpoint",audience:"CSM + TAM + Customer Security",when:"Twice weekly",decision:"Confirm corrected layer and customer-facing recovery state"}]
    },
    {
      id:"keystone",name:"Keystone Health Network",synthetic:true,industry:"Healthcare",motion:"Direct Enterprise",stage:"Strategic Review",health:"Healthy",progress:100,
      objective:"Run a mature review from verified outcomes and technical commitments, then discover a next-phase use case without inventing expansion economics.",
      csm:"Taylor Brooks",tam:"Avery Chen",partner:"N/A - Direct",nextDecision:"Ask the customer to define a decision metric for the next-phase workflow before moving it into a commercial motion.",
      successSignals:["Success evidence current","Technical commitments closed","Next-phase discovery remains hypothesis until customer criterion exists"],
      journey:[["Commitment reconciliation","Done","Prior technical work closed","trust"],["Success evidence refresh","Done","Evidence sources current","trust"],["Risk review","Done","No critical open technical commitment","success"],["Next-phase question","Done","Discovery question documented without revenue claim","think"]],
      handoffs:[{id:"h-k1",from:"TAM",to:"CSM",status:"Accepted",type:"Strategic review",summary:"Technical evidence and closed commitments packaged for customer success review.",evidence:"Synthetic review brief",value:"success"}],
      technical:[{item:"Technical commitment register",owner:"TAM",status:"Done",evidence:"Synthetic action log"},{item:"Next-phase readiness notes",owner:"TAM",status:"Done",evidence:"Synthetic discovery record"}],
      threats:[{surface:"Domains",protected:"64 assets",monitoring:"Steady state",enforcement:"Steady state",source:"Synthetic platform state"},{surface:"Dark web",protected:"Credential/brand keywords",monitoring:"Discovery candidate",enforcement:"Not applicable",source:"Synthetic discovery hypothesis"}],
      adoption:[{metric:"Success-criteria evidence coverage",current:"94%",target:"100%",class:"SYNTHETIC",source:"Synthetic success plan",meaning:"Agreed criteria with current evidence source + owner"},{metric:"Open technical commitments",current:"0",target:"0",class:"SYNTHETIC",source:"Synthetic action register",meaning:"Open technical commitments before review"}],
      risks:[{title:"Premature next-phase commercial narrative",severity:"Low",owner:"CSM",status:"Controlled",next:"Keep use case in discovery until customer criterion exists",evidence:"No revenue or ROI claim attached",value:"success"}],
      themes:[{theme:"Strategic review evidence hygiene",count:3,class:"SYNTHETIC",action:"Standardize source-ready review packet",destination:"CSM/TAM enablement",value:"think"}],
      meetings:[{title:"Strategic account review",audience:"CSM + TAM + Customer Security Director",when:"Quarterly",decision:"Validate current value and define next discovery question"}]
    }
  ],
  training:{
    csm:{title:"CSM Track",goal:"Own the customer outcome, executive relationship, adoption path, commercial context, and shared risk picture without duplicating technical ownership.",modules:[
      ["1. Start with outcome","Write the customer-defined outcome before discussing product features.","customer-success"],
      ["2. Share one context","Keep success plan, stakeholder, risk, commitment, and next decision visible to TAM.","trust"],
      ["3. Pull TAM early","Bring TAM into configuration, integration, troubleshooting, technical enablement, and deeper product adoption before customer friction compounds.","mutual-respect"],
      ["4. Expand from evidence","Move an adjacent use case toward commercial discussion only after a customer problem and evidence criterion exist.","customer-success"],
      ["5. Close the loop","After every review publish decisions, owners, dates, and source-backed outcomes.","trust"]
    ]},
    tam:{title:"TAM Track",goal:"Be the product-depth owner who can operate across partner boundaries and direct enterprise accounts while turning repeated work into scale.",modules:[
      ["1. Classify before acting","Account/commercial -> baseline break-fix -> purchased services -> product-depth gap -> Product/Engineering.","trust"],
      ["2. Troubleshoot with evidence","Expected vs actual, impact, auth/config/data flow, logs/correlation IDs, minimal reproduction, specific owner ask.","trust"],
      ["3. Keep the customer owned","Never end with 'not our scope'; give the supported next path and preserve context.","mutual-respect"],
      ["4. Tune for outcome","Protected assets, integrations, automation, and monitoring configuration should map to the customer's risk profile and workflow.","customer-success"],
      ["5. Make yourself scalable","Tag recurring friction and turn it into docs, training, automation, packaging, pricing, or Product input.","think-big"]
    ]},
    partner:{title:"Partner Track",goal:"Use the service catalog and shared handoff contract so customers reach the right owner once, with context intact.",modules:[
      ["1. Identify the lane","Separate account/billing/user-management, baseline break-fix, paid integration, managed/pro services, and vendor product-depth needs.","trust"],
      ["2. Preserve evidence","Carry impact, entitlement, what has been tried, logs/examples, and customer expectation with the transfer.","mutual-respect"],
      ["3. Accept the handoff","Receiving team acknowledges ownership or names the exact missing prerequisite; no silent bouncing.","mutual-respect"],
      ["4. Feed recurring pain","Repeated boundary failures become shared themes, not isolated tickets.","think-big"],
      ["5. Measure customer experience","Success is the customer's path to an answer, not which internal team closed the ticket.","customer-success"]
    ]}
  },
  walkthrough:[
    {title:"1 / One customer state",body:"Start at Command Center. CSM, TAM, and Partner see the same account, motion, lifecycle, objective, owner map, next decision, and source boundary."},
    {title:"2 / Change the lens",body:"Use Team Lens to switch CSM, TAM, or Partner. The track selector narrows to the work that team owns without fragmenting the underlying customer record."},
    {title:"3 / Journey before queue",body:"Customer Journey shows why the work exists, what changed, and what decision comes next. A ticket is context inside the journey, not the journey itself."},
    {title:"4 / Explicit handoff contract",body:"Handoffs carry from/to owner, issue type, summary, evidence, status, and value principle. Accepting a handoff changes local state and keeps the transfer auditable."},
    {title:"5 / Technical depth",body:"TAM view connects integrations, troubleshooting, protected assets, monitoring, takedown state, and escalation evidence instead of making the CSM coordinate technical specialists."},
    {title:"6 / Recurring friction becomes scale",body:"Themes aggregate repeated issues and route them toward documentation, training, automation, packaging, pricing, or Product instead of creating a heroic human queue."},
    {title:"7 / Training uses the operating system",body:"New CSMs, TAMs, and Partner teams learn from the same ownership model and synthetic journeys they will use in the workspace."},
    {title:"8 / Evidence stays explicit",body:"Every synthetic KPI is labeled synthetic. Internal build-efficiency proof is separated from customer outcomes and financial-savings claims."}
  ]
};
