# LandThePlane Command Center

Private job-search and career operating system at `https://cc.clintware.com`.

## Architecture

- Reuses the mature `projects/dpl-crm` persistence, audit, security, OAuth, and control-plane foundation.
- Materializes a dedicated Worker and Durable Object namespace at build time.
- Requires Clintware Identity with Google as the upstream identity provider.
- Access policy is limited to `clint.kosh@gmail.com` and verified Google identities in the `clintware.com` domain.
- Job-search evidence is synchronized from the existing delegated Google boundary. Raw mailbox content is not committed to source control.
- Application and interview records are stored only in the authenticated Durable Object workspace.
- The search lifecycle can transition an accepted role into an active-job workspace without discarding the historical pipeline.

## Data model

Each company-role process is a company ticket with a `job_profile` record containing status, application date, first response, response time, first interview, compensation evidence or estimate, fit estimate, job-description evidence, next action, and a source timeline. Additional records cover interviews, follow-ups, offers, active-role goals, and performance evidence.

The dashboard separately tracks job-discovery throughput from application/interview conversion so search volume is never presented as application volume.

## Build

```bash
node projects/landtheplane-cc/scripts/materialize.mjs
cd .build/landtheplane-cc
npm install --no-audit --no-fund
npm run check
npx wrangler deploy --dry-run
```
