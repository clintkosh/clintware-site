const UPSTREAM = "https://mcp.clintware.com";
const JSON_HEADERS = {"content-type":"application/json; charset=utf-8","cache-control":"no-store"};

function json(value, status=200, extra={}) {
  return new Response(JSON.stringify(value), {status, headers:{...JSON_HEADERS,...extra}});
}

async function sha256(value) {
  const data = new TextEncoder().encode(String(value || ""));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2,"0")).join("");
}

async function safeEq(a,b) {
  if (!a || !b) return false;
  const [x,y] = await Promise.all([sha256(a), sha256(b)]);
  return x === y;
}

function clientToken(request) {
  return request.headers.get("x-clintware-mcp-token") ||
         request.headers.get("x-api-key") ||
         "";
}

function log(event, extra={}) {
  console.log(JSON.stringify({
    event,
    service:"clintware-pplx-mcp-bridge",
    time:new Date().toISOString(),
    ...extra
  }));
}

export default {
  async fetch(request, env) {
    const started = Date.now();
    const url = new URL(request.url);
    const requestId = request.headers.get("cf-ray") || crypto.randomUUID();

    if (url.pathname === "/health") {
      try {
        const upstream = await fetch(`${UPSTREAM}/health`, {headers:{accept:"application/json"}});
        const body = await upstream.text();
        let upstreamJson = null;
        try { upstreamJson = JSON.parse(body); } catch {}
        const ok = upstream.ok && upstreamJson?.ok === true;
        log("health", {request_id:requestId, ok, upstream_status:upstream.status, latency_ms:Date.now()-started});
        return json({
          ok,
          service:"Clintware Perplexity MCP Bridge",
          upstream_service:upstreamJson?.service || null,
          upstream_ok:Boolean(upstreamJson?.ok),
          auth_header:"x-clintware-mcp-token",
          fallback_header:"x-api-key",
          time:new Date().toISOString()
        }, ok ? 200 : 503);
      } catch (error) {
        log("health_error", {request_id:requestId, error:String(error), latency_ms:Date.now()-started});
        return json({ok:false,error:"upstream_unavailable"},503);
      }
    }

    if (url.pathname !== "/mcp") return json({error:"not_found"},404);

    const supplied = clientToken(request);
    const valid = await safeEq(supplied, env.UPSTREAM_MCP_TOKEN);
    if (!valid) {
      log("auth_rejected", {
        request_id:requestId,
        method:request.method,
        path:url.pathname,
        custom_header_present:Boolean(request.headers.get("x-clintware-mcp-token")),
        api_key_header_present:Boolean(request.headers.get("x-api-key")),
        authorization_header_present:Boolean(request.headers.get("authorization")),
        user_agent:(request.headers.get("user-agent") || "").slice(0,180),
        latency_ms:Date.now()-started
      });
      return json({error:"unauthorized",hint:"Use X-Clintware-MCP-Token or X-API-Key"},401,{"www-authenticate":"X-Clintware-MCP-Token"});
    }

    const upstreamUrl = new URL(request.url);
    upstreamUrl.protocol = "https:";
    upstreamUrl.hostname = "mcp.clintware.com";
    upstreamUrl.port = "";
    upstreamUrl.pathname = "/mcp";

    const headers = new Headers(request.headers);
    headers.delete("x-clintware-mcp-token");
    headers.delete("x-api-key");
    headers.set("authorization", `Bearer ${env.UPSTREAM_MCP_TOKEN}`);
    headers.set("host", "mcp.clintware.com");
    headers.set("x-clintware-bridge", "perplexity");
    headers.set("x-clintware-request-id", requestId);

    try {
      const upstreamResponse = await fetch(upstreamUrl.toString(), {
        method:request.method,
        headers,
        body:["GET","HEAD"].includes(request.method) ? undefined : request.body,
        redirect:"manual"
      });

      const responseHeaders = new Headers(upstreamResponse.headers);
      responseHeaders.set("x-clintware-bridge", "perplexity");
      responseHeaders.set("x-clintware-request-id", requestId);

      log("proxy_complete", {
        request_id:requestId,
        method:request.method,
        status:upstreamResponse.status,
        content_type:upstreamResponse.headers.get("content-type") || "",
        user_agent:(request.headers.get("user-agent") || "").slice(0,180),
        latency_ms:Date.now()-started
      });

      return new Response(upstreamResponse.body, {
        status:upstreamResponse.status,
        statusText:upstreamResponse.statusText,
        headers:responseHeaders
      });
    } catch (error) {
      log("proxy_error", {request_id:requestId,error:String(error),latency_ms:Date.now()-started});
      return json({error:"upstream_proxy_error"},502);
    }
  }
};
