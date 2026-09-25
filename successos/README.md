# Clintware SuccessOS

Portable, local-first AI operating environment with governed execution.

## Repository layout

- `ARCHITECTURE.md` — security, runtime, driver, boot-mode, and remote-capability design.
- `os/success_permission.py` — scoped local approval-policy core.
- `os/success_driver_scan.py` — hardware/modalias and missing-firmware inventory.
- `os/default-policy.json` — default risk and approval policy.
- `os/build-successos.sh` — Debian live-build ISO scaffold.
- `plugin/` — portable plugin package that reuses the Clintware MCP boundary.
- `tests/` — permission and static contract tests.
- `../public/successos/` — public product/beta page.

## Current state

Implemented now:
- scoped allow-once, session, bounded durable allow, and deny policy behavior
- rejection of durable broad grants for higher-risk actions
- deterministic hardware/driver inventory
- reproducible live-image build definition
- product/beta landing page
- portable plugin manifest, MCP mapping, and governed workflow skill
- automated validation workflow

Not yet claimed as complete:
- a produced and hardware-booted ISO artifact
- bundled/pinned BitNet runtime and model payload
- GUI approval dialog wired to the broker
- signed update channel
- encrypted persistence provisioning
- production OAuth validation for the public plugin
- DNS/deployment activation for the canonical subdomain

Those remain acceptance gates rather than inferred success.
