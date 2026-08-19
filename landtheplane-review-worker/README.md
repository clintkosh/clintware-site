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
