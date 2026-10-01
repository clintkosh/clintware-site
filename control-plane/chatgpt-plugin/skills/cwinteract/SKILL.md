---
name: cwinteract
description: Use CWInteract™ for governed local interaction with visible Windows desktop apps and signed-in system browser windows such as Edge or Chrome through Quillgeist Lite/qq.
---

# CWInteract™

CWInteract™ is Clintware's canonical desktop-interaction skill.

Use it when the task depends on an already signed-in local application or browser window and DOM-only browser automation is not the right surface. It is deliberately based on the same governed interaction model used for browser editing, generalized to visible Windows applications.

## Routing

Prefer these paths in order:

1. Use ordinary provider/connector APIs when they expose the exact account action safely.
2. Use Quillgeist Web / `browser-work` for structured web search, reading, and isolated/persistent browser automation where a DOM session is appropriate.
3. Use **CWInteract™** for the user's normal signed-in Windows app or browser window, including Microsoft Edge, Google Chrome, installed PWAs, Electron apps, Microsoft Store apps, and other UI Automation-accessible desktop applications.
4. Use manual user interaction only when credentials, MFA, CAPTCHA, consent, or another protected step requires it.

Do not create a second desktop-control framework when CWInteract™ can perform the job.

## Task

Canonical qq task: `cwinteract`.

Compatibility alias: `windows-app-uia`.

Supported actions:

- `discover`: Find matching Start-menu applications.
- `launch`: Launch a reviewed local app through its registered Windows application identity.
- `inspect`: Read accessible controls in the selected visible window.
- `form`: Perform bounded fill/click/check/uncheck/select operations after explicit authorization.

The task accepts `AppName`, `WindowTitle`, `Query`, `StepsJson`, `Approved`, `MaxResults`, and `WaitMs`.

## Browser relationship

CWInteract™ is the canonical route for **system-browser interaction** where the user's authenticated Edge/Chrome session matters. Quillgeist Web remains the canonical route for browser-native DOM automation, search, and page reading.

Conceptually:

`intent → connector/DOM when appropriate → CWInteract™ for signed-in desktop/browser UI → verify`

Do not force a website into the isolated qq browser if the required authenticated state already exists in the user's normal browser and CWInteract™ can safely operate it.

## Safety

CWInteract™ must not type or expose passwords, passcodes, MFA/OTP values, API keys, access tokens, private keys, payment-card data, SSNs, or other credential-like values.

Consequential writes require `Approved=true`, and the user's current request must actually authorize the action.

Never use CWInteract™ to bypass CAPTCHA, access restrictions, authorization boundaries, identity-provider protections, or consent screens.

Inspect first, mutate second, verify third. A dispatched or launched action is not completion evidence; require local qq result evidence and, where practical, a post-action inspection.
