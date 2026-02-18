# Tests

Minimal wrapper-level regression checks for `arken/packages/evolution`.

## Command
- `npm test`

## Current coverage
- validates non-client `.gitmodules` mapping requirements.
- validates required mappings are backed by actual `HEAD` gitlinks.
- guards against newly introduced unmapped gitlinks (except explicit temporary client skip).
- guards duplicate `.gitmodules` path mappings (fixture-level parser behavior + live-repo check).
- verifies parser normalization for quoted `.gitmodules` `path` values.
