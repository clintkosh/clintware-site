export const STYLES = String.raw`
:root {
  color-scheme: dark;
  --bg: #07090d;
  --panel: #0e1219;
  --panel-2: #121824;
  --line: #222b3a;
  --text: #f5f8fc;
  --muted: #8d9aae;
  --cyan: #35d7ff;
  --cyan-soft: rgba(53, 215, 255, 0.12);
  --green: #45e0a8;
  --amber: #ffbf69;
  --red: #ff6b7f;
  --violet: #a78bfa;
  --radius: 18px;
}
* { box-sizing: border-box; }
html { background: var(--bg); scroll-behavior: smooth; }
body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  background:
    radial-gradient(circle at 14% -4%, rgba(53, 215, 255, 0.12), transparent 32rem),
    radial-gradient(circle at 96% 5%, rgba(167, 139, 250, 0.09), transparent 30rem),
    var(--bg);
  color: var(--text);
  font: 500 15px/1.5 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
}
button, input { font: inherit; }
button, a { -webkit-tap-highlight-color: transparent; }
a { color: inherit; }
.hidden { display: none !important; }
.shell { width: min(1240px, calc(100% - 32px)); margin: 0 auto; }
.topbar {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.brand { display: inline-flex; align-items: center; gap: 12px; font-weight: 900; letter-spacing: -.03em; }
.brand-mark {
  width: 34px; height: 34px; display: grid; place-items: center;
  border: 1px solid rgba(53,215,255,.35); border-radius: 10px;
  background: linear-gradient(145deg, rgba(53,215,255,.18), rgba(167,139,250,.10));
  color: var(--cyan); font-size: 12px; letter-spacing: -.05em;
  box-shadow: 0 10px 32px rgba(0,0,0,.28);
}
.brand-word span { color: var(--cyan); }
.private-pill, .status-pill, .tag {
  display: inline-flex; align-items: center; gap: 7px; border-radius: 999px;
  border: 1px solid var(--line); background: rgba(255,255,255,.025);
  color: var(--muted); padding: 6px 10px; font-size: 10px; font-weight: 850;
  text-transform: uppercase; letter-spacing: .09em;
}
.private-pill::before, .status-pill::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--cyan); box-shadow: 0 0 12px var(--cyan); }
.login-wrap { min-height: calc(100vh - 73px); display: grid; place-items: center; padding: 36px 0 64px; }
.login-grid { width: min(940px, 100%); display: grid; grid-template-columns: 1.15fr .85fr; overflow: hidden; border: 1px solid var(--line); border-radius: 26px; background: rgba(14,18,25,.94); box-shadow: 0 42px 120px rgba(0,0,0,.48); }
.login-story { padding: 54px; background: linear-gradient(145deg, rgba(53,215,255,.10), rgba(167,139,250,.045) 50%, transparent); border-right: 1px solid var(--line); }
.eyebrow { color: var(--cyan); text-transform: uppercase; letter-spacing: .15em; font-size: 11px; font-weight: 900; }
h1, h2, h3, p { margin-top: 0; }
.login-story h1 { max-width: 620px; margin: 16px 0; font-size: clamp(38px, 6vw, 68px); line-height: .98; letter-spacing: -.065em; }
.login-story p { max-width: 590px; color: #aab5c6; font-size: 16px; }
.signal-list { display: grid; gap: 12px; margin-top: 36px; }
.signal { display: flex; align-items: center; gap: 10px; color: #c8d1de; font-size: 13px; }
.signal b { color: var(--green); font-size: 16px; }
.login-panel { display: flex; flex-direction: column; justify-content: center; padding: 48px; }
.login-panel h2 { margin: 14px 0 8px; font-size: 24px; letter-spacing: -.035em; }
.login-panel p { margin-bottom: 24px; color: var(--muted); font-size: 13px; }
label { display: block; margin-bottom: 8px; color: #c8d1de; font-size: 11px; text-transform: uppercase; letter-spacing: .11em; font-weight: 850; }
.password-row { position: relative; }
.password-row input {
  width: 100%; padding: 14px 48px 14px 14px; border: 1px solid #2a3547; border-radius: 12px;
  outline: none; background: #080b11; color: #fff;
}
.password-row input:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(53,215,255,.12); }
.reveal { position: absolute; right: 6px; top: 6px; width: 36px; height: 36px; border: 0; border-radius: 8px; background: transparent; color: var(--muted); cursor: pointer; }
.reveal:hover { background: rgba(255,255,255,.05); color: #fff; }
.primary, .secondary, .ghost {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 42px;
  border-radius: 11px; border: 1px solid transparent; padding: 9px 15px; cursor: pointer;
  font-weight: 850; font-size: 12px; transition: transform .15s, border-color .15s, background .15s;
}
.primary { width: 100%; margin-top: 12px; background: linear-gradient(90deg, #24c9ee, #6be4ff); color: #031016; box-shadow: 0 12px 32px rgba(53,215,255,.16); }
.secondary { border-color: #2a3547; background: #111722; color: #dce5f0; }
.ghost { border-color: transparent; background: transparent; color: var(--muted); }
.primary:hover, .secondary:hover, .ghost:hover { transform: translateY(-1px); }
.secondary:hover { border-color: #41506a; background: #151d2a; }
.ghost:hover { color: #fff; background: rgba(255,255,255,.04); }
.primary:disabled, .secondary:disabled { opacity: .6; cursor: wait; transform: none; }
.form-error { min-height: 20px; padding-top: 8px; color: #ff91a0; font-size: 12px; }
.fine-print { margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--line); color: #68758a; font-size: 10px; line-height: 1.55; }
.dashboard { padding: 34px 0 80px; }
.dash-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 26px; }
.dash-head h1 { margin: 7px 0 7px; font-size: clamp(30px, 4vw, 48px); line-height: 1; letter-spacing: -.055em; }
.dash-head p { color: var(--muted); margin: 0; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.refresh-icon { display: inline-block; font-size: 15px; }
.loading .refresh-icon { animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.notice { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 20px; padding: 14px 16px; border: 1px solid rgba(255,191,105,.28); border-radius: 14px; background: rgba(255,191,105,.07); color: #f4d9ad; font-size: 12px; }
.notice strong { display: block; margin-bottom: 2px; color: #ffe9c6; }
.notice .dot { flex: 0 0 auto; width: 8px; height: 8px; margin-top: 5px; border-radius: 50%; background: var(--amber); box-shadow: 0 0 14px rgba(255,191,105,.65); }
.metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
.metric, .panel { border: 1px solid var(--line); border-radius: var(--radius); background: linear-gradient(180deg, rgba(18,24,36,.92), rgba(12,16,23,.96)); box-shadow: 0 16px 50px rgba(0,0,0,.16); }
.metric { min-height: 136px; padding: 18px; position: relative; overflow: hidden; }
.metric-cyan { --metric-color: #35d7ff; }
.metric-green { --metric-color: #45e0a8; }
.metric-violet { --metric-color: #a78bfa; }
.metric-amber { --metric-color: #ffbf69; }
.metric::after { content: ""; position: absolute; width: 92px; height: 92px; right: -34px; bottom: -34px; border-radius: 50%; background: var(--metric-color, var(--cyan)); opacity: .08; filter: blur(4px); }
.metric-label { color: var(--muted); font-size: 10px; font-weight: 850; text-transform: uppercase; letter-spacing: .1em; }
.metric-value { margin: 13px 0 5px; font-size: 32px; line-height: 1; letter-spacing: -.05em; font-weight: 900; }
.metric-note { color: #748196; font-size: 11px; }
.grid { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(300px, .75fr); gap: 14px; margin-bottom: 14px; }
.panel { padding: 20px; min-width: 0; }
.panel-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.panel h2 { margin: 0 0 4px; font-size: 16px; letter-spacing: -.025em; }
.panel-sub { color: var(--muted); font-size: 11px; }
.chart { min-height: 250px; display: grid; align-items: end; }
.chart-empty { min-height: 250px; display: grid; place-items: center; border: 1px dashed #293347; border-radius: 13px; color: #6f7c90; text-align: center; padding: 24px; }
.chart svg { display: block; width: 100%; height: 250px; overflow: visible; }
.chart-grid { stroke: #202a39; stroke-width: 1; }
.chart-line { fill: none; stroke: var(--cyan); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; filter: drop-shadow(0 0 6px rgba(53,215,255,.35)); }
.chart-area { fill: url(#area); }
.chart-dot { fill: var(--bg); stroke: var(--cyan); stroke-width: 2; }
.chart-label { fill: #758399; font-size: 10px; }
.top-pages { display: grid; gap: 10px; }
.page-row { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 12px; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,.055); }
.page-row:last-child { border-bottom: 0; }
.page-path { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #d5deea; font: 700 11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; }
.page-count { color: var(--cyan); font-size: 12px; font-weight: 900; }
.portfolio { padding: 0; overflow: hidden; }
.portfolio .panel-head { padding: 20px 20px 0; }
.table-head, .crm-row { display: grid; grid-template-columns: minmax(210px,1.2fr) minmax(150px,.8fr) minmax(180px,1fr) 100px 90px; gap: 16px; align-items: center; padding: 13px 20px; }
.table-head { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); background: rgba(255,255,255,.02); color: #6f7c90; font-size: 9px; text-transform: uppercase; letter-spacing: .11em; font-weight: 900; }
.crm-row { border-bottom: 1px solid rgba(255,255,255,.055); min-height: 80px; }
.crm-row:last-child { border-bottom: 0; }
.crm-identity { display: flex; align-items: center; gap: 12px; min-width: 0; }
.crm-mark { flex: 0 0 auto; width: 38px; height: 38px; display: grid; place-items: center; border-radius: 11px; border: 1px solid color-mix(in srgb, var(--crm-color) 40%, #283244); background: color-mix(in srgb, var(--crm-color) 12%, transparent); color: var(--crm-color); font-size: 11px; font-weight: 950; }
.crm-abnormal { --crm-color: #ff4f8b; }
.crm-zscaler { --crm-color: #45c4ff; }
.crm-dtex { --crm-color: #34d6a4; }
.crm-nvidia { --crm-color: #8de047; }
.crm-proofpoint { --crm-color: #f2a93b; }
.crm-civilgrid { --crm-color: #a78bfa; }
.crm-renewnudge { --crm-color: #ff6b6b; }
.crm-name { font-weight: 850; font-size: 13px; }
.crm-host { color: #6f7c90; font: 500 10px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.namespace code { color: #b7c4d5; background: #080b11; border: 1px solid #242e3e; border-radius: 7px; padding: 4px 7px; font-size: 10px; }
.coverage { color: #9da9ba; font-size: 11px; }
.coverage b { display: block; color: var(--green); font-size: 9px; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 2px; }
.live { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 850; }
.live::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: var(--muted); }
.live.up { color: #89ebc5; }
.live.up::before { background: var(--green); box-shadow: 0 0 10px rgba(69,224,168,.5); }
.live.down { color: #ff9aa8; }
.live.down::before { background: var(--red); }
.views { text-align: right; color: #e7edf6; font-weight: 900; font-variant-numeric: tabular-nums; }
.align-right { text-align: right; }
.views small { display: block; color: #68758a; font-size: 9px; font-weight: 650; }
.footer { display: flex; justify-content: space-between; gap: 20px; padding: 26px 0; border-top: 1px solid rgba(255,255,255,.055); color: #647186; font-size: 10px; }
.skeleton { position: relative; overflow: hidden; color: transparent !important; background: #151c28; border-radius: 7px; }
.skeleton::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,.055), transparent); animation: shimmer 1.25s infinite; }
@keyframes shimmer { to { transform: translateX(100%); } }
@media (max-width: 980px) {
  .metrics { grid-template-columns: repeat(2, minmax(0,1fr)); }
  .grid { grid-template-columns: 1fr; }
  .login-grid { grid-template-columns: 1fr; width: min(600px,100%); }
  .login-story { border-right: 0; border-bottom: 1px solid var(--line); padding: 40px; }
  .login-story h1 { font-size: 46px; }
  .signal-list { grid-template-columns: 1fr 1fr; }
  .table-head { display: none; }
  .crm-row { grid-template-columns: minmax(210px,1fr) 130px 100px; }
  .crm-row .coverage { display: none; }
  .crm-row .namespace { display: none; }
}
@media (max-width: 680px) {
  .shell { width: min(100% - 22px, 1240px); }
  .topbar { min-height: 64px; }
  .private-pill { max-width: 140px; overflow: hidden; white-space: nowrap; }
  .login-wrap { min-height: calc(100vh - 65px); padding: 18px 0 36px; }
  .login-grid { border-radius: 20px; }
  .login-story { padding: 30px 24px; }
  .login-story h1 { font-size: 40px; }
  .signal-list { grid-template-columns: 1fr; margin-top: 24px; }
  .login-panel { padding: 30px 24px; }
  .dashboard { padding-top: 24px; }
  .dash-head { display: block; }
  .actions { justify-content: flex-start; margin-top: 18px; }
  .metrics { grid-template-columns: 1fr 1fr; gap: 9px; }
  .metric { min-height: 120px; padding: 15px; }
  .metric-value { font-size: 27px; }
  .panel { padding: 16px; border-radius: 15px; }
  .portfolio { padding: 0; }
  .portfolio .panel-head { padding: 16px 16px 0; }
  .crm-row { grid-template-columns: 1fr auto; padding: 15px 16px; gap: 12px; }
  .crm-row .live { grid-column: 1 / 2; padding-left: 50px; margin-top: -15px; }
  .crm-row .views { grid-column: 2; grid-row: 1 / span 2; }
  .footer { display: block; }
  .footer span { display: block; margin-bottom: 5px; }
}
@media (max-width: 430px) {
  .brand-word { font-size: 14px; }
  .private-pill { font-size: 8px; padding: 5px 8px; }
  .metrics { grid-template-columns: 1fr; }
  .metric { min-height: 108px; }
  .dash-head h1 { font-size: 36px; }
}
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; transition-duration: .01ms !important; } }
`;
