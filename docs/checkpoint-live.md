# Checkpoint Live

## Positioning
Checkpoint Live is a local-first conversation state engine. It listens to a live conversation, maintains a transcript, detects evidence, open loops, commitments, and actions, and advances a customizable gate model toward a defined terminal outcome.

The engine is standalone. LandThePlane/Astero is the first opinionated vertical.

## Why it exists
Meeting-note products are strong at capture and recap. Interview copilots are strong at answer suggestion. Checkpoint Live focuses on the missing control layer: what has actually been accomplished in the conversation, what remains unproven, and what should happen next.

## Core model
Session → Goal → Gates → Evidence → Open loops → Actions → Terminal state.

Each gate may be pending, active, supported, or manually confirmed. Evidence should retain its transcript source.

## Default interview playbook
QUESTION → POINT → PROOF → RESULT → RELEVANCE → STOP → FOLLOW-UP.

LandThePlane can inject the job description, interviewer context, candidate evidence bank, STAR stories, prior-round unresolved concerns, and stage-specific gates.

## Evidence integrity
Every generated suggestion must be classified as:
1. user-evidence grounded,
2. transcript-derived,
3. generic guidance.

Do not fabricate experience, metrics, credentials, or commitments.

## Implemented MVP
- browser-local live transcript
- microphone recording path
- optional system/tab audio capture in the local build
- local Whisper adapter in the local build
- configurable gate state
- heuristic evidence/gate inference
- action, question, and commitment extraction
- manual gate confirmation
- Markdown/JSON session export
- local persistence

## Next engineering layer
- speaker diarization
- faster-whisper streaming worker
- structured model inference returning gate evidence spans and confidence
- playbook editor
- LandThePlane evidence-bank adapter
- post-session delta: new questions, concerns, commitments, and STAR/Q&A updates
- calendar-triggered session creation with recruiting-email backstop
- Read AI import for meetings already captured elsewhere

## Product boundary
Do not make stealth interview answer generation the core identity. Real-time coaching can exist as one mode, but the reusable product is conversation-to-progress orchestration.
