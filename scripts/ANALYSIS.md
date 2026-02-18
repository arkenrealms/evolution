# arken/packages/evolution/scripts/ANALYSIS.md

## Purpose
Provides lightweight guardrails that can run without recursive submodule initialization.

## Current scope
- Parse `.gitmodules` path stanzas (including quoted `path = "..."` variants).
- Compare against `git ls-tree HEAD packages` gitlinks.
- Enforce required non-client mappings (`protocol`, `realm`, `shard`).
- Assert required mappings are also present as gitlinks in `HEAD`.
- Detect duplicate `.gitmodules` path mappings to prevent ambiguous ownership.
- Detect stale `.gitmodules` mappings that are no longer present as `HEAD` gitlinks (`mappedWithoutGitlink`).
- Allow explicit temporary skip for `packages/client`.
