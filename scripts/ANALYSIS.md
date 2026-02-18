# arken/packages/evolution/scripts/ANALYSIS.md

## Purpose
Provides lightweight guardrails that can run without recursive submodule initialization.

## Current scope
- Parse `.gitmodules` path stanzas (including single/double-quoted `path = ...` variants).
- Normalize path variants (repeated `./`, duplicate `/`, trailing slash, backslash separators) for deterministic matching.
- Ignore inline path comments (`#`, `;`) on unquoted `.gitmodules` `path = ...` entries so annotated mappings still validate predictably.
- Compare against `git ls-tree HEAD packages` gitlinks.
- Enforce required non-client mappings (`protocol`, `realm`, `shard`).
- Assert required mappings are also present as gitlinks in `HEAD`.
- Detect duplicate `.gitmodules` path mappings to prevent ambiguous ownership.
- Detect stale `.gitmodules` mappings that are no longer present as `HEAD` gitlinks (`mappedWithoutGitlink`).
- Allow explicit temporary skip for `packages/client`.
- Guard against invalid validator configuration where `ignoredGitlinks` overlaps required paths.

## Follow-ups
- Migrate wrapper tests from `node:test` to Jest + TypeScript when package-level Jest toolchain is introduced.
