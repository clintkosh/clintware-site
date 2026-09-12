import core, { RegistryHub, ProductHub } from "./index.js";

export { RegistryHub, ProductHub };

const JSON_HEADERS = {"content-type":"application/json; charset=utf-8","cache-control":"no-store"};
const json = (value,status=200,extra={}) => new Response(JSON.stringify(value),{status,headers:{...JSON_HEADERS,...extra}});
const bearer = (request) => {
  const h=request.headers.get("authorization")||"";
  return h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : "";
};
const sha256 = async (s) => {
  const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(s||"")));
  return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
};
const safeEq = async (a,b) => {
  if(!a||!b)return false;
  const [x,y]=await Promise.all([sha256(a),sha256(b)]);
  return x===y;
};

const ADMIN_ONLY_REST = new Set([
  "/api/v1/repo/branch",
  "/api/v1/repo/write",
  "/api/v1/deploy",
  "/api/v1/dns/ensure"
]);

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);

    // Product runtime tokens are deliberately limited to telemetry/query APIs.
    // Infrastructure mutations are available to trusted MCP clients through the
    // scoped product manifest, or to the administrative REST credential. This
    // prevents a ProofOS runtime token from becoming a general infrastructure key.
    if(ADMIN_ONLY_REST.has(url.pathname)){
      const expected=String(env.CONTROL_PLANE_ADMIN_TOKEN||"");
      if(!expected||!await safeEq(bearer(request),expected)){
        return json({
          error:"admin_only_rest_action",
          message:"Infrastructure mutations must use the authenticated Clintware MCP control plane or an administrative credential."
        },403);
      }
    }

    return core.fetch(request,env,ctx);
  }
};
