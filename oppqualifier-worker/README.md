# OppQualifier

OppQualifier is the standalone, local-first opportunity qualification component for LandThePlane.

## MVP capabilities

- Pasted recruiter/job conversation qualification.
- Optional resume/accomplishment text for fit scoring.
- Screenshot OCR in the browser with Tesseract.js.
- Deterministic baseline analysis with no hosted AI API.
- Optional WebLLM inference in-browser via WebGPU.
- Separate scores for engagement confidence, authenticated-path strength, pay/detail plausibility, and candidate fit.
- Next-best verification qualifier.
- Independent search links for recruiter/client/job verification.

## Cost and privacy architecture

The site is deployed as Cloudflare Workers Static Assets. Static asset requests do not invoke a Worker script. Baseline analysis, resume fit scoring, screenshot OCR, and optional WebLLM inference run in the visitor's browser. There is no OpenAI/Anthropic API key or server-side inference endpoint in this MVP.

The optional model is downloaded and cached by the visitor's browser. WebGPU is required for Local AI; the deterministic analyzer remains available without it.

## Regression isolation

This is intentionally a separate deployment at `oppqualifier.clintware.com`. It does not modify `landtheplane-worker/src/index.js` or any existing LandThePlane resume/job/prep-map/Brief Builder handlers.
