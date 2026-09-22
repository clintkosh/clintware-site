# Migration record

Source Lovable projects:

- JobMail Tracker — `be8d2d6b-e35b-4aa1-94b6-69c5ffd77534`
- Job Mail Manager — `18c3aae3-b5c5-41b3-bb6c-4bc58b9be8de`

Audit result on 2026-09-22:

- both projects contained the standard Lovable/TanStack template shell;
- neither contained a completed job-mail application;
- JobMail Tracker preserved the stronger local-first architecture: Python + FastAPI + SQLite, Gmail API/OAuth, template drafting, XLSX export;
- Job Mail Manager was the earlier Gmail-plugin/local-AI brainstorming precursor.

Migration decision:

1. Do not spend Lovable credits implementing either template.
2. Consolidate useful requirements into MailTrail here.
3. Build directly under Clintware-controlled GitHub/local infrastructure.
4. Keep OAuth credentials user-owned and outside client code.
5. Retire the two Lovable projects only after this preservation record is confirmed.
