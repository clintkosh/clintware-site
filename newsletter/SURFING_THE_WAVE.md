# Surfing the Wave

Surfing the Wave is the weekly AI pulse/editorial layer for the existing Clintware newsletter stack.

It does **not** create a second subscriber database or mail transport. The existing `newsletter/` Worker remains the subscriber, confirmation, unsubscribe, and delivery boundary.

## Weekly pipeline

1. Collect public AI signals and product/model changes through approved live-web/provider routes.
2. Build a normalized signal packet.
3. Run the configured model pulse grade.
4. For the owner-managed profile only:
   - image default: Grok, when configured and available;
   - compact devil's-advocate review: Gemini, when configured and available;
   - text/research still follows local-first routing unless freshness/quality requires remote authority.
5. Produce a draft package:
   - weekly headline;
   - what changed;
   - why it matters;
   - model/provider pulse table;
   - devil's-advocate note;
   - source/evidence list;
   - image brief;
   - publish/no-publish recommendation flag for human review.
6. Hand the approved post to the existing Clintware Blog + newsletter publish path.

## Privacy boundary

Public Quillgeist users can select their own local or remote models and defaults. They never inherit the owner's model preferences or owner-local data.

Owner-local/private data is default-deny. It may enter a Surfing the Wave context only when a verified authenticated subject matches the configured owner subject. Public/shared/news data can be processed without that private-data grant.

## Completion and ticketing

Every scheduled or manually triggered Surfing the Wave run must have a `quillgeist-prompt-ticket/v1` ticket. A run ends only as:

- `verified_done`
- `blocked`
- `carried_forward`

A scheduled run must not silently disappear after dispatch.

## Current blockers carried forward

- Google delegated OAuth for the existing newsletter previously returned `403 access_denied` while the OAuth app was in Testing and the owner account was not approved as a test user. This must be reverified before claiming newsletter delivery is ready.
- The current newsletter registry uses Durable Object SQLite. Durable Object row-read quota degradation is an independent resilience risk and must not be confused with the Google OAuth blocker.

## Domain check, September 30, 2026

At the time checked through the connected registrar:

- `surfingthewave.com`: unavailable
- `surfingthewave.news`: available
- `surfingthewave.tech`: available
- `surfingthewave.io`: available
- `surfingthewaveweekly.com`: available
- `surfingthewave.ai`: reported available, but the returned purchase amount was `0`; recheck live price before purchase.

No domain purchase is performed by this implementation.
