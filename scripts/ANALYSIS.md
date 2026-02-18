# arken/packages/evolution/scripts/ANALYSIS.md

## Purpose
Provides lightweight guardrails that can run without recursive submodule initialization.

## Current scope
- Parse `.gitmodules` path stanzas (including single/double-quoted `path = ...` variants and case-insensitive key forms like `Path = ...`).
- Accept flexible section headers (`[submodule ...]`) with mixed case, extra bracket spacing, and inline trailing comments for compatibility with hand-edited gitconfig-style files.
- Normalize path variants (repeated `./`, embedded `./` segments, duplicate `/`, trailing slash, backslash separators) for deterministic matching.
- Ignore inline path comments (`#`, `;`) on `.gitmodules` `path = ...` entries with quote-aware parsing, so annotated mappings still validate predictably while keeping comment markers that are part of quoted paths.
- Preserve escaped comment markers (`\#`, `\;`) in unquoted path values so valid literal path names are not truncated by comment stripping.
- Strip optional UTF-8 BOM (`\uFEFF`) at parse entry to avoid false missing-mapping errors when `.gitmodules` starts with BOM-prefixed first section.
- Compare against `git ls-tree HEAD packages` gitlinks.
- Enforce required non-client mappings (`protocol`, `realm`, `shard`).
- Assert required mappings are also present as gitlinks in `HEAD`.
- Detect duplicate `.gitmodules` path mappings to prevent ambiguous ownership.
- Detect per-owner conflicting path re-maps (same `[submodule "..."]` owner bound to multiple normalized `path` values), aggregating repeats into a single deterministic conflict record.
- Reject invalid empty/comment-only `.gitmodules` `path = ...` mappings before they can silently collapse to root-equivalent keys (including explicit blank and quoted-empty `path =` assignments).
- Reject unsafe `.gitmodules` path mappings that try to escape/anchor outside repo scope (e.g., `../...`, `/...`, `C:/...`).
- Detect submodule-owner sections that omit a `path = ...` mapping entirely, preventing silent pass-through of partially-defined submodule stanzas.
- Detect stale `.gitmodules` mappings that are no longer present as `HEAD` gitlinks (`mappedWithoutGitlink`).
- Detect duplicate normalized gitlink paths in `HEAD` listing (`duplicateGitlinks`) to catch parser/input regressions that collapse distinct raw paths into the same canonical key.
- Reject empty/whitespace-only gitlink inputs (`invalidGitlinks`) so malformed injected listings fail explicitly instead of silently normalizing away.
- Allow explicit temporary skip for `packages/client`.
- Guard against invalid validator configuration where `ignoredGitlinks` overlaps required paths.
- Guard against invalid validator configuration where `requiredPaths` or `ignoredGitlinks` contains empty/whitespace-only entries (surfaces as explicit config errors instead of silently normalizing to empty paths).
- Guard against duplicate normalized path entries in `requiredPaths` and `ignoredGitlinks` so copy/paste drift cannot hide contradictory config intent behind de-duplication.

## Follow-ups
- Migrate wrapper tests from `node:test` to Jest + TypeScript when package-level Jest toolchain is introduced.
