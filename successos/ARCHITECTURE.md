# Clintware SuccessOS

SuccessOS is a portable, local-first AI operating environment built on a conventional Linux kernel and a governed agent layer.

## Design invariants

1. The language model never receives implicit root authority.
2. Every state-changing capability has an explicit deterministic implementation outside the model.
3. Authorization is scoped across action, resource, identity, host, and lifetime.
4. A broader request invalidates an earlier narrower approval.
5. Permanent approvals are local policy records, not prompt text.
6. Destructive actions always require fresh approval unless an administrator has installed a specific managed policy.
7. Network loss must not prevent boot, local inference, filesystem search, hardware inspection, or common recovery operations.
8. Driver discovery is hardware-ID driven and package installation is signature-verified.
9. Remote Clintware capabilities are accessed through delegated MCP authorization. Secrets do not become model context.
10. Every execution path produces an inspectable result record.

## Runtime layers

UEFI → Linux kernel → Debian live userland → system services → SuccessOS capability broker → QuillGeist intent/planning layer → local BitNet runtime → optional Clintware MCP capabilities

The capability broker is the only supported path from an AI plan to privileged host changes.

## Permission record

A permission decision contains subject identity, tool/capability, operation, resource matcher, host/device, risk class, expiration mode, created timestamp, optional expiry timestamp, approval origin, and policy version.

Expiration modes are once, session, always, and deny. "Always" is accepted only for bounded scopes. Wildcard combinations that include privileged, destructive, or credential-sensitive operations are rejected.

## Risk classes

- R0: read-only inspection
- R1: reversible user-level change
- R2: privileged but reversible system change
- R3: destructive, credential, boot, partition, identity, or security-boundary change

R0 may be pre-approved by policy. R1 may use once, session, or bounded always rules. R2 defaults to a fresh prompt. R3 requires fresh approval for each material operation.

## Driver strategy

The boot image contains broad common kernel modules and firmware for storage, display, Ethernet, Wi-Fi, Bluetooth, USB, HID, audio, touchpads, cameras, filesystems, and removable media.

Discovery sequence:

1. enumerate PCI, USB, and ACPI devices
2. record modalias/vendor/device identifiers
3. ask the running kernel for matching modules
4. identify missing firmware from kernel logs and modalias metadata
5. compare against installed package ownership
6. if offline, report exact missing support and use the bundled cache when available
7. if online, resolve only through configured signed distro repositories
8. present the exact package plan before installation
9. install after approval
10. re-probe and record verification evidence

No arbitrary driver download sites are part of the default path.

## Boot modes

Live mode uses a read-only base image plus temporary overlay. Persistent mode uses encrypted writable storage. Install mode promotes the tested environment into a conventional Linux workstation; storage changes require an R3 approval with a displayed partition plan.

## Windows migration planning

SuccessOS may inventory hardware, export data, collect driver identifiers, prepare migration media, and generate a Windows migration plan. Replacing the host OS is always an explicit R3 operation and is not represented as an automatic upgrade.

## Remote architecture

Native SuccessOS:
local agent → OAuth 2.1 delegated token → mcp.clintware.com/mcp → scoped capability → result

ChatGPT/Codex:
Clintware plugin → skill → same MCP endpoint → same authorization boundary

The plugin is a distribution and workflow layer. It is not an authorization bypass and does not hold shared master credentials.

## Initial acceptance gate

The first bootable milestone passes only when all of the following are repeatable on at least two different machines or VMs:

- boots from removable media
- launches GUI
- identifies CPU, memory, storage, network and display hardware
- starts local BitNet inference
- handles a scoped read action without elevated authority
- prompts for a scoped write action
- enforces allow-once and always-allow behavior
- records the executed command and result
- operates with the network disabled
- reconnects optional remote capabilities without exposing credentials to the model
