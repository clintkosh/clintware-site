const APPLICATION_SUNSET_AT = Date.parse("2026-10-22T05:00:00Z");

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = {
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": url.pathname === "/" ? "public, max-age=120" : "public, max-age=300",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Content-Type-Options": "nosniff"
    };

    const isExpired = Date.now() >= APPLICATION_SUNSET_AT;

    if (isExpired && url.pathname !== "/health" && url.pathname !== "/healthz") {
      const expiredHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#11183d">
<title>Application no longer active</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0c1032;color:#fff;font-family:"Avenir Next",Avenir,"Helvetica Neue",Helvetica,Arial,sans-serif}
  main{width:min(720px,calc(100% - 40px));border:1px solid rgba(255,255,255,.14);background:#111542;padding:36px}
  .k{font:700 11px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase;color:#67d8ef}
  h1{font-size:clamp(34px,6vw,58px);line-height:1;letter-spacing:-.045em;margin:14px 0 18px}
  p{color:#c7cce0;font-size:16px;line-height:1.6;margin:0 0 22px}
  a{color:#8bdff3;font-weight:700}
  .redirect{margin-top:18px;font-size:13px;color:#9ca3c7}
</style>
</head>
<body>
<main>
  <div class="k">Clinton Kosh · role-specific application</div>
  <h1>This role-specific application page is no longer active.</h1>
  <p>The temporary application microsite has been retired after its planned availability window.</p>
  <a href="https://www.clintware.com/work/" id="portfolio-link">View Clinton's portfolio</a>
  <p class="redirect">Redirecting to the portfolio in <strong id="countdown">8</strong> seconds…</p>
</main>
<script>
  (function () {
    const target = "https://www.clintware.com/work/";
    let remaining = 8;
    const el = document.getElementById("countdown");
    const timer = setInterval(() => {
      remaining -= 1;
      if (el) el.textContent = String(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        window.location.replace(target);
      }
    }, 1000);
  })();
</script>
</body>
</html>`;
      return new Response(expiredHtml, {
        status: 410,
        headers: {
          ...headers,
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300"
        }
      });
    }

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
        release: "2026-09-22",
        sunsetAt: "2026-10-22T05:00:00Z",
        expired: Date.now() >= APPLICATION_SUNSET_AT
      }), { status: 200, headers: { ...headers, "Content-Type": "application/json; charset=utf-8" }});
    }

    const response = await env.ASSETS.fetch(request);
    const out = new Response(response.body, response);
    for (const [k,v] of Object.entries(headers)) out.headers.set(k,v);
    return out;
  }
};