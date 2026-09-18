const PAGE = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow">
  <meta name="theme-color" content="#07090d">
  <title>Meet with Clinton | Clintware™</title>
  <style>
    :root{color-scheme:dark;--bg:#07090d;--panel:#0b1017;--border:#25313d;--text:#eef7ff;--muted:#91a4b8;--cyan:#65d9ff;--green:#6ef2b2;--danger:#ff9f9f}
    *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    body{min-height:100dvh}.bar{height:54px;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:0 18px;border-bottom:1px solid rgba(145,164,184,.15);background:#07090d}
    .brand{color:var(--text);text-decoration:none;font:800 13px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.12em}.brand .ware{color:var(--cyan)}
    .slogan{color:var(--green);font:700 10px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.11em}
    main{width:min(760px,calc(100% - 28px));margin:0 auto;padding:42px 0 54px}.kicker{color:var(--cyan);font:700 11px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.12em;text-transform:uppercase}
    h1{margin:10px 0 12px;font-size:clamp(28px,5vw,42px);line-height:1.05;letter-spacing:-.03em}.lede{margin:0 0 24px;color:var(--muted);line-height:1.65}
    .notice,.panel{border:1px solid var(--border);background:var(--panel);border-radius:5px}.notice{margin-bottom:16px;padding:12px 14px;color:var(--muted);font-size:13px;line-height:1.5}.notice strong{color:var(--text)}
    .panel{padding:20px}.form{display:grid;gap:14px}.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.field{display:grid;gap:6px}
    label{font-size:12px;font-weight:700}.optional{font-weight:400;color:var(--muted)}input,select,textarea{width:100%;border:1px solid #315163;border-radius:3px;background:#05090e;color:var(--text);padding:11px 12px;font:inherit}
    input:focus,select:focus,textarea:focus{outline:2px solid rgba(101,217,255,.25);outline-offset:1px;border-color:var(--cyan)}textarea{min-height:120px;resize:vertical}
    .button{border:1px solid var(--cyan);border-radius:3px;background:var(--cyan);color:#041016;padding:11px 15px;font:800 12px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}.button:disabled{opacity:.55;cursor:wait}
    .status{display:none;padding:11px 12px;border:1px solid var(--border);border-radius:3px;font-size:13px;line-height:1.5}.status[data-state]{display:block}.status[data-state="success"]{border-color:var(--green)}.status[data-state="error"]{border-color:var(--danger)}
    .small{color:var(--muted);font-size:12px;line-height:1.55}.small a,.fallback a{color:var(--cyan)}.fallback{margin-top:18px;text-align:center;color:var(--muted);font-size:13px}
    @media(max-width:640px){.bar{height:48px;padding:0 12px}.slogan{font-size:9px}main{width:min(100% - 20px,760px);padding:28px 0 40px}.row{grid-template-columns:1fr}.panel{padding:16px}}
  </style>
</head>
<body>
  <header class="bar">
    <a class="brand" href="https://www.clintware.com/">CLINT<span class="ware">WARE</span>™</a>
    <span class="slogan">GO FURTHEST.™</span>
  </header>
  <main>
    <span class="kicker">MEET</span>
    <h1>Schedule a conversation with Clinton.</h1>
    <p class="lede">Send the time that works for you. I’ll confirm the meeting and calendar invite directly.</p>
    <div class="notice"><strong>Scheduling service migration:</strong> Clintware’s calendar is being moved off the previous provider. This request form is the active booking path during the cutover, so your request will not be lost.</div>

    <section class="panel">
      <form id="booking-form" class="form">
        <input type="hidden" name="_subject" value="CLINTWARE MEETING REQUEST — meet.clintware.com">
        <input type="hidden" name="_template" value="table">
        <input type="hidden" name="source" value="meet.clintware.com">
        <div class="row">
          <div class="field"><label for="name">Name</label><input id="name" name="name" autocomplete="name" required></div>
          <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" required></div>
        </div>
        <div class="row">
          <div class="field"><label for="company">Company <span class="optional">optional</span></label><input id="company" name="company" autocomplete="organization"></div>
          <div class="field"><label for="purpose">Purpose</label><select id="purpose" name="purpose" required><option value="">Choose one</option><option>Hiring / interview</option><option>Professional networking</option><option>Product / startup discussion</option><option>Project / consulting discussion</option><option>Other</option></select></div>
        </div>
        <div class="row">
          <div class="field"><label for="preferred">Preferred date & time</label><input id="preferred" name="preferred_time" type="datetime-local" required></div>
          <div class="field"><label for="alternate">Alternate date & time <span class="optional">optional</span></label><input id="alternate" name="alternate_time" type="datetime-local"></div>
        </div>
        <div class="field"><label for="timezone">Timezone</label><input id="timezone" name="timezone" required placeholder="e.g. America/Chicago"></div>
        <div class="field"><label for="message">Anything I should know? <span class="optional">optional</span></label><textarea id="message" name="message" placeholder="Role, agenda, context, links, or anything useful before we meet."></textarea></div>
        <p id="status" class="status" role="status" aria-live="polite"></p>
        <button id="submit" class="button" type="submit">Request meeting</button>
        <p class="small">Submitting sends the request directly to <strong>clint@clintware.com</strong>. A meeting is confirmed when you receive the calendar invitation.</p>
      </form>
    </section>

    <p class="fallback">Prefer email? <a href="mailto:clint@clintware.com?subject=Meeting%20request">clint@clintware.com</a></p>
  </main>
  <script>
    (function(){
      var tz=document.getElementById('timezone');
      try{if(tz&&!tz.value)tz.value=Intl.DateTimeFormat().resolvedOptions().timeZone||'';}catch(_e){}
      var form=document.getElementById('booking-form'),status=document.getElementById('status'),button=document.getElementById('submit');
      form.addEventListener('submit',async function(event){
        event.preventDefault();
        if(!form.reportValidity())return;
        button.disabled=true;button.textContent='Sending…';status.dataset.state='working';status.textContent='Sending your meeting request…';
        var payload=Object.fromEntries(new FormData(form).entries());
        try{
          var response=await fetch('https://formsubmit.co/ajax/clint@clintware.com',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)});
          var data={};try{data=await response.json();}catch(_e){}
          if(!response.ok||data.success===false)throw new Error(data.message||('Submission failed with status '+response.status));
          status.dataset.state='success';status.textContent='Request sent. Watch for a calendar invitation or reply from Clinton.';form.reset();
          try{tz.value=Intl.DateTimeFormat().resolvedOptions().timeZone||'';}catch(_e){}
        }catch(error){
          status.dataset.state='error';status.innerHTML='The form service did not accept the request. Email <a href="mailto:clint@clintware.com?subject=Meeting%20request">clint@clintware.com</a> directly.';
        }finally{button.disabled=false;button.textContent='Request meeting';}
      });
    })();
  </script>
</body>
</html>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true, app: "clintware-meet", mode: "clintware-request-bridge", branded: true }, { headers: { "Cache-Control": "no-store" } });
    }
    return new Response(PAGE, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src https://formsubmit.co; form-action https://formsubmit.co mailto:; img-src 'self' https: data:; base-uri 'none'; frame-ancestors 'self';",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "X-Content-Type-Options": "nosniff"
      }
    });
  }
};
