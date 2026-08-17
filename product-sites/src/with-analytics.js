import productSites from "./index.js";

const GA_ID = "G-DCY144YM9P";
const GA_MARKUP = `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}', { send_page_view: true });
</script>`;

const ANALYTICS_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'unsafe-inline'",
  "img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com",
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'none'"
].join("; ");

class AnalyticsHead {
  element(element) {
    element.append(GA_MARKUP, { html: true });
  }
}

export default {
  async fetch(request, env, ctx) {
    const response = await productSites.fetch(request, env, ctx);
    const contentType = response.headers.get("Content-Type") || "";

    if (request.method === "HEAD" || response.status !== 200 || !contentType.includes("text/html")) {
      return response;
    }

    const headers = new Headers(response.headers);
    headers.set("Content-Security-Policy", ANALYTICS_CSP);

    const htmlResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });

    return new HTMLRewriter()
      .on("head", new AnalyticsHead())
      .transform(htmlResponse);
  }
};
