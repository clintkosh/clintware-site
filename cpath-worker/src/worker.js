export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = {
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": url.pathname === "/" ? "public, max-age=120" : "public, max-age=300",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Content-Type-Options": "nosniff"
    };

    if (url.pathname === "/health" || url.pathname === "/healthz") {
      return new Response(JSON.stringify({
        ok: true,
        surface: "role-specific-portfolio",
        canonicalUrl: "https://cpath.clintware.com",
        release: "2026-09-19"
      }), { status: 200, headers: { ...headers, "Content-Type": "application/json; charset=utf-8" }});
    }

    const response = await env.ASSETS.fetch(request);
    const out = new Response(response.body, response);
    for (const [k,v] of Object.entries(headers)) out.headers.set(k,v);
    return out;
  }
};