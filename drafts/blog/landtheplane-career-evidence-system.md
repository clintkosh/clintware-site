# LandThePlane: From Interview Prep to a Career Evidence System

*How a job-search tool became a record of what you can prove, what you are learning, and what changes over time.*

**Draft · October 2, 2026**

LandThePlane did not start as an idea for another AI resume writer.  It started with a simpler problem: I was learning things in every application and every interview, but too much of that learning disappeared before the next one.

A job search creates a surprising amount of useful evidence.  You learn which parts of your experience people understand immediately, which answers need more context, which metrics actually land, which stories are too long, which requirements keep showing up, and where the gap is not capability at all.  Sometimes the gap is evidence.  Sometimes it is interpretation.  Sometimes the answer is accurate, but the useful point arrives 45 seconds too late.

Most job-search software treats each application as a new transaction.  I wanted the opposite.  I wanted the evidence to compound.

That became LandThePlane.

## 01 / The First Wedge: Retrieve Better Under Pressure

The earliest version was interview preparation.

I already had the experience.  The hard part was retrieving the right piece of it, at the right level of detail, for the exact question being asked.

That led to a simple operating pattern:

**Present → Proof → Future → Stop.**

The point is not to memorize a polished monologue.  The point is to know the evidence well enough to answer directly, attach one useful proof point, connect it to the role, and stop before the answer becomes less useful.

That idea changed the product.  The core problem was no longer “generate better interview answers.”  It became “build a better evidence retrieval system.”

## 02 / September 3: The Evidence Loop Became the Product

By early September, the model was becoming clearer:

**Career evidence → target role → interview → review → next round → job → ramp → accomplishments → future moves.**

That is the foundation of LandThePlane today.

The durable asset is not a generated answer.  It is the candidate-owned evidence underneath the answer: accomplishments, metrics, ownership, scale, target-role requirements, interview history, feedback, accepted corrections, and later the proof created on the job.

The interview is the first place that evidence gets pressure-tested.  It is not the final destination.

## 03 / September 11–12: From Prep Tool to Search Operating System

The next step was connecting preparation to the actual search.

ASTRO-style briefs became a way to turn a messy search into a readable operating report.  Gmail evidence reconciliation added a source-of-truth layer for application and interview signals.  Verified draft creation added a rule that still matters to the product: a write is not complete just because an API returned success.  Read it back.  Verify what was actually stored.

Turbo Sprint extended the same idea to high-fit applications.  Instead of producing generic application copy, it could assemble a bounded, privacy-scrubbed role microsite from evidence already known to be true.

The common thread was becoming obvious.  LandThePlane was not supposed to invent a better version of the candidate.  It was supposed to make the real version easier to understand and easier to prove.

## 04 / September 16–18: Interview Feedback Became Structured Learning

A major shift came when interview review stopped being just “what went wrong?”

There are at least three different failure modes:

1. **Capability gap:** The experience is genuinely missing.
2. **Evidence gap:** The capability may exist, but there is not enough specific proof available.
3. **Interpretation gap:** The evidence exists, but the interviewer interpreted the answer differently than intended.

Those require different repairs.

If the problem is capability, learn or build it.  If the problem is evidence, find or create proof.  If the problem is interpretation, make the smallest communication change that preserves the strength of the original answer.

That became the Interpretation Gap layer and the deeper Crucible preparation standard.  It also reinforced another rule: one interviewer’s preference should not silently rewrite the strategy for every future interviewer.

The goal is learning, not overfitting.

## 05 / September 25–30: The System Expanded Around the Search

As the search continued, more surrounding workflows proved useful.

Signal Engine connected shipped work and useful observations to a deliberate visibility routine.  Communication Guard added a pre-send check for messages that accidentally weaken confidence or leverage.  Offer Gate and Career Shield extended the evidence model into background-screening and public-record awareness.

At the same time, Quillgeist became the local execution layer behind more of the work.  The product is Quillgeist.  The current lightweight MVP runtime is Quillgeist Lite, with a local console nicknamed `qq` because it is quick to type.  That separation matters because LandThePlane should not depend on one model or one hosted workflow to preserve its operating method.

The architecture started matching the product philosophy: keep durable evidence and decisions independent from whichever model happens to be helping today.

## 06 / October 2: Current Context Without Polluting Candidate Evidence

The current alpha adds another piece: live public role and company context through Exa.

This has a strict boundary.

The resume is candidate evidence.  Public web research is external context.  They should never be silently blended.

LandThePlane now keeps the resume-side evidence map local while sending only a compact role/company research query through the governed Clintware Control Plane.  Exa can surface current product, customer, implementation, and role signals.  Those signals can suggest questions to verify in an interview, but they cannot fill a missing accomplishment.

That distinction sounds small.  It is one of the product’s most important rules.

## 07 / Resume Delta: Tailor Without Inventing

I also wanted the useful part of role-specific resume tooling without building another keyword-stuffing machine.

The new Resume Delta layer treats a resume as a versioned evidence document.

For each change, it can record:

- the target role,
- what changed,
- why it changed,
- whether the change was proposed, accepted, or rejected,
- and the evidence anchor that makes the change defensible.

The current founder dogfood record includes **five source-controlled public resume artifact revisions between September 3 and September 10, 2026**.  That is not user traction.  It is simply a real example of the behavior the feature is designed to make explicit and reusable.

The important unit is not “number of resumes generated.”  It is “number of evidence-backed decisions that survive into the next version.”

## 08 / Why the Product Does Not End When You Get the Job

The name LandThePlane originally points at the obvious finish line: get the job.

The more I built it, the less that looked like the real finish line.

A job description can become version zero of a success plan.  Interview evidence can become onboarding context.  The stories used to prove capability before hiring can be replaced by new evidence created in the role.  Weekly wins can become 1:1 material.  30/60/90-day progress can become review evidence.  Review evidence can become promotion evidence.  Eventually, if another job search happens, the next version of the evidence graph starts much stronger than the previous one.

So the loop becomes:

**LAND → RAMP → OPERATE → IMPROVE → PROVE → REUSE.**

That is the larger bet.

## 09 / The Part I Did Not Expect: The System Teaches You About Yourself

The most valuable output of a long search is not only a job offer.

Repeated interviews force patterns into view.  Which work do you explain with energy?  Which metrics do you remember immediately?  Which responsibilities keep appearing in the roles that feel right?  Which stories are technically correct but consistently misunderstood?  Which jobs look attractive on paper but require you to describe yourself as someone you are not?

Over time, the evidence graph becomes a mirror.

That is why I think LandThePlane can become more useful the longer someone uses it.  The system should not only help a person present themselves better.  It should help them understand what they actually do well, where the proof is thin, what they want to build next, and how that changes over time.

## 10 / What Is Working Now

The current alpha includes a browser-local evidence mapper, live Exa-backed role context, Crucible preparation, interview review, a prep provenance journal, an evidence-backed Resume Delta ledger, ASTRO-style briefs, Gmail evidence reconciliation and verified drafts, Turbo Sprint application microsites, Communication Guard, Signal Engine, and Offer Gate/Career Shield.

Those are working product surfaces.  They are not the same thing as product-market fit.

## 11 / What I Am Not Building

I am not trying to build a system that makes a candidate sound more impressive than the evidence supports.  I am not interested in a keyword-stuffing resume generator, a memorized-answer machine, or a tool that treats every interviewer preference as a new universal rule.

The operating rule is simpler: **preserve the evidence, expose the gap, learn from the outcome, and make the smallest useful change.**

The next questions are much more important than another feature list:

Will people reuse the same evidence across multiple rounds?  Will accepted resume deltas survive into later applications?  Will interview learning improve retrieval without making answers robotic?  Will the system still be useful after someone is hired?  Will people keep using it long enough for the evidence graph to become meaningfully better than a folder full of documents?

Those are the tests that matter now.

## 12 / Bottom Line

The job search was the pressure test.  The durable product is the evidence that survives it.

LandThePlane started as a way to land the plane.

The product I am actually building is the flight record.
