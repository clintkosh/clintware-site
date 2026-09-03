const BOOKING_URL = "https://koalendar.com/e/meet-with-clinton?embed=true";

const PAGE = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow">
  <meta name="theme-color" content="#07090d">
  <title>Meet with Clinton | Clintware™</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #07090d;
      --panel: #0b1017;
      --border: #25313d;
      --text: #eef7ff;
      --muted: #91a4b8;
      --cyan: #65d9ff;
      --green: #6ef2b2;
      --koalendar-crop: 44px;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: var(--bg); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { min-height: 100dvh; overflow: hidden; color: var(--text); }
    .shell { width: 100%; height: 100dvh; display: grid; grid-template-rows: 54px 48px minmax(0, 1fr); background: var(--bg); }
    .bar { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 0 18px; border-bottom: 1px solid rgba(145,164,184,.15); background: rgba(7,9,13,.98); }
    .brandline { display: flex; align-items: baseline; gap: 14px; min-width: 0; }
    .brand { color: var(--text); text-decoration: none; font: 800 13px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; letter-spacing: .12em; white-space: nowrap; }
    .brand .ware { color: var(--cyan); }
    .purpose { color: var(--muted); font: 700 10px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; letter-spacing: .08em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .slogan { color: var(--green); font: 700 10px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; letter-spacing: .11em; white-space: nowrap; }
    .proof { display: flex; align-items: center; gap: 0; min-width: 0; overflow-x: auto; overflow-y: hidden; scrollbar-width: none; border-bottom: 1px solid rgba(145,164,184,.13); background: var(--panel); }
    .proof::-webkit-scrollbar { display: none; }
    .proof-intro { flex: 0 0 auto; padding: 0 18px; color: var(--cyan); font: 700 10px/48px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; letter-spacing: .09em; text-transform: uppercase; white-space: nowrap; }
    .proof-item { flex: 0 0 auto; height: 24px; display: flex; align-items: baseline; gap: 7px; padding: 0 16px; border-left: 1px solid var(--border); white-space: nowrap; }
    .proof-item strong { color: var(--text); font: 800 12px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; }
    .proof-item span { color: var(--muted); font: 700 9px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; letter-spacing: .05em; text-transform: uppercase; }
    .frame-wrap { position: relative; min-height: 0; overflow: hidden; background: #fff; }
    iframe { position: absolute; left: 0; top: calc(-1 * var(--koalendar-crop)); display: block; width: 100%; height: calc(100% + var(--koalendar-crop)); margin: 0; padding: 0; border: 0; background: #fff; }
    .fallback { position: absolute; inset: 0; display: grid; place-items: center; padding: 24px; background: var(--bg); color: var(--text); text-align: center; z-index: -1; }
    .fallback a { color: var(--cyan); }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
    @media (max-width: 720px) {
      :root { --koalendar-crop: 32px; }
      .shell { grid-template-rows: 48px 42px minmax(0, 1fr); }
      .bar { padding: 0 12px; }
      .purpose { display: none; }
      .slogan { font-size: 9px; }
      .proof-intro { padding: 0 12px; font-size: 9px; line-height: 42px; }
      .proof-item { padding: 0 12px; }
      .proof-item strong { font-size: 11px; }
      .proof-item span { font-size: 8px; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <header class="bar" aria-label="Clintware scheduling">
      <div class="brandline">
        <a class="brand" href="https://www.clintware.com/" target="_blank" rel="noopener noreferrer">CLINT<span class="ware">WARE</span>™</a>
        <span class="purpose">Schedule with Clinton Kosh</span>
      </div>
      <span class="slogan">GO FURTHEST.™</span>
    </header>

    <section class="proof" aria-label="Why Clinton">
      <div class="proof-intro">Customer Success · Technical Ops · AI Workflows</div>
      <div class="proof-item"><strong>+20%</strong><span>Dedrone · renewals</span></div>
      <div class="proof-item"><strong>+25%</strong><span>Dedrone · engagement</span></div>
      <div class="proof-item"><strong>~40→99%</strong><span>CP / Avanan · portfolio visibility</span></div>
      <div class="proof-item"><strong>~$3M</strong><span>CP / Avanan · managed book</span></div>
    </section>

    <section class="frame-wrap" aria-label="Booking calendar">
      <h1 class="sr-only">Schedule with Clinton Kosh</h1>
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
      return Response.json({ ok: true, app: "clintware-meet", mode: "embedded-koalendar", branded: true, crop: 44 }, {
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
