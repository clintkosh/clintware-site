# MailTrail

MailTrail is the consolidated Clintware successor to the Lovable projects **JobMail Tracker** and **Job Mail Manager**.

Those Lovable projects never progressed beyond planning/template state, so there is no useful generated application to preserve. Their useful requirements are consolidated here instead of spending Lovable credits rebuilding them.

## Product goal

A local-first job-search email tracker that helps a user organize applications, recruiter replies, interview messages, rejections, offers, follow-ups, and suspicious/commission-only outreach.

Default local UI:

`http://localhost:8787`

Core principle:

> Email stays on the user's machine. SQLite is the source of truth. Spreadsheets are exports, not the database.

## Architecture

- Python
- FastAPI
- SQLite
- APScheduler
- Gmail API + user-owned Google OAuth credentials
- pandas + openpyxl for XLSX export
- simple server-rendered/HTMX UI unless a richer frontend becomes necessary
- optional local LLM adapter later; deterministic rules/templates first
- Docker Compose for reproducible developer install
- PyInstaller/Windows packaging later

## v0.1 scope

- Gmail connector with user-owned OAuth client
- read-only mailbox access by default
- incremental sync/history tracking
- local SQLite database
- rule-based message classification
- categories for Applied / Recruiter Reply / Interview / Rejection / Offer / Follow-up / Suspicious
- local dashboard
- manual reclassification
- local reply-draft templates with Copy to Clipboard
- CSV/XLSX export
- no cloud SaaS dependency
- no telemetry by default

## Deferred

- Outlook/Microsoft Graph
- generic IMAP
- Gmail label write-back
- local Ollama drafting
- OS-keychain token encryption
- installers
- autonomous sending

## Portability

Lovable is not part of the implementation path. Future work should happen directly in GitHub/local development and may use the Clintware MCP/control plane for repository, deployment, OAuth guidance, and other bounded external operations.

See `MIGRATION.md` for the original-project consolidation record.
