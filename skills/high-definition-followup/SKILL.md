---
name: high-definition-followup
description: Create polished, brand-matched professional follow-up emails after interviews, sales calls, customer meetings, or networking conversations. Use when a user asks for a visually refined HTML thank-you, a company-themed follow-up, a banner-led email, or a reply drafted into an existing email thread with concrete meeting details, relevant proof, and a review-before-send workflow.
---

# High-Definition Follow-Up

Create a concise professional message and a refined, accessible HTML presentation. Keep the substance stronger than the styling.

## Workflow

1. Identify the meeting, recipient, role, organization, thread, and requested proof points.
2. Resolve recipients before creating a person-addressed draft. Preserve the active thread and subject when available.
3. Extract three to five specific takeaways. Do not invent metrics, quotes, timelines, priorities, or next steps.
4. Use authoritative organization sources to derive current colors, terminology, and positioning when brand matching is requested.
5. Draft plain text first: thank the recipient, name what was learned, state the operating approach, offer relevant proof, and close with the real next step.
6. Build the HTML version using [references/design-spec.md](references/design-spec.md).
7. Create or edit a wide banner only when requested. Preserve a supplied person's identity, use legible text, and use authentic logos only from authoritative assets.
8. Include a plain-text alternative and verify every link.
9. Before calling the content final, run the [Interview Followup Polisher](/skills/interview-followup-polisher/SKILL.md) gate: challenge the message from the recipient's point of view, revise every material weakness, obtain two consecutive clean adversarial passes, and estimate the best send time from the available context.
10. Save as a draft for review. Send only when the user explicitly requests sending.
11. Re-open the draft and verify recipients, subject, facts, links, inline images, mobile readability, and the final gate result.

## Content architecture

Use this order unless a shorter note is more appropriate:

1. Specific thanks and the most useful insight from the conversation.
2. A concrete operating approach.
3. One current-state constraint translated into a careful first action.
4. One substantial proof and, optionally, one small proof of speed.
5. A direct connection between the proof and the recipient's needs.
6. A confident close tied to the stated next step.

## Writing rules

- Prefer direct, warm, specific language.
- Avoid generic enthusiasm, inflated claims, and repeated qualifications.
- Keep the readable message under about 500 words unless a fuller brief is requested.
- Use only facts supported by the conversation or cited source material.
- Offer tailored tooling without implying that technology should lead the process.
- Do not expose private pipeline information, credentials, or unrelated personal details.

## Clintware brand rule

When the follow-up is a Clintware-owned professional communication or template, use **Clintware™** as the company treatment and **Go Furthest.™** as the canonical slogan where a slogan/brand line is appropriate. Never substitute “Go Further.” or use the ® symbol. Keep the slogan separate from factual product descriptions, and follow the current product hierarchy and accuracy rules in `/BRAND_STANDARDS.md`.

## Presentation rules

- Use an email-safe table layout with inline styles.
- Keep the container near 760 pixels wide and mobile-friendly.
- Use body text of at least 15 pixels with generous line height.
- Use one dominant accent and one restrained secondary accent.
- Keep important meaning in live text, not only inside an image.
- Provide descriptive alternative text for meaningful images.

## Optional renderer

Use `scripts/render_followup.py` to generate a stable HTML and plain-text pair from JSON. Read [references/design-spec.md](references/design-spec.md) for the schema.

## Final checks

- Confirm the recipient and thread.
- Confirm every factual claim.
- Confirm names, titles, and organization spelling.
- Confirm the Interview Followup Polisher adversarial gate passed and the send-time recommendation was considered.
- Confirm the saved object is accurately described as a draft or sent message.
