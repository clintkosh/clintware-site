const GA_MEASUREMENT_ID = "G-DCY144YM9P";
const RESERVED = new Set(["api","password","health","favicon.ico","robots.txt"]);
const enc = new TextEncoder();

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

function hex(buffer) {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(value) {
  const out = new Uint8Array(value.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(value.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function secureHeaders(extra = {}) {
  return new Headers({
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    ...extra
  });
}

function json(data, status = 200, extra = {}) {
  const headers = secureHeaders({"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store", ...extra});
  return new Response(JSON.stringify(data), {status, headers});
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = new Set(["https://clintware.com","https://www.clintware.com"]);
  const headers = {};
  if (allowed.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  headers["Vary"] = "Origin";
  headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type";
  headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
  return headers;
}

function randomSlug(length = 5) {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

function validSlug(slug) {
  return /^[A-Za-z0-9_-]{3,48}$/.test(slug) && !RESERVED.has(slug.toLowerCase());
}

function validTarget(value) {
  try {
    const u = new URL(value);
    return (u.protocol === "https:" || u.protocol === "http:") && !["link.clintware.com","clintware.com","www.clintware.com"].includes(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

async function passwordLookup(password, env) {
  if (!env.PASSWORD_PEPPER) throw new Error("PASSWORD_PEPPER is not configured");
  const key = await crypto.subtle.importKey("raw", enc.encode(env.PASSWORD_PEPPER), {name:"HMAC",hash:"SHA-256"}, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(password)));
}

async function passwordHash(password, saltHex) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({name:"PBKDF2",salt:fromHex(saltHex),iterations:180000,hash:"SHA-256"}, key, 256);
  return hex(bits);
}

function constantTimeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function gaSnippet() {
  return '<script async src="https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID + '"></script>' +
    '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config","' + GA_MEASUREMENT_ID + '",{anonymize_ip:true});</script>';
}

function page(title, body) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="robots" content="noindex,nofollow"><title>' + esc(title) + ' | ClintLink</title>' + gaSnippet() +
    '<style>:root{color-scheme:dark;--bg:#070a0f;--panel:#0b1017;--line:#25303c;--text:#edf5fb;--muted:#94a7b8;--accent:#6ef2b2}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.55 "Cascadia Code","Segoe UI Mono",Consolas,monospace}.wrap{width:min(720px,calc(100% - 32px));margin:8vh auto}.brand{font-weight:800;margin-bottom:26px}.brand b{color:var(--accent)}.card{border:1px solid var(--line);background:var(--panel);padding:22px}h1{font-size:22px;margin:0 0 10px}p{color:var(--muted)}input,button{width:100%;padding:12px 13px;margin-top:10px;border:1px solid var(--line);background:#070a0f;color:var(--text);font:inherit}button{background:var(--accent);color:#04110b;border-color:var(--accent);font-weight:800;cursor:pointer}.meta{font-size:12px;color:var(--muted);margin-top:16px}.error{color:#ffb4b4}</style></head><body><main class="wrap"><div class="brand">CLINT<b>WARE</b> / CLINTLINK</div>' + body + '</main></body></html>';
}

function htmlResponse(title, body, status = 200) {
  const headers = secureHeaders({
    "Content-Type":"text/html; charset=utf-8",
    "Cache-Control":"no-store",
    "Content-Security-Policy":"default-src 'self'; style-src 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com; img-src 'self' data: https://www.google-analytics.com; form-action 'self' https://link.clintware.com; frame-ancestors 'none'; base-uri 'none'"
  });
  return new Response(page(title, body), {status, headers});
}

async function recordClick(env, request, link) {
  let referrerHost = null;
  const referrer = request.headers.get("Referer");
  if (referrer) {
    try { referrerHost = new URL(referrer).hostname.slice(0, 255); } catch {}
  }
  const country = String(request.cf?.country || "").slice(0, 8) || null;
  const userAgent = String(request.headers.get("User-Agent") || "").slice(0, 512) || null;
  await env.DB.batch([
    env.DB.prepare("UPDATE links SET click_count = click_count + 1, last_clicked_at = CURRENT_TIMESTAMP WHERE id = ?").bind(link.id),
    env.DB.prepare("INSERT INTO click_events (link_id, country, referrer_host, user_agent) VALUES (?, ?, ?, ?)").bind(link.id, country, referrerHost, userAgent)
  ]);
}

async function getLinkBySlug(env, slug) {
  return env.DB.prepare("SELECT * FROM links WHERE slug = ? AND active = 1 LIMIT 1").bind(slug).first();
}

async function verifyLinkPassword(env, link, password) {
  if (!link.password_hash || !link.password_salt || !password) return false;
  const candidate = await passwordHash(password, link.password_salt);
  return constantTimeEqual(candidate, link.password_hash);
}

function protectedBody(link, error = "") {
  return '<section class="card"><h1>' + esc(link.title || "Password-protected link") + '</h1>' +
    '<p>' + esc(link.summary || "Enter the password to continue.") + '</p>' +
    (error ? '<p class="error">' + esc(error) + '</p>' : '') +
    '<form method="post" action="/' + encodeURIComponent(link.slug) + '"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required autofocus><button type="submit">Open link</button></form>' +
    '<div class="meta">' + Number(link.click_count || 0).toLocaleString() + ' successful opens</div></section>';
}

function infoBody(link) {
  return '<section class="card"><h1>' + esc(link.title || link.slug) + '</h1><p>' + esc(link.summary || "ClintLink shortened URL.") + '</p>' +
    '<div class="meta">Short URL: https://link.clintware.com/' + esc(link.slug) + '<br>' +
    Number(link.click_count || 0).toLocaleString() + ' successful opens<br>' +
    (link.password_hash ? 'Password protected' : 'No password required') + '</div></section>';
}

async function createLink(request, env) {
  const suppliedAdmin = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!env.ADMIN_TOKEN || !constantTimeEqual(suppliedAdmin, String(env.ADMIN_TOKEN))) {
    return json({error:"Unauthorized"}, 401, corsHeaders(request));
  }
  let body;
  try { body = await request.json(); } catch { return json({error:"Invalid JSON"}, 400, corsHeaders(request)); }
  const target = String(body.url || "").trim();
  if (!validTarget(target)) return json({error:"A valid http(s) destination URL is required"}, 400, corsHeaders(request));

  let slug = String(body.slug || "").trim();
  if (slug && !validSlug(slug)) return json({error:"Custom slug must be 3-48 letters, numbers, underscores, or hyphens"}, 400, corsHeaders(request));

  const password = String(body.password || "");
  let password_lookup = null, password_salt = null, password_hash = null;
  if (password) {
    if (password.length < 8) return json({error:"Protected-link passwords must be at least 8 characters"}, 400, corsHeaders(request));
    password_lookup = await passwordLookup(password, env);
    const existing = await env.DB.prepare("SELECT id FROM links WHERE password_lookup = ? LIMIT 1").bind(password_lookup).first();
    if (existing) return json({error:"That password is already assigned to another protected link. Choose a unique password."}, 409, corsHeaders(request));
    password_salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    password_hash = await passwordHash(password, password_salt);
  }

  if (!slug) {
    for (let i = 0; i < 12; i++) {
      const candidate = randomSlug(5);
      const found = await env.DB.prepare("SELECT id FROM links WHERE slug = ? LIMIT 1").bind(candidate).first();
      if (!found) { slug = candidate; break; }
    }
    if (!slug) return json({error:"Could not allocate a short code"}, 503, corsHeaders(request));
  }

  try {
    await env.DB.prepare("INSERT INTO links (slug,target_url,title,summary,password_lookup,password_salt,password_hash,public_stats,active) VALUES (?,?,?,?,?,?,?,?,1)")
      .bind(slug, target, String(body.title || "").slice(0,160) || null, String(body.summary || "").slice(0,500) || null,
        password_lookup, password_salt, password_hash, body.public_stats === false ? 0 : 1).run();
  } catch (e) {
    if (String(e).toLowerCase().includes("unique")) return json({error:"That slug is already in use"}, 409, corsHeaders(request));
    throw e;
  }

  return json({
    slug,
    short_url:"https://link.clintware.com/" + slug,
    info_url:"https://link.clintware.com/" + slug + "/info",
    password_protected:Boolean(password)
  }, 201, corsHeaders(request));
}

async function summary(request, env) {
  const suppliedAdmin = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const admin = Boolean(env.ADMIN_TOKEN && constantTimeEqual(suppliedAdmin, String(env.ADMIN_TOKEN)));
  const sql = admin
    ? "SELECT slug,title,summary,click_count,last_clicked_at,created_at,CASE WHEN password_hash IS NULL THEN 0 ELSE 1 END AS protected FROM links WHERE active = 1 ORDER BY created_at DESC LIMIT 100"
    : "SELECT slug,title,summary,click_count,last_clicked_at,created_at,CASE WHEN password_hash IS NULL THEN 0 ELSE 1 END AS protected FROM links WHERE active = 1 AND public_stats = 1 ORDER BY created_at DESC LIMIT 100";
  const result = await env.DB.prepare(sql).all();
  return json({links:result.results || []}, 200, corsHeaders(request));
}

async function passwordOnlyAccess(request, env, ctx) {
  if (!env.PASSWORD_PEPPER) return htmlResponse("Configuration error", '<section class="card"><h1>Password access unavailable</h1><p>Password access has not been configured yet.</p></section>', 503);
  const form = await request.formData();
  const password = String(form.get("password") || "");
  if (!password) return htmlResponse("Protected link", '<section class="card"><h1>No protected link matched</h1><p>Enter the password again from clintware.com/link.</p></section>', 401);
  const lookup = await passwordLookup(password, env);
  const link = await env.DB.prepare("SELECT * FROM links WHERE password_lookup = ? AND active = 1 LIMIT 1").bind(lookup).first();
  if (!link || !(await verifyLinkPassword(env, link, password))) {
    return htmlResponse("Protected link", '<section class="card"><h1>No protected link matched</h1><p>The password was not recognized.</p></section>', 401);
  }
  ctx.waitUntil(recordClick(env, request, link));
  return Response.redirect(link.target_url, 303);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = decodeURIComponent(url.pathname);

    if (request.method === "OPTIONS" && path.startsWith("/api/")) {
      return new Response(null, {status:204, headers:secureHeaders(corsHeaders(request))});
    }

    if (path === "/health") return json({ok:true,product:"ClintLink"});
    if (path === "/" && request.method === "GET") return Response.redirect("https://www.clintware.com/link/", 302);

    if (path === "/api/links" && request.method === "POST") return createLink(request, env);
    if (path === "/api/summary" && request.method === "GET") return summary(request, env);
    if (path === "/password" && request.method === "POST") return passwordOnlyAccess(request, env, ctx);

    const match = path.match(/^\/([A-Za-z0-9_-]{3,48})(\/info)?$/);
    if (!match) return htmlResponse("Not found", '<section class="card"><h1>Link not found</h1><p>This ClintLink does not exist.</p></section>', 404);

    const slug = match[1];
    const link = await getLinkBySlug(env, slug);
    if (!link) return htmlResponse("Not found", '<section class="card"><h1>Link not found</h1><p>This ClintLink is unavailable.</p></section>', 404);

    if (match[2] === "/info" && request.method === "GET") return htmlResponse(link.title || slug, infoBody(link));

    if (request.method === "GET") {
      if (link.password_hash) return htmlResponse(link.title || "Protected link", protectedBody(link));
      ctx.waitUntil(recordClick(env, request, link));
      return Response.redirect(link.target_url, 302);
    }

    if (request.method === "POST" && link.password_hash) {
      const form = await request.formData();
      const password = String(form.get("password") || "");
      if (await verifyLinkPassword(env, link, password)) {
        ctx.waitUntil(recordClick(env, request, link));
        return Response.redirect(link.target_url, 303);
      }
      return htmlResponse(link.title || "Protected link", protectedBody(link, "Incorrect password."), 401);
    }

    return new Response("Method not allowed", {status:405, headers:secureHeaders({Allow:"GET, POST"})});
  }
};
