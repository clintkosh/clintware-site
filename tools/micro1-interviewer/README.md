# Micro1 Live Listener — LandThePlane

Windows live interview listener for **micro1 — Revenue Operations & CRM Systems Specialist (SaaS)**.

## Behavior

**SYSTEM / MIC AUDIO → LOCAL WHISPER → QUESTION DETECTION → ROLE ROUTER → VISIBLE ANSWER + PROOF + GUARDRAIL**

This is the live listener, not a mock interviewer.

## Visible-answer v2

The answer surface is now designed for live readability rather than a static label:

- dedicated high-contrast black answer pane;
- white 18 pt answer text by default;
- independent vertical scrollbar so long answers never disappear below the panel;
- **A− / A+** controls for live font scaling;
- **TEST CARD** button that instantly fills the answer pane before the call;
- status moved to its own row so it cannot push controls or answer content off-screen;
- tested with both normal and enlarged/DPI-like text scaling.

## Audio

- Default: Windows WASAPI loopback for Teams / Zoom / Meet output.
- Optional microphone input.
- PyAudioWPatch handles WASAPI capture.
- faster-whisper handles local transcription.
- First use may download the selected Whisper model into the local LandThePlane model cache.

## Micro1 answer bank

21 evidence-grounded routes covering the current role's core screening areas, including Salesforce/CRM depth, stale automations, duplicate customer records, CRM/billing/ticketing source-of-truth conflicts, permissions, cascading field changes, data quality, renewals/entitlements, integration failures, AI workflow evaluation, policy conflicts, adoption, ambiguity, metrics, mistakes, prioritization, written reasoning, and direct-experience gaps.

## Evidence boundary

The answers do not convert adjacent operational ownership into fake years of dedicated Salesforce administration or deep CPQ/subscription-billing administration.

## Answer rail

**POINT → PROOF → RESULT → RELEVANCE → STOP**
