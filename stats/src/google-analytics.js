import { CRM_PORTFOLIO, crmForPage } from "./config.js";

const ANALYTICS_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

function base64Url(value) {
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemToArrayBuffer(pem) {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\s+/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

export function reportingConfiguration(env) {
  const propertyId = String(env.GA_PROPERTY_ID || "").replace(/^properties\//, "").trim();
  const clientEmail = String(env.GA_CLIENT_EMAIL || env.GOOGLE_CLIENT_EMAIL || "").trim();
  const privateKey = String(env.GA_PRIVATE_KEY || env.GOOGLE_PRIVATE_KEY || "").trim();
  return {
    configured: Boolean(propertyId && clientEmail && privateKey),
    propertyId,
    clientEmail,
    privateKey,
  };
}

async function accessToken(config) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(
    JSON.stringify({
      iss: config.clientEmail,
      scope: ANALYTICS_SCOPE,
      aud: TOKEN_ENDPOINT,
      iat: issuedAt,
      exp: issuedAt + 3500,
    }),
  );
  const unsigned = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(config.privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const assertion = `${unsigned}.${base64Url(signature)}`;
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) throw new Error(`Google OAuth returned ${response.status}`);
  const data = await response.json();
  if (!data.access_token) throw new Error("Google OAuth did not return an access token");
  return data.access_token;
}

async function runReport(config, token, body) {
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(config.propertyId)}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) throw new Error(`Google Analytics Data API returned ${response.status}`);
  return response.json();
}

function metric(row, index) {
  return Number(row?.metricValues?.[index]?.value || 0);
}

function dimension(row, index) {
  return String(row?.dimensionValues?.[index]?.value || "");
}

export function summarizeReports(summaryReport, dailyReport, pageReport) {
  const summaryRow = summaryReport?.rows?.[0];
  const summary = {
    activeUsers: metric(summaryRow, 0),
    sessions: metric(summaryRow, 1),
    pageViews: metric(summaryRow, 2),
    events: metric(summaryRow, 3),
  };

  const daily = (dailyReport?.rows || [])
    .map((row) => ({
      date: dimension(row, 0),
      activeUsers: metric(row, 0),
      sessions: metric(row, 1),
      pageViews: metric(row, 2),
    }))
    .sort((left, right) => left.date.localeCompare(right.date));

  const crmViews = Object.fromEntries(CRM_PORTFOLIO.map((crm) => [crm.id, 0]));
  const pages = (pageReport?.rows || []).map((row) => {
    const path = dimension(row, 0);
    const hostname = dimension(row, 1);
    const views = metric(row, 0);
    const activeUsers = metric(row, 1);
    const crm = crmForPage(path, hostname);
    if (crm) crmViews[crm.id] += views;
    return { path, hostname, views, activeUsers, crmId: crm?.id || null };
  });

  return {
    summary,
    daily,
    crmViews,
    topPages: pages.slice(0, 20),
  };
}

export async function fetchAnalytics(env) {
  const config = reportingConfiguration(env);
  if (!config.configured) {
    return {
      status: "not_connected",
      message:
        "GA4 collection is verified. Reporting needs the numeric property ID and a read-only service account.",
    };
  }

  try {
    const token = await accessToken(config);
    const dateRanges = [{ startDate: "30daysAgo", endDate: "today" }];
    const [summaryReport, dailyReport, pageReport] = await Promise.all([
      runReport(config, token, {
        dateRanges,
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
          { name: "eventCount" },
        ],
      }),
      runReport(config, token, {
        dateRanges,
        dimensions: [{ name: "date" }],
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
        ],
        orderBys: [{ dimension: { dimensionName: "date" } }],
        limit: "32",
      }),
      runReport(config, token, {
        dateRanges,
        dimensions: [{ name: "pagePath" }, { name: "hostName" }],
        metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: "1000",
      }),
    ]);
    return { status: "connected", ...summarizeReports(summaryReport, dailyReport, pageReport) };
  } catch (error) {
    console.error("GA4 reporting refresh failed", error instanceof Error ? error.message : error);
    return {
      status: "error",
      message: "GA4 reporting credentials are present, but the read request failed.",
    };
  }
}
