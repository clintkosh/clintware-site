const CANONICAL_HOST = "n7.clintware.com";
const LEGACY_HOST = "n7case.clintware.com";
const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`;

function securityHeaders(headers) {
  headers.set("x-robots-tag", "noindex, nofollow, noarchive");
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "no-referrer");
  headers.set("cache-control", "no-store");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  headers.set(
    "content-security-policy",
    "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
  );
  return headers;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname === LEGACY_HOST) {
      url.hostname = CANONICAL_HOST;
      url.protocol = "https:";
      url.port = "";
      return new Response(null, {
        status: 308,
        headers: securityHeaders(new Headers({ location: url.toString() }))
      });
    }

    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: "clintware-neuron7-case",
        mode: "candidate-operating-proof",
        canonicalUrl: CANONICAL_ORIGIN,
        legacyUrl: `https://${LEGACY_HOST}`,
        publicViewer: true,
        identityBroker: "https://auth.clintware.com",
        oauthOperatorMode: "planned-not-required-for-review",
        noCustomerData: true
      }, {
        headers: securityHeaders(new Headers())
      });
    }

    const response = await env.ASSETS.fetch(request);
    const headers = securityHeaders(new Headers(response.headers));

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
