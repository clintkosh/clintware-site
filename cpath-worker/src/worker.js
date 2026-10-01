const RELEASE = "2026-10-01";
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const baseHeaders = {
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": url.pathname === "/" ? "public, max-age=120" : "public, max-age=300",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Content-Type-Options": "nosniff",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
    };

    if (url.pathname === "/resume.pdf") {
      const upstream = await fetch("https://www.clintware.com/work/Clinton_Kosh_Resume.pdf", {
        headers: { "User-Agent": "Clintware-CPath-DeliveryOS/2.0" }
      });
      if (!upstream.ok) return new Response("Resume temporarily unavailable.", { status: 502, headers: baseHeaders });
      const out = new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: upstream.headers });
      out.headers.set("Content-Type", "application/pdf");
      out.headers.set("Content-Disposition", 'inline; filename="Clinton_Kosh_Resume.pdf"');
      out.headers.set("Cache-Control", "public, max-age=300");
      out.headers.set("X-Content-Type-Options", "nosniff");
      out.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
      out.headers.delete("X-Frame-Options");
      out.headers.delete("Content-Security-Policy");
      return out;
    }

    if (url.pathname === "/health" || url.pathname === "/healthz") {
      return new Response(JSON.stringify({
        ok: true,
        surface: "mentor-delivery-accountability-system",
        canonicalUrl: "https://cpath.clintware.com",
        role: "Senior Manager of AI Practice, Claude Corps",
        jobId: "5204061007",
        release: RELEASE,
        storage: "browser-local-demo-only"
      }), { status: 200, headers: { ...baseHeaders, "Content-Type": "application/json; charset=utf-8" }});
    }

    const response = await env.ASSETS.fetch(request);
    const out = new Response(response.body, response);
    for (const [k,v] of Object.entries(baseHeaders)) out.headers.set(k,v);
    if ((out.headers.get("content-type") || "").includes("text/html")) {
      out.headers.set("Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com; img-src 'self' data: https://www.google-analytics.com; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    }
    return out;
  }
};