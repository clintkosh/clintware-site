# ClintCal upstream

ClintCal is the Clintware-owned self-hosted scheduling distribution built on [Cal.diy](https://github.com/calcom/cal.diy).

## License

Cal.diy is distributed under the MIT License. ClintCal retains the upstream license and attribution requirements for all Cal.diy-derived code. Clintware branding and Clintware-specific integration code do not remove or replace upstream copyright notices.

- Upstream: `https://github.com/calcom/cal.diy`
- Pinned upstream commit: `6bc45298226f96ff79e0c070c8b2ce39727e8477`
- Pin date: 2026-09-15
- Public booking origin: `https://meet.clintware.com`

## Update policy

Do not track upstream `main` directly in production. Review an upstream commit, test it against the ClintCal smoke tests, then deliberately update the pinned SHA in this file and in `bootstrap.ps1`.

## Production note

Cal.diy is community-maintained self-hosted software. Clintware owns the security, patching, backup, OAuth, database, mail-delivery, and monitoring responsibilities for the ClintCal deployment.
