# arken/packages/evolution/test

Minimal wrapper-level regression checks for `arken/packages/evolution`.

## Command
- `npm test`

## Current coverage
- validates non-client `.gitmodules` mapping requirements.
- validates required mappings are backed by actual `HEAD` gitlinks.
- guards against newly introduced unmapped gitlinks (except explicit temporary client skip).
- guards stale `.gitmodules` mappings that no longer resolve to `HEAD` gitlinks.
- guards duplicate `.gitmodules` path mappings across different submodule owners (fixture-level parser behavior + live-repo check), while allowing repeated identical owner/path declarations.
- guards conflicting per-owner path remaps in `.gitmodules` (same owner mapped to multiple paths).
- guards invalid empty/comment-only `.gitmodules` path mappings (fixture-level parser behavior + live-repo check), including explicit blank and quoted-empty `path =` assignments.
- guards unsafe `.gitmodules` path mappings (`..` traversal + absolute paths + URL-like scheme paths such as `https://...` / `ssh://...`) so malformed entries fail deterministically.
- guards `.gitmodules` submodule sections that omit `path = ...` entirely (fixture-level + live-repo check).
- guards submodule owners that provide only invalid `path = ...` values (blank/traversal/absolute/scheme), ensuring they are surfaced as owner-level failures.
- verifies parser path normalization for single/double-quoted, repeated/embedded dot-segment (`./`) variants, duplicate-slash, trailing-slash, backslash-separated, case-insensitive path-key forms (`path`/`Path`/`PATH`), flexible section-header forms (`[submodule ...]` with mixed case/spacing/comments), and inline-commented path variants (including quoted paths that contain `#`/`;` and escaped comment markers in unquoted values).
- verifies BOM-prefixed `.gitmodules` fixtures parse the first section reliably (no dropped initial mapping).
- verifies injected gitlink path variants are normalized before required-path comparison.
- verifies validator configuration cannot ignore required submodule paths.
- verifies validator configuration rejects empty/whitespace-only required or ignored path entries.
- verifies validator configuration rejects duplicate normalized required/ignored entries.
- verifies validator configuration rejects unsafe required/ignored entries (traversal/absolute/scheme paths).
- verifies duplicate normalized gitlink paths are surfaced and fail validation.
- verifies unexpected gitlinks are de-duplicated after normalization (avoids repeated noise when variants collapse to one path).
- verifies empty/whitespace gitlink inputs are surfaced as explicit validator errors.
