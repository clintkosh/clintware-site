export const GA_MEASUREMENT_ID = "G-DCY144YM9P";

export const CRM_PORTFOLIO = Object.freeze([
  {
    id: "abnormal",
    name: "Abnormal",
    shortName: "AN",
    hostname: "an.clintware.com",
    url: "https://an.clintware.com/",
    pathPrefix: "/an/",
    coverage: "Primary routes + every account tab",
    platform: "Cloudflare Worker",
    color: "#ff4f8b",
  },
  {
    id: "zscaler",
    name: "Zscaler",
    shortName: "ZS",
    hostname: "zsc.clintware.com",
    url: "https://zsc.clintware.com/",
    pathPrefix: "/zsc/",
    coverage: "Primary routes + every account tab",
    platform: "Cloudflare Worker",
    color: "#45c4ff",
  },
  {
    id: "dtex",
    name: "DTEX",
    shortName: "DX",
    hostname: "summertime-crmdemo.clintware.com",
    url: "https://summertime-crmdemo.clintware.com/",
    pathPrefix: "/dtex/",
    coverage: "All 9 workspace views",
    platform: "Cloudflare Pages",
    color: "#34d6a4",
  },
  {
    id: "nvidia",
    name: "NVIDIA",
    shortName: "NV",
    hostname: "nv.clintware.com",
    url: "https://nv.clintware.com/",
    pathPrefix: "/nv/",
    coverage: "All 6 workspaces",
    platform: "ChatGPT Sites",
    color: "#8de047",
  },
  {
    id: "proofpoint",
    name: "Proofpoint",
    shortName: "PP",
    hostname: "pp.clintware.com",
    url: "https://pp.clintware.com/",
    pathPrefix: "/pp/",
    coverage: "All 4 workspaces",
    platform: "ChatGPT Sites",
    color: "#f2a93b",
  },
  {
    id: "civilgrid",
    name: "CivilGrid",
    shortName: "CG",
    hostname: "cg-csm.clintware.com",
    url: "https://cg-csm.clintware.com/",
    pathPrefix: "/cg/",
    coverage: "Every view + all 6 account tabs",
    platform: "ChatGPT Sites",
    color: "#a78bfa",
  },
  {
    id: "renewnudge",
    name: "RenewNudge",
    shortName: "RN",
    hostname: "renewnudge.clintware.com",
    url: "https://renewnudge.clintware.com/",
    pathPrefix: "/renewnudge/",
    coverage: "Every public, auth, app, and account route",
    platform: "Lovable",
    color: "#ff6b6b",
  },
]);

export function crmForPage(pathname, hostname = "") {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const normalizedHost = hostname.toLowerCase();
  return CRM_PORTFOLIO.find(
    (crm) =>
      normalizedPath === crm.pathPrefix.slice(0, -1) ||
      normalizedPath.startsWith(crm.pathPrefix) ||
      normalizedHost === crm.hostname,
  );
}
