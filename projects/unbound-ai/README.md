# Unbound AI Assistant — migration workspace

This directory is the Clintware-controlled migration target for the Lovable project **Unbound AI Assistant**.

Lovable project ID: `0bf96715-c266-4fb1-8de8-bbc843f370a6`

## Current audit

Unlike the other highlighted shells, this project contains real application and backend work:

- authenticated AI chat
- Supabase-backed conversations/messages
- persistent memories and vector-search schema
- profile/settings
- image-generation path
- shared conversations
- Telegram/Discord bot-linking and webhook code
- Supabase migrations
- Google/email auth UI

The current source also contains vendor coupling that must be removed before Lovable can be retired safely:

- `@lovable.dev/cloud-auth-js` for Google OAuth
- Lovable-specific auth wrapper under `src/integrations/lovable/`
- Lovable-era AI gateway/runtime assumptions
- an enabled Supabase backend whose production ownership/data must be verified before deletion

## Migration rule

Do **not** delete the Lovable project yet. Source and migrations can be exported without credits through MCP, but auth, backend ownership, any persisted data, and AI provider routing must be verified under Clintware-owned infrastructure before retirement.

## Target

- GitHub/Clintware source of truth
- Cloudflare web/runtime where appropriate
- owner-controlled Supabase or equivalent Postgres/Auth/Storage
- direct Google OAuth through the owner-controlled auth backend
- AI provider adapters behind server-side Clintware/control-plane boundaries
- no Lovable runtime dependency
- secrets only in server-side deployment configuration

See `MIGRATION.md` for the staged cutover checklist.
