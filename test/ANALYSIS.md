# arken/packages/evolution/test/ANALYSIS.md

## Purpose
Ensures wrapper-level submodule metadata stays internally consistent during temporary client skip.

## Test focus
- required mapping presence for `packages/protocol`, `packages/realm`, `packages/shard`.
- required mappings must correspond to actual `HEAD` gitlinks.
- absence of unexpected unmapped gitlinks in `packages/*`.
- deterministic duplicate `.gitmodules` path-mapping detection, including de-duplication when duplicate owners repeat the same conflicting mapping lines.
- deterministic detection of conflicting per-owner path remaps in `.gitmodules`.
- deterministic detection of invalid empty/comment-only `.gitmodules` path mappings, including explicit blank and quoted-empty `path =` assignments.
- deterministic rejection of unsafe path mappings with traversal (`..`), absolute roots (`/...`, `C:/...`), or URL-like scheme paths (`https://...`, `ssh://...`).
- deterministic detection of submodule-owner sections missing `path = ...` mappings.
- deterministic detection of submodule owners that only provide invalid `path = ...` values (no valid mapping survives normalization).
- deterministic path normalization across `.gitmodules` and injected gitlink path variants (including repeated/embedded dot segments like `./`, single-quoted `path = '...'` stanzas, and case-insensitive `Path` keys).
- parser tolerance for inline comments on `.gitmodules` `path = ...` values, including quote-aware handling when quoted paths contain `#`/`;`.
- parser tolerance for `.gitmodules` section-header variants (mixed-case `submodule`, extra bracket spacing, and trailing comments).
- deterministic handling for escaped comment markers (`\#`, `\;`) in unquoted path values so literal characters survive normalization.
- deterministic handling for UTF-8 BOM-prefixed `.gitmodules` fixtures so first section parsing remains stable.
- explicit acknowledgement of temporary `packages/client` ignore policy.
- explicit rejection of invalid overlap between required paths and ignored paths.
- explicit rejection of empty/whitespace-only required/ignored validator config paths.
- explicit rejection of duplicate normalized required/ignored validator config paths.
- explicit rejection of unsafe validator config paths (traversal/absolute/scheme) in required/ignored lists.
- deterministic detection of duplicate normalized gitlink paths when variant raw inputs collapse to the same canonical path.
- deterministic de-duplication of unexpected gitlink reports when multiple raw variants normalize to the same unmapped path.
- deterministic rejection of empty/whitespace gitlink inputs so malformed injected listings are surfaced as explicit validation errors.
- deterministic rejection of unsafe gitlink path inputs (traversal/absolute/scheme) so malformed injected listings cannot pass through as generic mismatch noise.

## Follow-ups
- Keep incremental migration path open toward Jest + TS when wrapper package adopts Jest runtime dependencies.
