from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

OUT = Path("public/summertime-crmdemo")
OUT.mkdir(parents=True, exist_ok=True)
GUIDE = OUT / "csm-guide.pdf"
BRIEF = OUT / "meeting-brief.pdf"

BG=colors.HexColor("#F3F6F4"); INK=colors.HexColor("#10171A"); MUTED=colors.HexColor("#66757B")
DARK=colors.HexColor("#080B0F"); PANEL=colors.white; LINE=colors.HexColor("#D9E1DD")
LIME=colors.HexColor("#C8FF3D"); MINT=colors.HexColor("#49E5B3"); CYAN=colors.HexColor("#4AC7FF"); VIOLET=colors.HexColor("#8E7CFF")

ss=getSampleStyleSheet()
for name, kw in {
    "K":dict(fontName="Helvetica-Bold",fontSize=7.4,leading=9,textColor=MUTED,spaceAfter=7),
    "Hero":dict(fontName="Helvetica-Bold",fontSize=26,leading=28,textColor=INK,spaceAfter=8),
    "Deck":dict(fontName="Helvetica",fontSize=10.2,leading=14.4,textColor=MUTED,spaceAfter=12),
    "H1x":dict(fontName="Helvetica-Bold",fontSize=18,leading=21,textColor=INK,spaceAfter=8),
    "H2x":dict(fontName="Helvetica-Bold",fontSize=11.2,leading=13.5,textColor=INK,spaceBefore=5,spaceAfter=5),
    "Body":dict(fontName="Helvetica",fontSize=8.5,leading=12.2,textColor=INK,spaceAfter=6),
    "Small":dict(fontName="Helvetica",fontSize=7.0,leading=9.4,textColor=MUTED),
    "Cell":dict(fontName="Helvetica",fontSize=7.2,leading=9.2,textColor=INK),
    "CellB":dict(fontName="Helvetica-Bold",fontSize=7.2,leading=9.2,textColor=INK),
    "CellWB":dict(fontName="Helvetica-Bold",fontSize=7.2,leading=9.2,textColor=colors.white),
}.items():
    ss.add(ParagraphStyle(name=name, **kw))
P=lambda t,s="Cell": Paragraph(t,ss[s])

def tbl(rows,widths):
    t=Table(rows,colWidths=widths,repeatRows=1,hAlign="LEFT")
    t.setStyle(TableStyle([
        ("GRID",(0,0),(-1,-1),.45,LINE),("VALIGN",(0,0),(-1,-1),"TOP"),
        ("BACKGROUND",(0,0),(-1,0),DARK),("TEXTCOLOR",(0,0),(-1,0),colors.white),
        ("BACKGROUND",(0,1),(-1,-1),PANEL),
        ("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),
        ("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6),
    ]))
    return t

def page(canvas,doc):
    w,h=letter; canvas.saveState(); canvas.setFillColor(BG); canvas.rect(0,0,w,h,fill=1,stroke=0)
    x=0
    for frac,c in [(.28,LIME),(.22,MINT),(.18,CYAN),(.32,VIOLET)]:
        canvas.setFillColor(c); canvas.rect(x,h-6,w*frac,6,fill=1,stroke=0); x+=w*frac
    canvas.setFillColor(MUTED); canvas.setFont("Helvetica",7)
    canvas.drawString(.58*inch,.33*inch,"Private Customer Success Demo - Synthetic data - Independent concept")
    canvas.drawRightString(w-.58*inch,.33*inch,f"Page {doc.page} / 10")
    canvas.restoreState()

pages=[]
pages.append([
    Paragraph("CUSTOMER SUCCESS OPERATING SYSTEM",ss["K"]),Paragraph("CSM Field Guide",ss["Hero"]),
    Paragraph("DTEX-focused account operating model for portfolio health, customer outcomes, stakeholder alignment, technical context, meeting preparation, renewal readiness, and consistent follow-through.",ss["Deck"]),
    tbl([[P("Layer","CellWB"),P("What the demo brings together","CellWB")],
         [P("Portfolio","CellB"),P("20 synthetic named accounts with ARR, health, renewal timing, adoption, technical coverage, stakeholder strength, value evidence, and threshold flags.")],
         [P("Account","CellB"),P("Contract dates, stakeholders, success plan, technical lifecycle, support/i3 context, meetings, notes, commercial records, and working-state controls.")],
         [P("Meetings","CellB"),P("A concise brief assembled from account metrics, stakeholder records, success-plan progress, recent meetings, and CSM notes.")],
         [P("Playbooks","CellB"),P("Consistent review checklists for executive alignment, coverage, adoption, renewal, AI risk, privacy, integrations, and i3 requests.")]],[1.15*inch,5.25*inch]),
    Spacer(1,.12*inch),Paragraph("Operating principle",ss["H2x"]),
    Paragraph("<b>STRUCTURED ACCOUNT CONTEXT -> CUSTOMER REVIEW -> OWNERSHIP -> FOLLOW-THROUGH -> MEASURABLE OUTCOME.</b> The system is designed to make the information a CSM needs easy to inspect, update, and carry into the next customer interaction.",ss["Body"])
])
pages.append([
    Paragraph("01 - POST-SALES ROLE MODEL",ss["K"]),Paragraph("Keep ownership clear across the account team",ss["H1x"]),
    Paragraph("The account workspace reflects the cross-functional nature of an enterprise cybersecurity relationship. Customer Success coordinates the customer operating rhythm while the correct technical, service, product, and commercial owners remain visible.",ss["Deck"]),
    tbl([[P("Role","CellWB"),P("Primary contribution","CellWB"),P("What the CSM keeps visible","CellWB")],
         [P("Customer Success","CellB"),P("Account strategy, adoption, value realization, executive alignment, EBRs, renewal risk, customer advocacy."),P("Outcome, stakeholder map, risks, commitments, evidence, next customer moment.")],
         [P("Technical Success","CellB"),P("Onboarding architecture, environment stability, integrations, tuning, upgrades, optimization."),P("Coverage, integration health, milestones, technical blockers, owner, target date.")],
         [P("i3 Services","CellB"),P("Investigation/intelligence services and insider-risk expertise where contracted."),P("Request scope, status, historical-data need, customer decision, follow-up.")],
         [P("Support / Engineering / Product","CellB"),P("Issue resolution, defects, root cause, technical escalation, product feedback."),P("Severity, impact, workaround, case state, communication cadence.")],
         [P("Sales / AE","CellB"),P("Commercial strategy, pricing, expansion, and closure."),P("Customer need, maturity, value evidence, timing, procurement milestones.")]], [1.2*inch,2.55*inch,2.65*inch]),
    Spacer(1,.12*inch),Paragraph("Design rule",ss["H2x"]),Paragraph("Every account action should make the accountable owner and completion evidence visible. That keeps the customer story coherent while preserving the right internal handoffs.",ss["Body"])
])
pages.append([
    Paragraph("02 - PORTFOLIO COMMAND CENTER",ss["K"]),Paragraph("Make portfolio health explainable",ss["H1x"]),
    Paragraph("The command center combines the measurements that determine where attention is needed: managed ARR, health, renewal windows, technical coverage, adoption, value evidence, stakeholder strength, support confidence, and commercial readiness.",ss["Deck"]),
    tbl([[P("Health component","CellWB"),P("Weight","CellWB"),P("Meaning","CellWB")],
         [P("Adoption / workflow depth","CellB"),P("25%"),P("Completion and use of the agreed customer workflow.")],
         [P("Outcome evidence","CellB"),P("25%"),P("Documented evidence against the customer outcome or success criteria.")],
         [P("Stakeholder strength","CellB"),P("20%"),P("Coverage and engagement of sponsor, champion, technical owner, and commercial path.")],
         [P("Technical coverage / stability","CellB"),P("15%"),P("Coverage and readiness supporting trusted account operations.")],
         [P("Support confidence","CellB"),P("10%"),P("Structured view of the current support state and customer confidence.")],
         [P("Commercial readiness","CellB"),P("5%"),P("Known timing and readiness across renewal and procurement milestones.")]], [2.0*inch,.75*inch,3.65*inch]),
    Spacer(1,.1*inch),Paragraph("Formula",ss["H2x"]),Paragraph("<b>Health = round(adoption x .25 + value x .25 + stakeholder x .20 + coverage x .15 + support x .10 + commercial x .05)</b>",ss["Body"]),
    Paragraph("Status bands",ss["H2x"]),Paragraph("<b>At risk:</b> below 70.  <b>Watch:</b> 70-81.  <b>Healthy:</b> 82 or higher.",ss["Body"])
])
pages.append([
    Paragraph("03 - ACCOUNT WORKSPACE",ss["K"]),Paragraph("One place for the account context a CSM actually uses",ss["H1x"]),
    Paragraph("Each account opens into a detailed workspace so the CSM can move from portfolio view to working context without losing the customer story.",ss["Deck"]),
    tbl([[P("Section","CellWB"),P("Contents","CellWB")],
         [P("Contract & metrics","CellB"),P("ARR, contract start/end, lifecycle, primary outcome, six health inputs, health score, threshold flags.")],
         [P("Employees / stakeholders","CellB"),P("Executive sponsor, program champion, technical owner, procurement plus user-added stakeholder records.")],
         [P("Success plan","CellB"),P("Objective, progress %, owner, proof definition, and open working records.")],
         [P("Technical lifecycle","CellB"),P("Technical Success owner, coverage, integrations, active modules, support severity, i3 request state.")],
         [P("Meeting log","CellB"),P("Dated meeting title/type, attendees, and meeting notes.")],
         [P("Account notes","CellB"),P("Timestamped CSM notes, decisions, commitments, observations, and follow-up context.")],
         [P("Commercial record","CellB"),P("Renewal days, ARR, Account Executive reference, and commercial-readiness metric.")]], [1.75*inch,4.65*inch]),
    Spacer(1,.1*inch),Paragraph("Working-state controls",ss["H2x"]),Paragraph("The demo supports adding an account, adding a stakeholder, logging a meeting, and adding account notes. Records persist in browser storage for the prototype and immediately update the account workspace.",ss["Body"])
])
pages.append([
    Paragraph("04 - ONBOARDING & TIME TO VALUE",ss["K"]),Paragraph("Translate deployment progress into customer milestones",ss["H1x"]),
    Paragraph("The onboarding model combines technical readiness with program ownership, stakeholder alignment, adoption milestones, and value evidence.",ss["Deck"]),
    tbl([[P("Window","CellWB"),P("Customer milestone","CellWB"),P("Evidence in the account record","CellWB")],
         [P("Day 0-2","CellB"),P("Kickoff, roles, outcomes, governance, architecture, initial deployment."),P("Success criteria, stakeholder map, technical plan, initial milestones.")],
         [P("~24 hours","CellB"),P("Initial visibility benchmark."),P("Coverage baseline, gaps, data quality, technical owner.")],
         [P("Week 1","CellB"),P("First useful reporting / customer review."),P("Initial evidence, interpretation, next workflow milestone.")],
         [P("Days 7-21","CellB"),P("Operationalize priority use cases and integrations."),P("Workflow owners, acceptance status, enablement, support route.")],
         [P("Days 30-60","CellB"),P("Repeatable program motion."),P("Adoption %, governance status, success-plan progress, i3 usage where applicable.")],
         [P("Days 60-90","CellB"),P("Executive evidence and next-quarter plan."),P("EBR-ready metrics, open thresholds, renewal evidence, next milestones.")]], [1.05*inch,2.65*inch,2.7*inch]),
    Spacer(1,.1*inch),Paragraph("CSM lens",ss["H2x"]),Paragraph("Technical visibility becomes Customer Success when the customer can repeatedly use the platform and services to make better security decisions and demonstrate progress to stakeholders.",ss["Body"])
])
pages.append([
    Paragraph("05 - ADOPTION & VALUE",ss["K"]),Paragraph("Connect capability use to measurable customer outcomes",ss["H1x"]),
    Paragraph("The DTEX-oriented fields map the platform into account motions a CSM can review with customers and internal partners.",ss["Deck"]),
    tbl([[P("Capability / motion","CellWB"),P("Operational evidence","CellWB"),P("Customer outcome evidence","CellWB")],
         [P("Insider Risk Management","CellB"),P("Risk-review workflow, stakeholder ownership, investigation process, adoption %."),P("Earlier visibility, stronger context, program maturity, fewer blind spots.")],
         [P("Risk-Adaptive DLP","CellB"),P("Coverage, active policies/workflows, adoption %, measured noise where available."),P("More precise intervention and protection of critical data.")],
         [P("AI Risk Management","CellB"),P("AI/agent inventory, visibility coverage, policy ownership, governance milestones."),P("Safer AI adoption and stronger oversight of human and AI activity.")],
         [P("Behavioral intelligence","CellB"),P("Coverage and stable telemetry across relevant endpoints/servers."),P("Trusted risk context and stronger investigation evidence.")],
         [P("Privacy / pseudonymization","CellB"),P("Approval state, controls, access roles, regional requirements."),P("A sustainable program aligned to customer governance.")],
         [P("Integrations","CellB"),P("Integration inventory, acceptance status, validation date, event-flow metrics."),P("Faster response and stronger operating leverage across the security stack.")]], [1.55*inch,2.55*inch,2.3*inch]),
    Spacer(1,.1*inch),Paragraph("Value evidence",ss["H2x"]),Paragraph("Public studies can help define what to measure; the account workspace keeps the customer-specific baseline, current value, measurement period, and source visible for the actual relationship.",ss["Body"])
])
pages.append([
    Paragraph("06 - MEETINGS & EBRs",ss["K"]),Paragraph("Bring the account story into every customer conversation",ss["H1x"]),
    Paragraph("The meeting-prep view assembles current metrics and working records into a concise brief that a CSM can review before an EBR, adoption meeting, renewal checkpoint, or technical review.",ss["Deck"]),
    tbl([[P("Brief section","CellWB"),P("Source in the workspace","CellWB")],
         [P("Health / renewal / coverage / value","CellB"),P("Current calculated or stored account values.")],
         [P("Threshold status","CellB"),P("Published account thresholds and exact breached values.")],
         [P("Stakeholders","CellB"),P("Base stakeholder map plus user-added stakeholder records.")],
         [P("Success-plan progress","CellB"),P("Objectives, progress percentages, owners, and proof definitions.")],
         [P("Meeting history","CellB"),P("Base and user-added meeting logs.")],
         [P("Account notes","CellB"),P("Recent CSM notes and commitments.")]], [2.15*inch,4.25*inch]),
    Spacer(1,.12*inch),Paragraph("EBR storyline",ss["H2x"]),Paragraph("<b>WHY WE STARTED -> WHAT CHANGED -> WHAT IMPROVED -> WHAT IS OPEN -> WHAT WE DECIDE NEXT.</b> The workspace gives the CSM the evidence needed to build that story quickly.",ss["Body"])
])
pages.append([
    Paragraph("07 - SUPPORT, TECHNICAL SUCCESS & i3",ss["K"]),Paragraph("Keep service context connected to customer impact",ss["H1x"]),
    Paragraph("Support and service context stay in the same account workspace as adoption, stakeholders, value, and renewal timing so the CSM has one operating picture.",ss["Deck"]),
    tbl([[P("Severity","CellWB"),P("Published target response","CellWB"),P("Published target resolution","CellWB"),P("Account record use","CellWB")],
         [P("Sev 1","CellB"),P("Within 2 business hours"),P("Within 5 business days"),P("Case state, impact, owner, communication cadence.")],
         [P("Sev 2","CellB"),P("Within 4 business hours"),P("Within 10 business days"),P("Case state, workaround, adoption impact, timeline.")],
         [P("Sev 3","CellB"),P("Within 1 business day"),P("Within 20 business days"),P("Issue status and customer expectation record.")],
         [P("Sev 4","CellB"),P("Within 5 business days"),P("Within 30 business days"),P("Tracked request and closure record.")]], [.85*inch,1.55*inch,1.6*inch,2.4*inch]),
    Spacer(1,.1*inch),Paragraph("i3 requests",ss["H2x"]),Paragraph("For contracted i3 Services, the workspace can capture request type, date, status, service owner, historical-data context, and the customer program outcome connected to the request.",ss["Body"])
])
pages.append([
    Paragraph("08 - RENEWAL & COMMERCIAL READINESS",ss["K"]),Paragraph("Make renewal evidence visible before the commercial conversation",ss["H1x"]),
    Paragraph("The renewal board surfaces timing together with the measurements that explain the state of the relationship.",ss["Deck"]),
    tbl([[P("Renewal field","CellWB"),P("What it contributes","CellWB")],
         [P("Days remaining","CellB"),P("Exact timing and the <=90-day portfolio threshold.")],
         [P("ARR","CellB"),P("Stored synthetic contract value for portfolio context.")],
         [P("Health","CellB"),P("Weighted view across six disclosed Customer Success dimensions.")],
         [P("Value evidence","CellB"),P("Current evidence against customer outcomes.")],
         [P("Stakeholder strength","CellB"),P("Coverage and engagement of the decision network.")],
         [P("Commercial readiness","CellB"),P("Known renewal/procurement readiness and timing.")]], [2.0*inch,4.4*inch]),
    Spacer(1,.1*inch),Paragraph("Playbook library",ss["H2x"]),Paragraph("Static review checklists provide a repeatable starting point for sponsor alignment, coverage recovery, adoption, renewal, AI risk, Risk-Adaptive DLP, critical escalation, i3 requests, leavers/joiners, EBR evidence, privacy, and integrations.",ss["Body"])
])
pages.append([
    Paragraph("09 - DEMO PATH & ROADMAP",ss["K"]),Paragraph("Use the system to show how the account is operated",ss["H1x"]),
    Paragraph("The prototype demonstrates the operating model behind strong Customer Success: measurable account context, clear ownership, durable working records, and fast meeting preparation.",ss["Deck"]),
    Paragraph("60-second path",ss["H2x"]),Paragraph("<b>1.</b> Open the Command Center and show portfolio health plus threshold flags. <b>2.</b> Open an account and show the six health inputs, contract timing, stakeholder map, and success plan. <b>3.</b> Add an account note, meeting log, or stakeholder. <b>4.</b> Build the meeting brief. <b>5.</b> Open the renewal board and playbook library to show how the same account context supports recurring CSM motions.",ss["Body"]),
    Paragraph("Roadmap",ss["H2x"]),Paragraph("A future iteration could layer <b>AI-assisted suggestions</b> on top of this structured account foundation - for example, meeting-prep prompts, risk summaries, or suggested follow-up questions - with CSM review before anything becomes customer-facing.",ss["Body"]),
    Paragraph("Quality controls",ss["H2x"]),
    tbl([[P("Control","CellWB"),P("Purpose","CellWB")],
         [P("20 synthetic accounts","CellB"),P("Enough variation to demonstrate portfolio logic and account drill-downs.")],
         [P("Named synthetic stakeholders","CellB"),P("Demonstrates multi-threading and stakeholder administration.")],
         [P("Explainable health","CellB"),P("Keeps the score transparent and reproducible.")],
         [P("Persistent notes / meetings / stakeholders","CellB"),P("Shows working-state continuity for the prototype.")],
         [P("Light / dark themes","CellB"),P("Supports a polished presentation with persistent user preference.")],
         [P("Neutral password gate","CellB"),P("Keeps company-specific content behind the private demo entry point.")]], [2.0*inch,4.4*inch]),
    Spacer(1,.1*inch),Paragraph("Independent concept. Not official DTEX collateral. Public product and support information is contextual reference; all account, stakeholder, commercial, usage, and activity data in the demo is synthetic.",ss["Small"])
])

story=[]
for i,p in enumerate(pages):
    story += p
    if i < len(pages)-1: story.append(PageBreak())
SimpleDocTemplate(str(GUIDE),pagesize=letter,leftMargin=.58*inch,rightMargin=.58*inch,topMargin=.62*inch,bottomMargin=.58*inch).build(story,onFirstPage=page,onLaterPages=page)

def brief_page(canvas,doc):
    w,h=letter; canvas.saveState(); canvas.setFillColor(BG); canvas.rect(0,0,w,h,fill=1,stroke=0)
    x=0
    for frac,c in [(.35,LIME),(.25,MINT),(.40,CYAN)]:
        canvas.setFillColor(c); canvas.rect(x,h-7,w*frac,7,fill=1,stroke=0); x+=w*frac
    canvas.setFillColor(MUTED); canvas.setFont("Helvetica",7)
    canvas.drawString(.56*inch,.32*inch,"Synthetic account meeting brief - Independent concept")
    canvas.restoreState()

metric_data=[[P("Health","CellWB"),P("61 / 100","CellB"),P("Renewal","CellWB"),P("76 days","CellB"),P("Coverage","CellWB"),P("56%","CellB"),P("Value","CellWB"),P("58%","CellB")]]
mt=Table(metric_data,colWidths=[.65*inch,.8*inch,.65*inch,.8*inch,.65*inch,.75*inch,.55*inch,.75*inch])
mt.setStyle(TableStyle([("GRID",(0,0),(-1,-1),.45,LINE),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("BACKGROUND",(0,0),(0,0),DARK),("BACKGROUND",(2,0),(2,0),DARK),("BACKGROUND",(4,0),(4,0),DARK),("BACKGROUND",(6,0),(6,0),DARK),("BACKGROUND",(1,0),(1,0),PANEL),("BACKGROUND",(3,0),(3,0),PANEL),("BACKGROUND",(5,0),(5,0),PANEL),("BACKGROUND",(7,0),(7,0),PANEL),("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),("TOPPADDING",(0,0),(-1,-1),7),("BOTTOMPADDING",(0,0),(-1,-1),7)]))
stake=tbl([[P("Name","CellWB"),P("Role","CellWB"),P("Status","CellWB"),P("Responsibility lane","CellWB")],[P("Jordan Chen","CellB"),P("Executive Sponsor - CISO / Security VP"),P("Active"),P("Executive sponsorship")],[P("Priya Brooks","CellB"),P("Program Champion - Insider Risk Lead"),P("Active"),P("Program ownership")],[P("Taylor Lee","CellB"),P("Technical Owner - Security Engineering"),P("Active"),P("Technical lifecycle")]],[1.35*inch,2.35*inch,.8*inch,1.9*inch])
bstory=[Paragraph("MEETING PREP - SYNTHETIC ACCOUNT",ss["K"]),Paragraph("Northwind Financial",ss["Hero"]),Paragraph("Strategic financial-services account - customer review brief",ss["Deck"]),mt,Spacer(1,.12*inch),Paragraph("Current threshold status",ss["H2x"]),Paragraph("Health <70; Coverage <70%; Adoption <70%; Value <70%; Stakeholder <70%; Commercial <70%; Renewal <=90d.",ss["Body"]),Paragraph("Stakeholder map",ss["H2x"]),stake,Spacer(1,.1*inch),Paragraph("Success-plan progress",ss["H2x"]),Paragraph("Operationalize Risk-Adaptive DLP: 57% complete. Maintain trusted behavioral visibility: 56% complete. Maintain executive outcome evidence: 58% complete.",ss["Body"]),Paragraph("Recent meeting record",ss["H2x"]),Paragraph("Adoption Review - CSM, champion, technical owner. Reviewed adoption, technical coverage, success-plan progress, and open account records.",ss["Body"]),Paragraph("Account notes",ss["H2x"]),Paragraph("User-entered CSM notes, customer commitments, and meeting follow-up records appear here when added to the account workspace.",ss["Body"]),Paragraph("Future enhancement",ss["H2x"]),Paragraph("AI-assisted meeting suggestions could be layered onto this structured account context in a future iteration, with CSM review before use.",ss["Body"])]
SimpleDocTemplate(str(BRIEF),pagesize=letter,leftMargin=.56*inch,rightMargin=.56*inch,topMargin=.60*inch,bottomMargin=.55*inch).build(bstory,onFirstPage=brief_page)

for p in (GUIDE, BRIEF):
    payload=p.read_bytes()
    if not payload.startswith(b"%PDF-") or len(payload)<1500 or b"%%EOF" not in payload[-2048:]:
        raise SystemExit(f"Generated invalid PDF: {p}")
    print(f"Generated {p} ({len(payload)} bytes)")
