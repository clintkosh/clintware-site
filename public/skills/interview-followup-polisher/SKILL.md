---
name: interview-followup-polisher
description: Polish interview and recruiting follow-ups through repeated devil's-advocate review until the message has no material recipient-side objection, then recommend the best estimated send time from the available context. Use for interview thank-yous, recruiter or hiring-manager check-ins, post-interview status requests, role-pivot follow-ups, reference offers, and stalled hiring conversations.
---

# Interview Followup Polisher

Turn a rough follow-up into the strongest concise version that still sounds like the sender. The core behavior is an adversarial review loop: draft, challenge, revise, challenge again, and do not call the message final until a fresh devil's-advocate pass agrees there is no material reason to change it.

## Default workflow

1. **Recover context before drafting.** Use the conversation, email thread, calendar event, interview notes or transcript, job description, recruiter promises, prior follow-ups, and relevant user history when those sources are available. Do not ask the user to repeat facts that can be retrieved safely with available tools.
2. **Identify the real objective.** Examples: thank the interviewer, obtain a status update, preserve two possible role paths, clarify a concern, reinforce fit, offer references, or re-open a stalled process.
3. **Rank the evidence.** Put the strongest new fact first. Prefer concrete scope, leadership, results, relevant proof, and direct overlap with the recipient's stated need. Do not overload the note with every available credential.
4. **Draft the shortest complete version.** Make the recipient's next action obvious. Preserve the existing email thread when appropriate.
5. **Run Devil's Advocate Gate 1.** Read the message as a skeptical recruiter, hiring manager, executive, or busy recipient. Actively look for reasons the message could reduce the sender's chances.
6. **Revise every material issue.** Do not defend the draft merely because it is already polished.
7. **Run Devil's Advocate Gate 2 as a fresh review.** Re-evaluate the revised message without anchoring to the prior score. If a material objection remains, revise again and repeat the gate.
8. **Pass only after two consecutive clean adversarial reads.** A clean pass means no material wording, positioning, evidence, tone, ask, or timing issue remains. This is the skill's practical equivalent of a 10/10 review; it is not a guarantee of a hiring outcome.
9. **Recommend send timing.** Give one best estimated send time plus a backup window when useful, using the timing engine below.
10. **Save as a draft unless the user explicitly asks to send.** If editing a connected mailbox, re-open the saved draft and verify the actual stored content.

## Devil's Advocate Gate

Challenge the draft against all of these questions:

- Is it too long for the amount of new information?
- Does it sound anxious, defensive, needy, irritated, or like the sender is trying to reverse an unstated rejection?
- Does it imply the recipient has concerns when none were stated?
- Does it assume an internal decision, conversation, hiring stage, or stakeholder involvement that is not known?
- Does it create unnecessary work for the recipient?
- Are there too many asks, links, attachments, proof points, or alternate paths?
- Is the strongest evidence buried instead of prominent?
- Does it contradict the role or path the sender originally pursued?
- If two role paths are mentioned, is the hierarchy clear without making either sound like a consolation prize?
- Are references offered at the right level, rather than dumped into the message before they are requested?
- Is a portfolio or project framed as evidence instead of homework for the recipient?
- Are any claims inflated, unverified, or more specific than the evidence supports?
- Is there sensitive personal information that does not need to be reintroduced?
- Is the closing easy to answer with a concrete next step?
- Would a busy recipient understand the point in under 20 seconds?

If any answer is unfavorable, revise and run the gate again.

## Evidence hierarchy

Prefer, in order:

1. A fact the recipient explicitly asked about or a gap they raised.
2. Concrete leadership or ownership scope.
3. Relevant measurable outcomes with careful attribution.
4. Direct product, technical, industry, or customer-facing overlap.
5. A compact work sample or portfolio link that proves how the sender thinks.
6. References from former leaders or colleagues, usually offered rather than listed unless requested.

Do not include weak evidence merely because it exists.

## Two-path role rule

When a conversation introduces a second role or alternate path:

- Do not make the original role sound unwanted.
- Do not call the alternate role a fallback.
- State the strongest fit clearly, then keep the other path genuinely open.
- Anchor the stronger path in evidence, especially if the recipient raised it first.
- Avoid language that assumes another stakeholder has already approved, rejected, or evaluated the sender.

## Portfolio and reference rule

A portfolio link should be one compact proof point. Explain what it demonstrates in one sentence. Do not apologize for it, undersell it, or turn it into a product pitch.

Offer references when they can reduce perceived risk, but normally do not list names, contact details, or attachments unless the recipient asks or the hiring process is at that stage.

## Sensitive-information rule

Do not infer that silence is caused by disability, neurodivergence, health information, age, race, religion, gender, or another protected or sensitive characteristic. Do not reintroduce sensitive information into a follow-up unless the user explicitly wants it included and it serves a clear purpose.

## Send-time engine

Estimate the best send time from the strongest available context rather than using a generic rule. Consider:

- the current local date and time;
- the recipient's likely timezone and workday;
- interview or meeting end time;
- how many business days have elapsed;
- any explicit promise such as "later today," "tomorrow," or "next week";
- whether the recipient currently owes the sender an update;
- weekends and known holidays;
- urgency, competing deadlines, and stated availability;
- startup or executive context where schedules may be less conventional;
- whether the message is a same-day thank-you versus a status follow-up;
- recent email or LinkedIn activity when legitimately available;
- whether sending now would land at lunch, very early, very late, or after the recipient's workday.

### Timing defaults when context is incomplete

- **Same-day interview thank-you:** usually 1 to 4 hours after the conversation, while still inside the recipient's business day.
- **Promised update missed:** usually the next reasonable business window after the promise has clearly elapsed. Do not add another full day merely to appear patient when the recipient already set the expectation.
- **No promised timeline:** normally 2 to 4 business days after an interview or meaningful recruiting conversation, adjusted for stage and urgency.
- **Late-day draft:** if it would arrive near the end of the recipient's day with no urgency, prefer the next business morning.
- **Lunch window:** when there is no stronger contextual reason, avoid roughly noon to 1 PM recipient-local time.

Give one concrete recommendation such as **"Send today at 1:35 PM CT"** rather than only "send this afternoon." Include a backup window if the exact recommendation is missed. If current-time or timezone data is unavailable, state the assumption instead of pretending precision.

## Output format

Unless the user asks for something else, return:

1. **Final draft** in a paste-ready block.
2. **Gate status:** `Devil's Advocate Gate: PASS` only after the repeated review requirement is satisfied.
3. **Why it passed:** no more than three concise points.
4. **Best estimated send time:** one exact recommendation, the recipient timezone when known, and one backup window if useful.

If the user asks only for the draft, keep the review work internal and provide the final draft plus send timing only when timing is relevant.

## Integration with High-Definition Follow-Up

This skill is the content and timing gate. The separate **High-Definition Follow-Up** skill may be used afterward when a branded HTML presentation is useful. Styling must never override a failed content gate.
