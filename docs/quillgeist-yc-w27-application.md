# Quillgeist — Y Combinator Winter 2027 Application Draft

Status: working draft aligned to the implemented MVP.  Do not invent traction.  Replace bracketed fields only with verified values before submission.

## Company

**Company name:** Quillgeist

**Company URL:** https://quillgeist.clintware.com/

**Describe what your company does in 50 characters or less:**

User-owned runtime and memory for AI agents.

## What is your company going to make?

Quillgeist is a user-owned local runtime that sits between AI agents and a person's computer.  A supported AI can send Quillgeist a task; Quillgeist applies the user's local permissions and explicit saved preferences, executes eligible work locally, verifies what actually happened, and returns compact evidence instead of a giant execution transcript.

The long-term goal is for a user's operating context, permissions, preferences, and successful workflows to belong to the user rather than being trapped inside one AI provider.

## How far along are you?

I have a working public alpha.

Quillgeist has packaged Windows, macOS, and Linux local nodes.  It can pair a machine with the cloud service and perform approved filesystem, shell, Python, PowerShell, Node.js, Git, testing, and scheduled work.  It includes capability policies, workspace restrictions, local sensitive-data checks, snapshots and rollback, execution logging, Definition-of-Done evidence, and context compaction.

The current MVP also persists explicit user-approved preferences locally and injects them into future compiled instructions independently of the connected model.  For example, a user can tell Quillgeist `remember: Keep the original file and create a copy`, switch AI providers, and have that rule remain part of the user's local operating context.

The broader adaptive-learning layer is earlier.  The next proof is whether relevant user-owned context measurably improves repeated work across providers without creating bloated prompts or reducing user control.

**Active external users:** [VERIFIED NUMBER]

**Paying users:** [VERIFIED NUMBER]

**Revenue:** [VERIFIED MRR OR $0]

## How long have you been working on this, and how much has been full-time?

I started Quillgeist from an earlier local execution project called AgentBridge and iterated it into the current product during 2026.  I have been building it alongside my job search and Clintware work rather than as a full-time funded startup.

The product progressed from execution packs and a local node into packaged desktop builds, cloud pairing, local policy controls, verification, telemetry, context management, automatic prompt planning, and persistent user-owned preferences.

## Why did you pick this idea?

I am an extreme user of AI systems.

I kept running into the same failure pattern while using AI to build real projects: I would explain the same constraints repeatedly, long tasks would lose earlier requirements, models would waste context supervising deterministic work, and I still had to manually check whether “done” actually meant done.

Switching models made it worse because the useful operating knowledge I had taught one system did not follow me to another.

I originally built the local execution layer for myself.  The more I used it, the clearer the larger problem became: the user's context and operating rules should not belong to a particular model.

## Do you have domain expertise?

I have spent more than 20 years working across IT, cybersecurity, technical support, and Customer Success.  Much of my career has involved translating what a customer actually needs into technical action, managing risk and permissions, coordinating complex work across teams, and deciding whether something is actually complete.

I also build and operate my own AI-assisted software.  Quillgeist came directly from using these systems heavily enough to encounter the same problems repeatedly.

## Who writes code or does technical work?

I am the sole founder and build the product myself using AI coding systems as development tools.

I define the architecture, product behavior, specifications, permissions model, acceptance criteria, and tests; review and modify generated changes; diagnose failures; run regression tests; and ship releases.  No human contractor or outside development team owns or writes the product for me.

## Who are your competitors?

The closest competitors include Open Interpreter and the execution environments built into products such as Claude Code, Codex, and other desktop or coding agents.

They are increasingly good at giving a particular AI access to a computer.

I think the missing layer is one that belongs to the user instead of to the AI provider.  Quillgeist is intended to persist the user's permissions, operating context, explicit preferences, execution history, and verified workflows across models.  The model can be replaced without replacing the user's operating layer.

## What do you understand that competitors don't?

Model intelligence is improving faster than continuity between models.

The bottleneck is increasingly not whether an AI can reason about a task.  It is whether it understands enough of the user's intent to act correctly, has the right local permissions, knows what should stay private, can prove what it actually did, and carries forward the useful user-approved rules next time.

Every model vendor has an incentive to make its own agent better.  The user needs an incentive-aligned layer that remains theirs when the model changes.

## What's new about what you're making?

Quillgeist separates the model from the user's execution state.

Instead of making one more agent with its own isolated memory and tool system, it provides a persistent local layer that multiple agents can use.  That layer can enforce permissions, keep sensitive work local, execute deterministic steps, verify completion, compact results, and retain explicit user-approved preferences independently of whichever AI model handled the reasoning.

## How do or will you make money?

Quillgeist will be subscription software.

The initial paid product would be a Pro plan for individuals who use multiple AI agents heavily, followed by Team plans with shared policies, workflow libraries, and administrative controls.

A likely starting structure is roughly $20–30/month for individual Pro users and $50–100/user/month for teams, with enterprise pricing for centralized policy, audit, deployment, and reporting.

The local runtime can remain useful without a paid cloud dependency.  Paid value comes from synchronization, managed routing, team controls, analytics, shared workflows, and enterprise management.

## How will users find you?

Initially I am targeting developers, technical operators, and heavy AI users who already move between multiple AI models and local tools.

The public alpha, GitHub releases, transparent technical documentation, and demonstrable local execution and context savings give me a product-led way to reach these users.  I will also recruit early users directly from AI/developer communities and from my professional network in cybersecurity and technical operations.

The early goal is not broad paid acquisition.  It is finding users who experience the problem frequently enough to give high-quality product feedback and use Quillgeist repeatedly.

## Why will this be a big company?

The number of capable AI agents is increasing quickly, and users will increasingly use more than one.

If each provider owns the user's context, permissions, and execution history, people and companies end up rebuilding their operating context repeatedly.

Quillgeist can become the persistent user-owned layer beneath those agents: the place where intent, permissions, memory, execution, verification, and feedback live regardless of which model is currently best.

Individual AI models can change quickly.  The user's accumulated operating context becomes more valuable over time.

## Where do you live now, and where would the company be based after YC?

College Station, Texas / San Francisco during YC.

I am willing to spend the batch in San Francisco and make location decisions based on what gives the company the strongest chance of succeeding.

## Most impressive thing you have accomplished other than this startup

I built a career across IT, cybersecurity, technical support, and Customer Success in roles that required me to bridge technical systems and customer outcomes.  I have managed multi-million-dollar customer portfolios and built operational processes that improved renewals, adoption, escalation handling, and visibility while working across technical and executive stakeholders.

More recently I have used AI-assisted development to turn recurring problems into working software rather than stopping at concepts.

## Other ideas you considered applying with

**Career OS / LandThePlane:** An AI career system that maintains a person's verified professional history from opportunity discovery through interviews, hiring, and success in the job.

**Personal Primer:** A user-controlled AI that learns both what a person knows and what they are trying to understand about themselves, combining longitudinal personal context with adaptive research, reflection, and learning.

I chose Quillgeist because I have already built substantially more of the underlying product and because the same persistent-context problem appears underneath the other ideas.

# Founder video bullets

- I'm Clinton Kosh, the solo founder of Quillgeist.
- I have spent more than 20 years around IT, cybersecurity, technical support, and Customer Success.
- I use AI heavily to build real software.
- I got tired of teaching every model the same operating context and then manually checking whether its work was actually done.
- So I built Quillgeist.
- It is a user-owned local runtime that lets AI do approved work on your computer, verifies the result, and keeps explicit preferences outside any one model provider.
- The alpha is running.  Now I am focused on proving that persistent user-owned context makes repeated work materially better across models.

# Product demo sequence

1. Open the installed Quillgeist desktop app.
2. Give it one ordinary task and show local policy plus verified execution.
3. Enter: `remember: Keep the original file and create a copy`.
4. Show the preference stored locally in Quillgeist.
5. Change the connected AI/model provider.
6. Give a related task without repeating the rule.
7. Show the compiled instruction containing the saved user-owned preference.
8. Execute and show changed-file / Definition-of-Done evidence.
9. Show Contextor's compact result rather than the full execution trace.
10. End with: **The model changed.  The user's operating context didn't.**

# Before submitting

- Replace every bracketed traction field with verified data only.
- Record a one-minute founder video separately from the product demo.
- Recruit repeat external alpha users and report only actual usage.
- Verify the live Windows installer contains the persistent preference feature.
- Keep Quillgeist as the single primary YC company story.
