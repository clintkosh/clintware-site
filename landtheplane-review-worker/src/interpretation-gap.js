export const INTERPRETATION_GAP_VERSION = '2026-09-18-gap-v1';

function clampText(value, max) {
  return String(value || '').slice(0, max);
}

function score(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function stringArray(value, maxItems = 8, maxChars = 520) {
  return Array.isArray(value)
    ? value.map((x) => clampText(x, maxChars)).filter(Boolean).slice(0, maxItems)
    : [];
}

function normalizeGap(item) {
  item = item && typeof item === 'object' ? item : {};
  const confidence = ['low', 'moderate', 'high'].includes(item.confidence) ? item.confidence : 'low';
  const category = ['interpretation', 'evidence', 'capability'].includes(item.category)
    ? item.category
    : 'interpretation';
  return {
    category,
    topic: clampText(item.topic, 180),
    likely_intended_signal: clampText(item.likely_intended_signal, 520),
    literal_signal: clampText(item.literal_signal, 520),
    plausible_interviewer_read: clampText(item.plausible_interviewer_read, 520),
    evidence: clampText(item.evidence, 700),
    alternative_explanation: clampText(item.alternative_explanation, 520),
    confidence,
    minimal_repair: clampText(item.minimal_repair, 700),
    preserve_strength: clampText(item.preserve_strength, 420)
  };
}

function normalizeTurningPoint(item) {
  item = item && typeof item === 'object' ? item : {};
  const confidence = ['low', 'moderate', 'high'].includes(item.confidence) ? item.confidence : 'low';
  return {
    moment: clampText(item.moment, 180),
    observed_change: clampText(item.observed_change, 520),
    hypothesis: clampText(item.hypothesis, 520),
    evidence: clampText(item.evidence, 700),
    confidence
  };
}

export function normalizeInterpretationGap(result) {
  result = result && typeof result === 'object' ? result : {};
  const primary = ['none', 'capability', 'evidence', 'interpretation', 'mixed'].includes(result.primary_gap_type)
    ? result.primary_gap_type
    : 'none';

  return {
    version: INTERPRETATION_GAP_VERSION,
    readability_score: score(result.readability_score),
    gap_risk_score: score(result.gap_risk_score),
    primary_gap_type: primary,
    summary: clampText(result.summary, 1200),
    gaps: Array.isArray(result.gaps) ? result.gaps.map(normalizeGap).slice(0, 8) : [],
    turning_points: Array.isArray(result.turning_points)
      ? result.turning_points.map(normalizeTurningPoint).slice(0, 8)
      : [],
    transmission_rules: stringArray(result.transmission_rules, 8, 520),
    next_interview_openers: stringArray(result.next_interview_openers, 6, 520),
    preserve: stringArray(result.preserve, 6, 420),
    lens_note: clampText(result.lens_note, 700)
  };
}

export async function analyzeInterpretationGap(input, env, model) {
  const schema = {
    type: 'object',
    properties: {
      readability_score: { type: 'integer', minimum: 0, maximum: 100 },
      gap_risk_score: { type: 'integer', minimum: 0, maximum: 100 },
      primary_gap_type: {
        type: 'string',
        enum: ['none', 'capability', 'evidence', 'interpretation', 'mixed']
      },
      summary: { type: 'string' },
      gaps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            category: { type: 'string', enum: ['interpretation', 'evidence', 'capability'] },
            topic: { type: 'string' },
            likely_intended_signal: { type: 'string' },
            literal_signal: { type: 'string' },
            plausible_interviewer_read: { type: 'string' },
            evidence: { type: 'string' },
            alternative_explanation: { type: 'string' },
            confidence: { type: 'string', enum: ['low', 'moderate', 'high'] },
            minimal_repair: { type: 'string' },
            preserve_strength: { type: 'string' }
          },
          required: [
            'category',
            'topic',
            'likely_intended_signal',
            'literal_signal',
            'plausible_interviewer_read',
            'evidence',
            'alternative_explanation',
            'confidence',
            'minimal_repair',
            'preserve_strength'
          ]
        }
      },
      turning_points: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            moment: { type: 'string' },
            observed_change: { type: 'string' },
            hypothesis: { type: 'string' },
            evidence: { type: 'string' },
            confidence: { type: 'string', enum: ['low', 'moderate', 'high'] }
          },
          required: ['moment', 'observed_change', 'hypothesis', 'evidence', 'confidence']
        }
      },
      transmission_rules: { type: 'array', items: { type: 'string' } },
      next_interview_openers: { type: 'array', items: { type: 'string' } },
      preserve: { type: 'array', items: { type: 'string' } },
      lens_note: { type: 'string' }
    },
    required: [
      'readability_score',
      'gap_risk_score',
      'primary_gap_type',
      'summary',
      'gaps',
      'turning_points',
      'transmission_rules',
      'next_interview_openers',
      'preserve',
      'lens_note'
    ]
  };

  const system = `You are LandThePlane's Interpretation Gap Engine, a candidate-side communication analysis system informed by industrial-organizational psychology, interview research, communication science, and evidence-based coaching.

Your task is NOT to decide whether the interviewer liked the candidate, diagnose anyone, infer protected traits, infer mental state from voice, or predict hiring outcomes.

Your task is to find moments where a capable candidate's intended signal may have become less readable to the interviewer.

Always distinguish:
1. OBSERVATION: what was actually said or what actually changed in the transcript.
2. INTERPRETATION: a reasonable reading supported by evidence.
3. HYPOTHESIS: a possible interviewer inference that remains uncertain.
4. ALTERNATIVE: another explanation that could fit.
5. REPAIR: the smallest communication change that would make the candidate's real capability easier to read.

Classify each material issue as one of:
- capability: the supplied evidence does not show the required capability;
- evidence: the candidate may have the capability but the interview answer did not substantiate it;
- interpretation: capability/evidence exist but wording, ordering, scope, or conversational dynamics could reasonably cause a different impression.

Prefer interpretation-gap explanations only when the supplied evidence supports the underlying capability. Do not flatter the candidate or assume every rejection is bias.

Use the Minimal Intervention Principle:
- preserve genuine strengths;
- do not sand down personality;
- do not recommend masking or pretending to be someone else;
- change ordering, scoping, framing, or amount of information before changing substance;
- prefer one strong branch first, then deeper detail on interviewer pull;
- make personal ownership explicit before collaboration when ownership could be ambiguous;
- surface result/business impact before architecture when the question is outcome-focused;
- explicitly notice repeated or rephrased interviewer questions because they can indicate an unresolved concern, while acknowledging alternative explanations.

The user may explicitly select a coaching lens. A selected ADHD, autism, AuDHD, or high-bandwidth lens is user-provided context, not something to infer. Use it only to adapt coaching. Never diagnose, validate a diagnosis, or attribute a specific behavior to a condition as fact.

For readability_score, higher means the candidate's intended capability was easier to understand from the interview.
For gap_risk_score, higher means there are stronger transcript-supported signs that wording/ordering/scope could create material misinterpretation.

Every gap must quote or closely identify transcript evidence in the evidence field. If evidence is weak, set confidence low.
Do not invent timestamps that are not present in the transcript.
Do not invent candidate experience.
`;

  const user = `INTERVIEW STAGE
${clampText(input.stage, 120) || '[none]'}

COACHING LENS
${clampText(input.lens, 120) || 'standard'}

TARGET ROLE / JOB
${clampText(input.job, 12000) || '[none]'}

CANDIDATE EVIDENCE / RESUME
${clampText(input.evidence, 12000) || '[none]'}

CANDIDATE TRANSCRIPT
${clampText(input.candidateTranscript, 36000) || '[none]'}

INTERVIEWER / MIXED CONTEXT
${clampText(input.contextTranscript, 36000) || '[none]'}

CANDIDATE NOTES / INTENT
${clampText(input.notes, 4000) || '[none]'}`;

  const out = await env.AI.run(model, {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    temperature: 0.15,
    max_tokens: 2600,
    response_format: {
      type: 'json_schema',
      json_schema: schema
    }
  });

  return normalizeInterpretationGap(out?.response);
}
