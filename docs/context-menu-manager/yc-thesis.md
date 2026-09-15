# YC-facing working thesis — Clintware workstation reliability

## Evidence boundary

Right-Click Menu Manager v0.2.0 is a working public product artifact and a possible wedge. It is not, by itself, a venture-scale claim.

## Potential company-shaped thesis

**Clintware builds a developer workstation reliability layer that detects local configuration drift, repairs it safely, and proves how much developer time it gives back.**

The context-menu manager demonstrates the operating model: inspect the real machine, present explicit controls, snapshot before mutation, apply locally, and roll back cleanly. The same model can extend to editor state, shell/toolchain configuration, resource pressure, startup degradation, input latency, and app-specific repair packs.

## Metrics required before making the larger claim

- weekly active workstations
- successful repairs per workstation
- median time-to-recovery before vs. after Clintware
- repeat incident rate
- rollback / failed-repair rate
- measured launch or interaction latency improvement where applicable
- repair packs actively used
- organic retention after 4 and 8 weeks

## Near-term validation

1. Ship the utility publicly and collect only opt-in, privacy-preserving outcome metrics.
2. Recruit real Windows developer users with recurring workstation friction.
3. Identify the three problems that repeatedly cost the most time.
4. Build repair packs around repeated problems instead of broadening by feature count.
5. Show measurable recovered time and repeated usage before framing the product as a workstation reliability platform.
