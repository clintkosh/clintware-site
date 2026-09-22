# EXIT.md — running this project without Lovable

Lovable was used to build this repository. **Lovable is not required at
runtime.** The deployed application is a standard TanStack Start (React 19 +
Vite) app with no proprietary runtime service, no database, no auth provider
and no API keys.

## 1. Clone and build

```sh
git clone <this-repository-url>
cd <repository-name>
npm install
npm run dev     # local dev on http://localhost:8080
npm run build   # production build
```

The build output is a Nitro bundle under `dist/` using the
`cloudflare-module` preset: `dist/server/index.mjs` (Worker entry) and
`dist/client/` (static assets). Nitro also emits the Cloudflare deploy
configuration inside `dist/`, so no hand-written `wrangler.toml` is needed.

## 2. Deploy to Cloudflare

```sh
npm run build
npx wrangler --cwd ./dist deploy     # local check: npx wrangler --cwd ./dist dev
```

Then point your hostname (e.g. `N7crm.clintware.com`) at the Worker via a
Cloudflare custom domain / route. No environment variables need to be set.
`nodejs_compat` is enabled for you by the preset.

### Other hosts

The app is SSR-capable but has no server-side state. Any host that can run a
Nitro output (Node server, Vercel, Netlify, Cloudflare) works; change the Nitro
preset in `vite.config.ts` if you target something other than Cloudflare.

## 3. The one Lovable-authored dependency

`vite.config.ts` imports `@lovable.dev/vite-tanstack-config`, a **devDependency**
that bundles an otherwise ordinary Vite plugin set: TanStack Start, React,
Tailwind v4, tsconfig paths, Nitro (Cloudflare target), `VITE_*` env injection
and the `@` path alias. It is a public npm package, it is build-time only, and
nothing it adds ships as a runtime service dependency.

To drop it entirely, replace `vite.config.ts` with a plain config composing the
same plugins directly:

```ts
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig({
  server: { port: 8080 },
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({ server: { entry: "server" } }),
    nitro(),
    react(),
  ],
});
```

`src/lib/lovable-error-reporting.ts` and `src/lib/error-capture.ts` are small
local files with no network dependency outside a Lovable preview iframe; they
degrade to no-ops elsewhere. They can be deleted along with their import in
`src/routes/__root.tsx` if you prefer a fully neutral tree.

## 4. Data and state today

All workspace state (customers created with the wizard, environment edits,
scenario overrides, tour state) lives in the browser's `localStorage` under the
N7 keys in `src/lib/n7/store.tsx`. Clearing site data resets to the seeded
case in `src/lib/n7/seed.ts`. There is deliberately no database in this
prototype.

## 5. Where future integrations belong

| Concern | Where it goes |
| --- | --- |
| Auth / SSO | A route guard plus a session-reading server function; the workspace routes are the gate point. Do not authenticate in client code. |
| Persistence | Replace the localStorage adapter inside `src/lib/n7/store.tsx` with calls to server functions (`createServerFn`) that talk to your database. The store's public API is already the seam. |
| Clintware MCP / control plane | `src/lib/n7/environment-provider.ts` — implement `controlPlaneProvider` as a **server function** that forwards to your control plane. It currently throws a clear "not configured" error. No endpoint, URL or auth scheme is invented anywhere in this repo. |
| External webhooks / cron | TanStack server routes under `src/routes/api/public/*`, verifying the caller inside the handler. |

**Credential boundary:** no secret, token or third-party credential appears in
client code, and none should be added there. Anything `VITE_`-prefixed is
public. Server-only values are read inside a server function handler.

## 6. Human approval gates preserved

Nothing in this app sends a message, commits a date, accepts risk, or declares
a root cause on its own. Generated environment topologies are labelled
"Proposed from approved sources" and require explicit human approval; customer
messages are drafts for human approval only. Keep these gates when wiring any
real integration.

## Theme architecture

Light / dark / system is handled entirely in `src/lib/n7/theme.tsx`. The choice is
stored in `localStorage` under `n7-theme`, and `THEME_INIT_SCRIPT` is injected into
the document head from `src/routes/__root.tsx` so the right theme is applied before
first paint (no flash on SSR). `ThemeToggle` (`src/components/n7/ThemeToggle.tsx`)
is mounted in the app header and the presentation header, so it is reachable from
every route. No dependency, no runtime service.

## Meeting brief and PDF export

`src/lib/n7/meeting.ts` holds the deterministic brief engine: `computeDelta`
(what changed since the last recorded checkpoint), `computeQuickWins`
(safe pull-forward work when nothing material changed), `buildMeetingBrief`
and `briefToText`. It reads only the local workspace and approved sources —
no network call, no credentials, no model inference.

`src/components/n7/MeetingBrief.tsx` renders the brief into an element with
id `brief-print`. "Export PDF" calls `window.print()`; the `@media print` block
at the end of `src/styles.css` hides all other chrome and forces a light,
print-safe palette regardless of the on-screen theme. There is no PDF library
and no export service to provision.

## Where the control plane plugs in

When Clintware MCP exists, the AI-heavy variants of brief synthesis, document
extraction and environment generation belong behind the same provider seam used
by `src/lib/n7/environment-provider.ts`: a server-side adapter selected by
`providerMode`, called from a TanStack server function so credentials never reach
the browser. Until then, `controlPlane` mode reports "not configured" rather than
simulating a result.

## Local persistence

All workspace state (customers, edits, environment nodes, recorded meeting
checkpoints, scenario overrides) persists in `localStorage` under
`n7-cvos-state-v1`. The seeded case stays authoritative: persisted edits are
layered over the seed on load, "Restore case fact" reverts an individual field,
and "Reset demo" restores the seed exactly. No database is required.