# arken/packages/evolution/test/ANALYSIS.md

## Purpose
Ensures wrapper-level submodule metadata stays internally consistent during temporary client skip.

## Test focus
- required mapping presence for `packages/protocol`, `packages/realm`, `packages/shard`.
- required mappings must correspond to actual `HEAD` gitlinks.
- absence of unexpected unmapped gitlinks in `packages/*`.
- deterministic duplicate `.gitmodules` path-mapping detection.
- deterministic detection of conflicting per-owner path remaps in `.gitmodules`.
- deterministic detection of invalid empty/comment-only `.gitmodules` path mappings, including explicit blank and quoted-empty `path =` assignments.
- deterministic detection of submodule-owner sections missing `path = ...` mappings.
- deterministic path normalization across `.gitmodules` and injected gitlink path variants (including single-quoted `path = '...'` stanzas and case-insensitive `Path` keys).
- parser tolerance for inline comments on `.gitmodules` `path = ...` values, including quote-aware handling when quoted paths contain `#`/`;`.
- parser tolerance for `.gitmodules` section-header variants (mixed-case `submodule`, extra bracket spacing, and trailing comments).
- deterministic handling for escaped comment markers (`\#`, `\;`) in unquoted path values so literal characters survive normalization.
- deterministic handling for UTF-8 BOM-prefixed `.gitmodules` fixtures so first section parsing remains stable.
- explicit acknowledgement of temporary `packages/client` ignore policy.
- explicit rejection of invalid overlap between required paths and ignored paths.
- deterministic detection of duplicate normalized gitlink paths when variant raw inputs collapse to the same canonical path.

## Follow-ups
- Keep incremental migration path open toward Jest + TS when wrapper package adopts Jest runtime dependencies.
