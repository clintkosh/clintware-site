// Clintware Meet uses Koalendar's official inline widget rather than a raw iframe.
const BOOKING_URL = "https://koalendar.com/e/meet-with-clinton";

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
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; width: 100%; min-height: 100%; background: var(--bg); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { min-height: 100dvh; color: var(--text); }
    .shell { width: 100%; min-height: 100dvh; display: grid; grid-template-rows: 54px 48px minmax(calc(100dvh - 102px), auto); background: var(--bg); }
    .bar { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 0 18px; border-bottom: 1px solid rgba(145,164,184,.15); background: rgba(7,9,13,.98); }
    .brandline { display: flex; align-items: baseline; gap: 14px; min-width: 0; }
    .brand { color: var(--text); text-decoration: none; font: 800 13px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; letter-spacing: .12em; white-space: nowrap; }
    .brand .ware { color: var(--cyan); }
    .purpose { color: var(--muted); font: 700 10px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; letter-spacing: .08em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .slogan { color: var(--green); font: 700 10px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; letter-spacing: .11em; white-space: nowrap; }
    .proof { display: flex; align-items: center; gap: 0; min-width: 0; overflow-x: auto; overflow-y: hidden; scrollbar-width: none; border-bottom: 1px solid rgba(145,164,184,.13); background: var(--panel); }
    .proof::-webkit-scrollbar { display: none; }
    .proof-intro { flex: 0 0 auto; padding: 0 18px; color: var(--cyan); font: 700 10px/48px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; letter-spacing: .09em; text-transform: uppercase; white-space: nowrap; }
    .proof-company { flex: 0 0 auto; height: 30px; display: flex; align-items: center; gap: 13px; padding: 0 18px; border-left: 1px solid var(--border); white-space: nowrap; }
    .company-name { color: var(--cyan); font: 800 10px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; letter-spacing: .08em; text-transform: uppercase; }
    .company-metric { display: inline-flex; align-items: baseline; gap: 5px; color: var(--muted); font: 700 9px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; letter-spacing: .04em; text-transform: uppercase; }
    .company-metric + .company-metric { padding-left: 13px; border-left: 1px solid var(--border); }
    .company-metric strong { color: var(--text); font: 800 12px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; }
    .booking-shell { min-height: calc(100dvh - 102px); width: 100%; overflow: auto; background: var(--bg); }
    #booking-page { width: 100%; min-height: calc(100dvh - 102px); margin: 0; padding: 0; background: var(--bg); }
    #booking-page iframe { display: block; width: 100% !important; min-height: calc(100dvh - 102px) !important; margin: 0 !important; border: 0 !important; background: transparent !important; }
    .fallback { padding: 24px; color: var(--text); text-align: center; }
    .fallback a { color: var(--cyan); }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
    @media (max-width: 720px) {
      .shell { grid-template-rows: 48px 42px minmax(calc(100dvh - 90px), auto); }
      .bar { padding: 0 12px; }
      .purpose { display: none; }
      .slogan { font-size: 9px; }
      .proof-intro { padding: 0 12px; font-size: 9px; line-height: 42px; }
      .proof-company { padding: 0 12px; gap: 10px; }
      .company-name { font-size: 9px; }
      .company-metric { font-size: 8px; }
      .company-metric strong { font-size: 11px; }
      .company-metric + .company-metric { padding-left: 10px; }
      .booking-shell, #booking-page, #booking-page iframe { min-height: calc(100dvh - 90px) !important; }
    }
  </style>
  <script>window.Koalendar=window.Koalendar||function(){(Koalendar.props=Koalendar.props||[]).push(arguments)};</script>
  <script async src="https://koalendar.com/assets/widget.js"></script>
</head>
<body>
  <main class="shell">
    <header class="bar" aria-label="Clintware scheduling">
      <div class="brandline">
        <a class="brand" href="https://www.clintware.com/" target="_blank" rel="noopener noreferrer">CLINT<span class="ware">WARE</span>™</a>
        <span class="purpose">Schedule a conversation with Clinton</span>
      </div>
      <span class="slogan">GO FURTHEST.™</span>
    </header>

    <section class="proof" aria-label="Why Clinton">
      <div class="proof-intro">Hiring · Consulting · Networking</div>
      <div class="proof-company">
        <span class="company-name">Dedrone</span>
        <span class="company-metric"><strong>+20%</strong> renewals</span>
        <span class="company-metric"><strong>+25%</strong> engagement</span>
      </div>
      <div class="proof-company">
        <span class="company-name">Avanan / Check Point</span>
        <span class="company-metric"><strong>~40→99%</strong> portfolio visibility</span>
        <span class="company-metric"><strong>~$3M</strong> managed book</span>
      </div>
    </section>

    <section class="booking-shell" aria-label="Booking calendar">
      <h1 class="sr-only">Schedule a conversation with Clinton Kosh</h1>
      <div id="booking-page"></div>
      <noscript><div class="fallback">JavaScript is required for the scheduler. <a href="${BOOKING_URL}" target="_blank" rel="noopener noreferrer">Open the booking page</a>.</div></noscript>
    </section>
  </main>
  <script>
    Koalendar('init');
    Koalendar('inline', {
      url: '${BOOKING_URL}',
      selector: '#booking-page'
    });
  </script>
</body>
</html>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ ok: true, app: "clintware-meet", mode: "koalendar-inline", branded: true }, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    return new Response(PAGE, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60, s-maxage=300",
        "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://koalendar.com; style-src 'self' 'unsafe-inline' https://koalendar.com; frame-src https://koalendar.com; connect-src https://koalendar.com; img-src 'self' https: data: blob:; font-src https: data:; form-action https://koalendar.com; base-uri 'none'; frame-ancestors 'self';",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "X-Content-Type-Options": "nosniff",
      },
    });
  },
};
