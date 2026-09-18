export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: "clintware-neuron7-case",
        mode: "candidate-operating-proof",
        noCustomerData: true
      }, {
        headers: {
          "cache-control": "no-store",
          "x-robots-tag": "noindex, nofollow, noarchive"
        }
      });
    }

    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set("x-robots-tag", "noindex, nofollow, noarchive");
    headers.set("x-content-type-options", "nosniff");
    headers.set("referrer-policy", "no-referrer");
    headers.set("cache-control", "no-store");
    headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
    headers.set("content-security-policy", "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
