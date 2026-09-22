export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = {
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": url.pathname === "/" ? "public, max-age=120" : "public, max-age=300",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Content-Type-Options": "nosniff"
    };

    if (url.pathname === "/resume.pdf") {
      const upstream = await fetch("https://www.clintware.com/work/Clinton_Kosh_Resume.pdf", {
        headers: { "User-Agent": "Clintware-CPath-Application/1.0" }
      });
      if (!upstream.ok) {
        return new Response("Resume temporarily unavailable.", { status: 502, headers });
      }
      const out = new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: upstream.headers
      });
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