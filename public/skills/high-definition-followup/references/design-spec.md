# Design and renderer specification

## Visual system

- Use a dark or light canvas based on the target organization's current identity.
- Keep the main container to a 760-pixel maximum width with a subtle border and 12-pixel radius.
- Use a wide landscape banner with clean imagery and a legible role or meeting title.
- Put one idea in each content card.
- Use clear buttons with verified HTTPS destinations and a minimum 44-pixel visual height.
- Keep contrast at or above WCAG AA for ordinary text.

## Renderer input

```json
{
  "recipient_name": "Jordan",
  "subject_context": "Customer Operations",
  "headline": "Ready to build while operating.",
  "subheadline": "Learn what works, standardize what repeats, and preserve necessary alternate paths.",
  "body_paragraphs": ["Thank you for the conversation.", "The current-state discussion clarified the first priority."],
  "strategy_title": "Targeted playbooks for a faster start",
  "strategy_body": "Start from the current journey, clarify ownership, and surface blockers earlier.",
  "proof_title": "Relevant operating example",
  "proof_body": "A working example that demonstrates the approach.",
  "proof_url": "https://example.com/",
  "proof_label": "Open the example",
  "secondary_title": "A smaller proof of speed",
  "secondary_body": "A compact project that shows fast execution.",
  "secondary_url": "https://example.com/project",
  "secondary_label": "View the project",
  "closing": "I look forward to the next conversation.",
  "sender_name": "Taylor Morgan",
  "sender_email": "taylor@example.com",
  "sender_phone": "+1 555 010 0100",
  "background": "#020e1c",
  "panel": "#05172c",
  "accent": "#f4c44e",
  "secondary_accent": "#83bd3a"
}
```

Omit the secondary proof by leaving its title and URL blank. The renderer escapes supplied text and accepts only valid HTTP(S) links.
