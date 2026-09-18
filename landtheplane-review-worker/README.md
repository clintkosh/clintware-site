# LandThePlane Interview Review

**Product:** LandThePlane  
**Positioning:** **LandThePlane: And Hit the Ground Rolling.**  
**Review app:** `https://review.landtheplane.clintware.com/`  
**Career OS:** `https://landtheplane.clintware.com/`

This dedicated Worker provides the interview-recording and post-interview review surface for LandThePlane without replacing the main Career OS Worker or its Brief Builder.

## Working alpha

- record shared desktop/system audio through browser screen capture;
- optionally record the candidate microphone as a separate track;
- upload an existing candidate-only or mixed interview recording;
- compute browser-local acoustic coaching signals;
- transcribe selected audio with Cloudflare Workers AI only after the user clicks Analyze;
- review demonstrated answer content and target-role alignment;
- combine transcript coaching with observable delivery signals;
- show strengths, improvements, role-fit signals, delivery observations, practice priorities, and transcripts.

## Delivery signals

The browser measures:

- duration;
- approximate silence ratio;
- volume-dynamics coefficient of variation;
- sampled pitch-variation coefficient of variation;
- clipping ratio;
- speaking pace after transcription;
- a directional delivery-signal score.

These are communication-coaching heuristics. They are not emotion, personality, honesty, mental-state, health, or protected-trait inference.

## Separate-track design

For live recording, LandThePlane attempts to keep:

1. desktop/system audio for interviewer and meeting context;
2. candidate microphone audio for candidate-specific delivery analysis.

This is preferable to pretending a mixed-speaker waveform contains candidate-only voice characteristics. Mixed recordings are supported but receive an explicit reliability warning and lower delivery weighting.

## AI pipeline

Workers AI binding: `AI`

Transcription model:

`@cf/openai/whisper-large-v3-turbo`

Structured interview-review model:

`@cf/meta/llama-3.1-8b-instruct-fast`

The review receives interview stage, target-role text, optional candidate evidence, transcripts, recording scope, local acoustic metrics, and optional user notes.

## Alpha limits

- 12 MB maximum per audio track;
- 22 MB maximum combined review request;
- live MediaRecorder targets are intentionally compressed so a typical roughly 30-minute interview can fit, but actual file size depends on browser encoding;
- long-form chunking/resumable upload and speaker diarization remain future work.

## Privacy boundary

- recording/selecting a file does not upload it;
- audio is sent only when the user explicitly clicks Analyze interview;
- the current Worker does not write audio, transcripts, or review output to D1, R2, KV, Durable Objects, or another LandThePlane persistent store;
- only non-content operational metadata is logged;
- users must obtain any required permission to record and comply with law, employer policy, confidentiality obligations, and meeting rules.

## Next steps

1. authenticated Career Graph projects;
2. user-controlled encrypted persistence with export/deletion/retention controls;
3. diarization/speaker attribution for mixed uploads;
4. chunked long-interview ingestion;
5. approved interview summaries saved as `InterviewRound`, `QuestionAsked`, `AnswerAttempt`, and `CoachingMetric` objects;
6. longitudinal learning across interviews so repeated strengths, missed questions, fit gaps, and delivery patterns improve future preparation.


## Crucible review behavior

Interview Review follows the LandThePlane Crucible Preparation Standard. Post-round analysis must look for question-scope ambiguity, framework-vs-philosophy misses, self-vs-team confusion, scale/metric/ownership gaps, over-explaining, and interviewer-specific emphasis that should **not** automatically carry into the next company or interviewer.

The review should turn each material miss into a concrete next-round defense while preserving verified evidence and avoiding hiring-outcome predictions.


## Interpretation Gap Engine

The review Worker now includes a first working Interpretation Gap Engine.

It distinguishes three different failure modes:

1. **Capability gap** — supplied evidence does not show the required capability.
2. **Evidence gap** — the candidate may have the capability, but the interview answer did not substantiate it.
3. **Interpretation gap** — capability and evidence exist, but wording, ordering, scope, or conversational dynamics could reasonably make the candidate's signal less readable.

The engine returns:

- readability score;
- interpretation-gap risk;
- primary gap type;
- transcript-supported gap hypotheses;
- alternative explanations;
- confidence levels;
- turning points;
- minimal repairs;
- strengths to preserve;
- transmission rules;
- next-interview opening lines.

The analysis follows a **Minimal Intervention Principle**: preserve the candidate's genuine strengths and change the smallest amount of framing, ordering, scoping, or information density necessary to make the intended capability easier to understand.

### Coaching lenses

The candidate may explicitly select:

- standard evidence-based coaching;
- high-bandwidth / associative-thinking support;
- ADHD-informed support;
- autism-informed support;
- AuDHD-informed support;
- communication support without a diagnosis label.

These are user-selected coaching contexts. LandThePlane does not infer or diagnose a condition from interview audio or transcripts.

### Text-only API

Existing transcripts can be analyzed without an audio upload:

`POST /api/interpretation-gap/analyze`

JSON fields:

```json
{
  "stage": "Hiring manager",
  "lens": "high-bandwidth",
  "job": "Target role text",
  "evidence": "Resume / proof context",
  "candidate_transcript": "Candidate-side transcript",
  "context_transcript": "Interviewer or mixed transcript",
  "notes": "Optional candidate intent/context"
}
```

The response includes an `interpretation_gap` object. This endpoint is intended to support imported transcripts, prior interview archives, Astero/Checkpoint integrations, and future longitudinal learning.

### Analysis boundary

The engine is candidate-side communication coaching, not mind-reading or psychological diagnosis. It separates observation, interpretation, hypothesis, alternatives, and repair; does not predict hiring outcomes; and requires transcript evidence for material claims.
