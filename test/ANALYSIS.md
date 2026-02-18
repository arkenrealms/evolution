# arken/packages/evolution/test/ANALYSIS.md

## Purpose
Ensures wrapper-level submodule metadata stays internally consistent during temporary client skip.

## Test focus
- required mapping presence for `packages/protocol`, `packages/realm`, `packages/shard`.
- required mappings must correspond to actual `HEAD` gitlinks.
- absence of unexpected unmapped gitlinks in `packages/*`.
- deterministic duplicate `.gitmodules` path-mapping detection.
- deterministic path normalization across `.gitmodules` path variants.
- explicit acknowledgement of temporary `packages/client` ignore policy.

## Follow-ups
- Keep incremental migration path open toward Jest + TS when wrapper package adopts Jest runtime dependencies.
