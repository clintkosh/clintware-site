# Migration checklist

## Phase 1 — preserve source
- [ ] Copy application-specific source from Lovable into this directory.
- [ ] Copy Supabase and Drizzle migrations/schema.
- [ ] Do not copy the Lovable `.env` file or secrets.
- [ ] Create `.env.example` using variable names only.

## Phase 2 — remove vendor coupling
- [ ] Replace `@lovable.dev/cloud-auth-js` with direct Supabase OAuth.
- [ ] Remove `src/integrations/lovable`.
- [ ] Replace Lovable build config with standard TanStack Start + Cloudflare Vite config.
- [ ] Replace any Lovable AI gateway calls with a server-side provider adapter.
- [ ] Keep all provider keys server-side.

## Phase 3 — backend ownership
- [ ] Confirm target Supabase/Postgres project is owned outside Lovable.
- [ ] Reapply migrations to the target.
- [ ] Migrate required rows/storage.
- [ ] Verify RLS policies.
- [ ] Verify Google OAuth callback/redirect URLs.
- [ ] Plan user-session/password migration limitations before cutover.

## Phase 4 — validation
- [ ] Independent GitHub build passes.
- [ ] Login and logout work.
- [ ] Google OAuth works.
- [ ] Conversation CRUD works.
- [ ] Memories CRUD/search works.
- [ ] AI chat works through independent provider adapter.
- [ ] Image generation works through independent provider adapter.
- [ ] Shared links work.
- [ ] Telegram/Discord endpoints fail safely unless configured.
- [ ] No Lovable domain/package/runtime is required.

## Phase 5 — retire Lovable
Only after Phases 1–4 pass:
- stop publishing from Lovable;
- remove/retire the Lovable project manually in Lovable;
- retain this migration record.
