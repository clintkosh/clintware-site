import app, { CrmHub } from "./index.js";

export { CrmHub };

function authenticatedControlPlane(binding, token) {
  if (!binding || !token) return binding;
  return {
    async fetch(input, init = {}) {
      const request = input instanceof Request ? input : new Request(input, init);
      const headers = new Headers(request.headers);
      headers.set("authorization", `Bearer ${token}`);
      const authenticated = new Request(request, { headers });
      return binding.fetch(authenticated);
    }
  };
}

export default {
  async fetch(request, env, ctx) {
    const scopedEnv = {
      ...env,
      CONTROL_PLANE: authenticatedControlPlane(
        env.CONTROL_PLANE,
        env.VIDCRM_CONTROL_PLANE_TOKEN
      )
    };
    return app.fetch(request, scopedEnv, ctx);
  }
};
