# Mindvergent Labs — seed research pack

These are founder-seeded starting points for the community. They are not community consensus. Each should be published as a living brief, paired with a discussion thread, and revised when better evidence or practitioner feedback appears.

## 1. When a valid AI action is still the wrong action

### Working question

How should an AI-enabled system prevent a model from taking a technically valid action that violates the user's actual intent?

### Initial position

Tool-enabled AI systems create two separate correctness problems:

1. Is the tool call syntactically and operationally valid?
2. Is this the action the user actually authorized?

A system can pass the first test and fail the second.

For consequential actions, authorization should not depend only on the same probabilistic model that selected the action. A stronger architecture adds deterministic checks around side-effect classes such as send, publish, delete, purchase, transfer, invite, privilege changes, or irreversible external writes.

### Practical design questions

- Should permissions be represented as explicit capabilities such as READ, DRAFT, SEND, DELETE, PURCHASE?
- Which actions require fresh authorization on the current turn?
- Can ambiguous language such as "do it" elevate permissions?
- Which actions can be made reversible rather than blocked?
- How should systems preserve standing constraints across long conversations?
- Should an independent policy layer validate the model's proposed action before execution?

### Useful artifact to build

A reference permission matrix for common agent actions with:

- action class;
- reversible / irreversible;
- external side effect;
- required authorization;
- confirmation policy;
- recommended deterministic gate.

### Community prompt

What is the strongest approval/permission pattern you have actually implemented or seen work in production?

---

## 2. Customer health signals that deserve action

### Working question

Which Customer Success health signals are useful because they change a decision, not merely because they can be displayed on a dashboard?

### Initial position

A health score is only useful when a signal has an associated owner and action.

Instead of asking "What should our customer health score include?", start with:

- What decision are we trying to make?
- What evidence should change that decision?
- How early can the signal appear?
- Who owns the response?
- What action becomes appropriate at each threshold?

### Candidate signal categories

- product usage and feature adoption;
- depth/breadth of active users;
- onboarding milestones;
- support volume and severity;
- unresolved product friction;
- executive/stakeholder engagement;
- champion changes;
- business-review follow-through;
- renewal timing;
- contractual or implementation dependencies;
- sentiment that is supported by observable behavior;
- changes in customer priorities or organizational structure.

### Anti-pattern

Combining many weak inputs into one colored score can create false confidence. A red account with no defined intervention is just a red dashboard tile.

### Useful artifact to build

A health-signal action map:

SIGNAL -> EVIDENCE -> THRESHOLD -> OWNER -> ACTION -> FOLLOW-UP -> OUTCOME

### Community prompt

Which customer signal has actually caused you to intervene earlier, and what did you do differently because of it?

---

## 3. When a prompt should become a workflow

### Working question

At what point does a useful prompt stop being personal technique and become a reusable operating system?

### Initial position

A prompt should usually remain lightweight when:

- it is used rarely;
- the inputs change dramatically every time;
- the cost of failure is low;
- only one person needs it;
- output quality is easy to judge manually.

It may deserve to become a workflow when:

- the same context must be repeated frequently;
- several people need the same outcome;
- permissions or external tools are involved;
- output must meet a defined schema;
- the task has repeatable inputs and decision points;
- corrections should persist;
- failures have meaningful consequences;
- the task would benefit from deterministic steps around model reasoning.

### Graduation ladder

PROMPT -> TEMPLATE -> CHECKLIST -> WORKFLOW -> TOOL -> PRODUCT

Not every useful prompt should move all the way to the right.

### Useful artifact to build

A graduation checklist that scores:

- frequency;
- repeatability;
- number of users;
- required context;
- external actions;
- failure cost;
- need for memory;
- need for permissions;
- measurable outcome.

### Community prompt

What prompt or manual AI routine have you repeated enough times that it should probably become software?

---

## Publishing standard for future research

Every Mindvergent brief should show:

1. The working question.
2. The founder/current hypothesis.
3. What is evidence versus opinion.
4. The practical artifact or decision the research is trying to improve.
5. Open questions or counterarguments.
6. Revision history.
7. Contributors/peer reviewers when applicable.
8. A clear marker when something becomes "tested in practice" rather than merely proposed.

This format is intended to become one of the first differentiated product behaviors: the knowledge base should show how an answer evolved and who improved it.
