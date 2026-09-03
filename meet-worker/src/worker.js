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
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #fff; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { min-height: 100dvh; overflow: hidden; }
    .shell { position: fixed; inset: 0; width: 100%; height: 100dvh; margin: 0; padding: 0; background: #fff; }
    .frame-wrap { position: absolute; inset: 0; margin: 0; padding: 0; background: #fff; }
    iframe { display: block; width: 100%; height: 100%; margin: 0; padding: 0; border: 0; background: #fff; }
    .fallback { position: absolute; inset: 0; display: grid; place-items: center; padding: 24px; background: #0b0d10; color: #f5f7f9; text-align: center; z-index: -1; }
    .fallback a { color: #fff; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
  </style>
</head>
<body>
  <main class="shell">
    <h1 class="sr-only">CLINTWARE™ · GO FURTHEST.™ · Schedule with Clinton</h1>
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
