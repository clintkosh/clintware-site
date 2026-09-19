# Running Quota Notification Icon

## Goal

Add a persistent, always-visible quota indicator to the application so the user can see remaining work capacity without opening Settings.

The indicator should appear in the main application chrome as a compact notification-style icon with a live remaining-quota value, status color, tooltip, and expandable details panel.

## Core Requirement

Create a quota status component that:

- Remains visible while the application is open.
- Displays the current quota remaining.
- Refreshes automatically while work is being performed.
- Warns the user before quota is exhausted.
- Opens a detailed quota panel when clicked.
- Does not invent quota numbers when the underlying platform does not expose them.
- Clearly distinguishes exact values from estimates.

## Preferred Placement

Place the icon in this order of preference:

1. Top-right application header, beside notifications or the account avatar.
2. Persistent sidebar footer.
3. Floating status pill in the bottom-right corner when the interface has no stable header.

The component must not be hidden inside Settings.

## Compact Display

Use a small gauge, battery, speedometer, or circular progress icon.

Display one of these compact labels:

- `82% left`
- `14 / 20 left`
- `2h 18m left`
- `Quota unavailable`
- `Estimated: 38%`

Recommended compact format:

```text
[Gauge Icon] 82%
```

At narrow widths, show only the icon and status color. Reveal the exact value in a tooltip.

## Status Levels

| Remaining | State | Behavior |
|---|---|---|
| 51–100% | Healthy | Normal icon and value |
| 21–50% | Moderate | Mild warning state |
| 6–20% | Low | High-visibility warning and optional notification |
| 1–5% | Critical | Persistent critical indicator |
| 0% | Exhausted | Disabled-work state with reset information |
| Unknown | Unavailable | Neutral icon with explanation |

Do not rely on color alone. Include an icon, label, tooltip, or accessible text for each state.

## Expanded Quota Panel

When the user clicks the compact indicator, open a popover or drawer containing:

- Quota remaining.
- Quota used.
- Total quota, when known.
- Percentage remaining.
- Reset time and timezone.
- Quota type, such as messages, tokens, compute, tasks, credits, rate limit, or work units.
- Last successful refresh time.
- Whether the value is exact or estimated.
- Current data source.
- Manual refresh control.
- Link to quota or billing settings, when available.

Example:

```text
Work quota

Remaining: 82%
Used: 18 of 100 units
Resets: Today at 7:00 PM CDT
Source: Account usage API
Updated: 12 seconds ago
Status: Exact
```

## Data Provider Contract

Implement the UI against a provider interface instead of hard-coding one platform-specific API.

```ts
export type QuotaAccuracy = "exact" | "estimated" | "unavailable";

export type QuotaState =
  | "healthy"
  | "moderate"
  | "low"
  | "critical"
  | "exhausted"
  | "unavailable";

export interface QuotaSnapshot {
  used?: number;
  remaining?: number;
  total?: number;
  percentRemaining?: number;
  unit?: "messages" | "tokens" | "tasks" | "credits" | "minutes" | "work_units";
  resetAt?: string;
  accuracy: QuotaAccuracy;
  state: QuotaState;
  source: string;
  updatedAt: string;
  message?: string;
}

export interface QuotaProvider {
  getQuota(): Promise<QuotaSnapshot>;
}
```

## Provider Priority

Resolve quota data in this order:

1. Official quota or usage API.
2. Official account or billing endpoint.
3. Official response headers containing rate-limit or usage information.
4. Locally measured usage compared with a user-configured limit.
5. Explicit `unavailable` state.

Never scrape private account pages, bypass authentication controls, or fabricate values.

## Exact Versus Estimated Values

When an official source provides the value, label it `Exact`.

When the application derives the value from local activity, label it `Estimated` and show the estimation method.

```text
Estimated from 31 locally recorded tasks out of a configured daily limit of 50.
```

When no trustworthy source exists, show:

```text
Quota unavailable
This platform does not currently expose a live quota value to this application.
```

The unavailable state must still remain visible so the user knows quota tracking has not silently failed.

## Refresh Behavior

Refresh quota:

- At application startup.
- After each completed work request.
- After each failed request caused by usage or rate limits.
- When the expanded quota panel opens.
- Every 60 seconds while the application is active.
- When the browser tab regains focus.
- When the user clicks Refresh.

Use request deduplication so multiple triggers do not create parallel quota requests.

Pause or reduce polling when the application is hidden or offline.

## Notifications

Provide optional notifications at these transitions:

- Quota falls below 20%.
- Quota falls below 5%.
- Quota reaches 0%.
- Quota resets or becomes available again.

Do not repeatedly notify at every refresh. Notify once per threshold transition and reset the notification state after quota recovery or reset.

```text
Work quota is low
18% remains. The quota resets at 7:00 PM CDT.
```

## Accessibility

The compact control must:

- Be keyboard accessible.
- Use a real button element.
- Include an accessible label such as `Work quota: 18 percent remaining`.
- Expose expanded/collapsed state with `aria-expanded`.
- Provide a visible focus state.
- Avoid conveying status through color alone.
- Respect reduced-motion preferences.
- Maintain sufficient contrast in light and dark modes.

## Suggested React Component Structure

```text
QuotaProvider
├── useQuotaStatus
├── QuotaIndicator
│   ├── QuotaIcon
│   ├── QuotaCompactValue
│   └── QuotaTooltip
├── QuotaPopover
│   ├── QuotaProgress
│   ├── QuotaDetails
│   ├── AccuracyBadge
│   ├── LastUpdated
│   └── RefreshButton
└── QuotaThresholdNotifier
```

## Error Handling

On a temporary provider failure:

- Keep the last valid value visible.
- Mark it as stale.
- Show the last successful update time.
- Retry with exponential backoff.

```text
82% left · stale
Last updated 4 minutes ago
```

On authentication failure:

```text
Quota unavailable
Reconnect the account to resume live quota tracking.
```

## Persistence

Store only non-sensitive UI preferences locally:

- Indicator placement.
- Whether compact text is shown.
- Notification thresholds.
- Whether desktop notifications are enabled.

Do not store access tokens or sensitive billing responses in local storage.

## Acceptance Criteria

The feature is complete when:

1. The quota indicator is visible from the main workspace without opening Settings.
2. Clicking it opens current quota details.
3. It updates after work completes and at the configured interval.
4. It displays the reset time when available.
5. It identifies exact, estimated, stale, and unavailable values.
6. It never invents quota data.
7. It warns at configured low-quota thresholds without notification spam.
8. It works with keyboard navigation and screen readers.
9. It remains readable in light mode, dark mode, and narrow layouts.
10. Provider-specific quota logic is separated from the visual component.

## Implementation Instruction for an AI Coding Agent

Inspect the existing application framework, layout, state-management approach, account APIs, and usage endpoints. Implement the quota provider and persistent quota indicator using the application's current component library and design language.

Do not replace unrelated navigation or account components. Add the indicator to the most stable visible application chrome. Reuse existing popover, tooltip, progress, notification, authentication, and polling utilities where available.

Before using an estimated quota, verify that no official endpoint or response header exposes the real value. If no reliable value is available, implement the complete UI with an honest unavailable state and a provider adapter that can be connected later.

Include tests for threshold state calculation, exact and estimated labels, unavailable quota, stale-data behavior, polling and focus refresh, notification transition deduplication, keyboard navigation, and accessibility attributes.
