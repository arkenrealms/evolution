# arken/packages/evolution/test

Minimal wrapper-level regression checks for `arken/packages/evolution`.

## Command
- `npm test`

## Current coverage
- validates non-client `.gitmodules` mapping requirements.
- validates required mappings are backed by actual `HEAD` gitlinks.
- guards against newly introduced unmapped gitlinks (except explicit temporary client skip).
- guards stale `.gitmodules` mappings that no longer resolve to `HEAD` gitlinks.
- guards duplicate `.gitmodules` path mappings (fixture-level parser behavior + live-repo check).
- verifies parser path normalization for single/double-quoted, repeated-prefixed (`./`), duplicate-slash, trailing-slash, backslash-separated, and inline-commented path variants.
- verifies injected gitlink path variants are normalized before required-path comparison.
- verifies validator configuration cannot ignore required submodule paths.
