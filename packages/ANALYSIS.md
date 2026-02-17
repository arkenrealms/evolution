# arken/packages/evolution/packages/ANALYSIS.md

## Folder
`arken/packages/evolution/packages`

## Purpose
- Container for Evolution child package submodules (`client`, `protocol`, `realm`, `shard`).

## Key files
- `README.md`
- child paths: `client/`, `protocol/`, `realm/`, `shard/` (gitlink submodules; contents not initialized in this workspace)

## Risks
- Cross-package protocol/state compatibility cannot be validated without nested checkouts.
- Integration regressions may be missed until submodule sync occurs.

## Next test/protocol checks
- Run `git submodule update --init --recursive` from `arken/packages/evolution`.
- Per child package: run lint/typecheck/tests, plus protocol compatibility and state-transition/integration checks.
