const BOOKING_URL = "https://koalendar.com/e/meet-with-clinton?embed=true";

const PAGE = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow">
  <meta name="theme-color" content="#0b0d10">
  <title>Meet with Clinton | Clintware™</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    html, body { margin: 0; width: 100%; height: 100%; background: #0b0d10; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { min-height: 100dvh; overflow: hidden; }
    .shell { width: 100%; height: 100dvh; display: grid; grid-template-rows: 54px minmax(0, 1fr); background: #0b0d10; }
    .bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 0 18px; border-bottom: 1px solid rgba(255,255,255,.10); background: rgba(11,13,16,.97); color: #f5f7f9; }
    .brand { display: flex; align-items: baseline; gap: 12px; min-width: 0; }
    .name { font-size: 14px; font-weight: 700; letter-spacing: .08em; white-space: nowrap; }
    .purpose { font-size: 13px; color: #aeb6c0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .slogan { font-size: 11px; font-weight: 650; letter-spacing: .09em; color: #8f99a5; white-space: nowrap; }
    .frame-wrap { position: relative; min-height: 0; background: #fff; }
    iframe { display: block; width: 100%; height: 100%; border: 0; background: #fff; }
    .fallback { position: absolute; inset: 0; display: grid; place-items: center; padding: 24px; background: #0b0d10; color: #f5f7f9; text-align: center; z-index: -1; }
    .fallback a { color: #fff; }
    @media (max-width: 640px) {
      .shell { grid-template-rows: 48px minmax(0, 1fr); }
      .bar { padding: 0 12px; }
      .purpose, .slogan { display: none; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <header class="bar" aria-label="Clintware scheduling">
      <div class="brand">
        <span class="name">CLINTWARE™</span>
        <span class="purpose">Schedule with Clinton</span>
      </div>
      <span class="slogan">GO FURTHEST.™</span>
    </header>
    <section class="frame-wrap" aria-label="Booking calendar">
      <div class="fallback">If the calendar does not appear, <a href="https://koalendar.com/e/meet-with-clinton" target="_blank" rel="noopener noreferrer">open the booking page</a>.</div>
      <iframe
        src="${BOOKING_URL}"
        title="Schedule with Clinton"
        loading="eager"
        referrerpolicy="strict-origin-when-cross-origin"
        allow="clipboard-write"
      ></iframe>
    </section>
  </main>
</body>
</html>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ ok: true, app: "clintware-meet", mode: "embedded-koalendar" }, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    return new Response(PAGE, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60, s-maxage=300",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; frame-src https://koalendar.com; base-uri 'none'; form-action 'none'; frame-ancestors 'self';",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "X-Content-Type-Options": "nosniff",
      },
    });
  },
};
