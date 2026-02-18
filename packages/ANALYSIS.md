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
- `packages/client` is currently not present as a `HEAD` gitlink in this checkout (while still existing locally as a nested path), so wrapper metadata checks now focus on non-client required mappings plus explicit client ignore policy.

## Next test/protocol checks
- Temporary skip active: do not analyze `packages/client` or run recursive submodule sync/update while this policy is in force.
- Continue wrapper-level analysis/docs for non-client scope (`protocol`, `realm`, `shard` gitlink metadata and ownership notes).
- Latest source read confirms `.gitmodules` contains only non-client stanzas (`packages/protocol`, `packages/realm`, `packages/shard`), so non-client documentation work can proceed without recursive init.
- When skip is lifted, repair `.gitmodules` mapping for `packages/client` and only then resume recursive init + child-package lint/typecheck/tests.
