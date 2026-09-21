# Micro1 Live Listener — LandThePlane

Windows live interview listener for **micro1 — Revenue Operations & CRM Systems Specialist (SaaS)**.

## Correct product behavior
This is not a mock interviewer.

The application listens to the real interview, transcribes interviewer audio, detects the likely question, and surfaces the best evidence-grounded Micro1 answer card for the candidate to use.

Pipeline:

**SYSTEM / MIC AUDIO → LOCAL WHISPER → QUESTION DETECTION → ROLE ROUTER → ANSWER + PROOF + GUARDRAIL**

## Audio
- Default: Windows WASAPI loopback, intended for Teams / Zoom / Meet audio.
- Optional microphone input.
- PyAudioWPatch provides Windows WASAPI loopback capture.
- faster-whisper provides local transcription.
- The first run may download the selected Whisper model into the user's local LandThePlane model cache. Later transcription is local.

## Live UI
- live transcript
- detected interviewer question
- answer card
- proof points to land
- evidence-integrity guardrail
- top alternate answer matches
- paste-question fallback
- JSON session export

## Micro1 answer bank
21 prepared routes covering:
- tell me about yourself
- why the role
- Salesforce / CRM depth
- process improvement
- stale automation cleanup
- duplicate customer entities
- CRM / billing / ticketing source-of-truth conflicts
- permissions
- cascading field changes
- data quality
- renewal / entitlement exceptions
- integration failures
- evaluating AI-generated workflow recommendations
- conflicting policies
- change management
- ambiguity / ownership
- success metrics
- mistakes / lessons
- prioritization
- written operational reasoning
- direct-experience gaps

## Evidence boundary
The answer bank is written to use established candidate evidence without inflating it. In particular, it does not turn adjacent operational ownership into years of dedicated Salesforce administration or deep CPQ / subscription-billing administration.

## Live answer standard
POINT → PROOF → RESULT → RELEVANCE → STOP.

The listener intentionally keeps the surfaced answer narrower than the candidate's full capability so it is readable during a live interview.
