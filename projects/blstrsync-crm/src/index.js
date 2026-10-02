export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: "clintware-blstrsync-crm",
        storage: "browser-local",
        databaseRowsPerDemoSession: 0,
        durableObjects: false,
        system: "super3-synergy",
        version: 1
      }, { headers: { "cache-control": "no-store" } });
    }
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set("x-robots-tag", "noindex, nofollow, noarchive");
    headers.set("referrer-policy", "strict-origin-when-cross-origin");
    headers.set("x-content-type-options", "nosniff");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
};
