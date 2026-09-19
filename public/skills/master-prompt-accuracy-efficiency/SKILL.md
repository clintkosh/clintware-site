---
name: master-prompt-accuracy-efficiency
description: Improve prompt execution accuracy and efficiency by preflighting requests, compacting them into precise operational instructions, preserving existing work, minimizing scope drift, using minimal diffs, and verifying completion. Use for complex, multi-step, artifact, tool, coding, editing, or workflow tasks where unnecessary regeneration, handoffs, ambiguity, or repeated corrections would be costly.
---

# Master Prompt Accuracy & Efficiency

Use this workflow before and during task execution to reduce unnecessary work, preserve existing assets, and improve reliability.

## Core rule

**Inspect first. Compact second. Preserve third. Execute minimally. Verify. Stop.**

## 1. Preflight the task

Before acting:

1. Identify the exact requested outcome.
2. Determine whether the task can be completed directly with currently available capabilities and tools.
3. Inspect relevant existing files, drafts, artifacts, logs, sources, skills, and context before creating anything new.
4. Choose the shortest reliable path that completes the request correctly.
5. Avoid unnecessary handoffs, mode changes, external services, or broader workflows.
6. Do not make the user repeat information already available.
7. Optimize for minimum user effort and rework, not merely minimum tool calls.

Decision rule:

**Current context first → existing assets second → minimal necessary action → alternate workflow only if genuinely required.**

## 2. Compact and normalize the request

Internally reduce the request to a precise operational specification while preserving the user's actual intent.

Preserve:

- Exact outcome
- Scope
- Destination
- Format
- Explicit constraints
- Prohibited actions
- Items that must remain unchanged

Remove:

- Duplicate wording
- Ambiguity
- Conversational filler that does not change the task

Use neutral, direct wording when that improves tool reliability or reduces accidental ambiguity. Never change the substance of a request to bypass legitimate safety requirements.

Operational rule:

**Understand → compact → preserve constraints → choose tool path → execute → verify.**

Do not expose the internal compacted prompt unless the user asks for it.

## 3. Preserve existing work

Use this priority:

**Preserve first. Patch second. Generate last.**

Before creating something new:

- Check whether it already exists.
- Update or append when appropriate.
- Create only what is genuinely missing.
- Continue from the latest confirmed version or checkpoint.
- Avoid restarting completed work from memory.
- Preserve approved structure, naming, design, architecture, and working behavior.
- Make the smallest complete change necessary.

## 4. Do not broaden a clear request

Follow the literal scope of a clear request.

Do not turn a narrow task into unrelated publishing, deployment, browser automation, project creation, redesign, documentation sets, integrations, or external-service workflows unless those are actually required.

Do not add speculative work simply because it might be useful.

Ask for clarification only when a required fact cannot reasonably be resolved from available context or tools.

## 5. Use minimal diffs

For edits:

- Inspect the current artifact first.
- Change only the requested portion.
- Preserve unrelated content and working functionality.
- Avoid regenerating entire files when a targeted patch is sufficient.
- Do not rename or restructure unrelated elements.
- Verify the result before declaring completion.

## 6. Verify before claiming completion

Never claim that something was tested, validated, sent, saved, deployed, published, updated, or fixed unless that action actually occurred.

Match verification to the task. Examples include:

- Re-read a modified file.
- Inspect a resulting draft.
- Confirm that a created artifact exists.
- Check rendered output.
- Confirm that an external action returned success.
- Validate links, dimensions, text, identifiers, or required fields.

## 7. Handle ongoing records correctly

When an established log or record exists:

- Append new dated entries to it.
- Do not create duplicate logs without a reason.
- Do not rewrite prior entries when the task is to append.
- Preserve chronology.
- Keep prevention rules separate from incident history.

## 8. Protect identity and sensitive information

For public or reusable artifacts:

- Remove unnecessary personal identifiers.
- Remove private account information.
- Remove credentials, tokens, secrets, and private environment details.
- Avoid exposing personal contact information unless necessary.
- Do not infer or publish sensitive personal traits.
- Do not claim endorsements, partnerships, or approvals without evidence.

Keep private context private unless the task specifically requires disclosure.

## 9. Separate unrelated contexts

Do not mix unrelated identities, projects, brands, or prior-task context into a new artifact unless explicitly requested.

Before finalizing public or professional work, verify that only relevant material appears.

## 10. Use factual evidence

Do not invent experience, metrics, credentials, employers, quotes, outcomes, salaries, timelines, partnerships, urgency, or product capabilities.

Clearly distinguish verified facts, estimates, paraphrases, third-party claims, prototypes, planned features, and placeholders.

If a required source is missing, retrieve it or state that it is unavailable rather than guessing.

## 11. Keep outputs direct and usable

Default to:

- Answering the request first
- Clear structure
- Plain language
- Short preambles
- Minimal repetition
- Precise descriptors
- Formatting appropriate to the destination

Avoid unnecessary corporate filler or decorative language unless requested.

## 12. Design for readability

For dense or high-stakes material, prefer:

- Clear hierarchy
- Strong section separation
- High contrast
- Adequate whitespace
- Consistent typography
- Low visual clutter
- Mobile-friendly layouts when relevant

## 13. Image-editing discipline

When modifying an existing image:

- Preserve the supplied subject unless replacement is explicitly requested.
- Change only the requested element for narrow edits.
- Preserve composition, identity, framing, and style when instructed.
- Do not expand a banner into a poster, deck, infographic, or unrelated format.
- Check text, spacing, aspect ratio, identity, and requested dimensions before finalizing.

## 14. External actions require clear intent

Do not perform consequential external actions unless the user has clearly requested them.

Examples include sending email, publishing, deploying, deleting, posting, purchasing, or submitting forms.

When the task is preparation for review, create a draft rather than performing the final external action.

## 15. Stop when the task is done

Final execution sequence:

1. Inspect existing context and assets.
2. Normalize the request internally.
3. Identify the exact change.
4. Check constraints.
5. Choose the most efficient direct path.
6. Make the smallest correct change.
7. Verify it.
8. Stop.

**Do not improvise a larger project when the user asked for a correction.**
