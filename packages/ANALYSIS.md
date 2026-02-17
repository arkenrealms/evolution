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
- `packages/client` gitlink is present in HEAD (`96bdcf55698334d77cc36f4c9c23e676a3106995`) but missing from `.gitmodules`, so recursive init is currently impossible.

## Next test/protocol checks
- Fix `.gitmodules` mapping for `packages/client` (current recursive init fails: `No url found for submodule path 'packages/client' in .gitmodules`).
- Re-run `git submodule update --init --recursive` from `arken/packages/evolution` once mapping is corrected.
- Per child package: run lint/typecheck/tests, plus protocol compatibility and state-transition/integration checks.
