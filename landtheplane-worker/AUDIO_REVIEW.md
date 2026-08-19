# LandThePlane interview audio review

## Working alpha capability

LandThePlane now has a second working alpha surface in addition to the local evidence mapper:

- live desktop/system-audio capture through the browser screen-capture API;
- optional separate microphone capture for candidate-specific delivery analysis;
- audio-file upload for previously recorded interviews;
- browser-local acoustic analysis;
- Cloudflare Workers AI transcription;
- structured AI interview review against the supplied target role and candidate evidence;
- transcript display and coaching output;
- no LandThePlane persistence of uploaded audio or generated transcripts in the current Worker.

## Why desktop and microphone are separate

A mixed meeting recording makes candidate-specific delivery scoring unreliable because interviewer speech, room audio, and conferencing audio processing are present in the same signal. Live capture therefore keeps two tracks when permissions and browser support allow:

1. **desktop/system audio** — interviewer and meeting context;
2. **candidate microphone** — candidate speech and delivery signals.

Only audio tracks are recorded. The browser may require selection of a shared screen/window/tab surface to expose desktop audio, but the Worker does not record video.

## Local acoustic signals

The browser attempts to decode the candidate audio and measures observable signal features:

- duration;
- approximate silence ratio;
- volume-dynamics coefficient of variation;
- pitch-variation coefficient of variation from sampled voiced frames;
- clipping ratio;
- a directional delivery-signal score;
- speaking pace after transcription is available.

These measurements are coaching heuristics. They are not emotion, personality, honesty, mental-state, health, or protected-trait inference.

## AI pipeline

### Transcription

Workers AI binding: `AI`

Model:

`@cf/openai/whisper-large-v3-turbo`

The current alpha accepts up to 12 MB per audio track and 22 MB combined per review request.

### Interview review

Model:

`@cf/meta/llama-3.1-8b-instruct-fast`

The review receives:

- interview stage;
- target job description;
- optional resume/evidence context;
- candidate transcript when available;
- interviewer/mixed-context transcript when available;
- measured acoustic signals;
- recording scope;
- optional user notes.

Structured output includes:

- content score;
- role-fit score;
- strengths;
- improvements;
- evidence/fit signals;
- missed opportunities;
- delivery observations;
- practice priorities;
- detected interview questions.

The overall score combines AI-reviewed content/role alignment with the local delivery heuristic when candidate-specific audio signals are available. Scores are directional coaching aids, not hiring predictions or validated employment assessments.

## Privacy and consent boundaries

- Nothing is uploaded merely by recording or selecting a file.
- Audio is sent only after the user clicks **Analyze interview**.
- The current Worker does not write audio, transcripts, or review output to D1, R2, KV, Durable Objects, or another LandThePlane persistent store.
- Public demos should use synthetic or explicitly approved audio/context.
- Users must obtain any required permission to record and comply with applicable law, employer policy, confidentiality obligations, and meeting rules.
- Users should not upload employer-confidential information unless authorized to process it with the service.

## Next audio-specific engineering steps

1. Add authenticated user projects before persistent interview-history storage.
2. Add encrypted, user-controlled storage only after export/deletion/retention controls exist.
3. Add diarization/speaker attribution for mixed recordings rather than pretending mixed-waveform delivery metrics are candidate-specific.
4. Add chunked/resumable upload and transcription for long interviews beyond the current alpha size limit.
5. Store approved review summaries as `InterviewRound`, `QuestionAsked`, `AnswerAttempt`, and `CoachingMetric` objects in the career graph.
6. Feed repeated strengths, missed questions, delivery patterns, and role-fit gaps into future prep without treating one interview as ground truth.
