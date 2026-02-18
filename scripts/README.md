# arken/packages/evolution/scripts

Wrapper-level tooling for `arken/packages/evolution`.

## Current utilities
- `validateSubmoduleMap.mjs`: validates required non-client `.gitmodules` paths, verifies required mappings also exist as HEAD gitlinks, normalizes quoted/path-variant entries (single/double quotes, repeated `./`, duplicate slashes, trailing slash, backslashes) for both mapping and gitlink inputs, tolerates inline path comments (`#`/`;`) with quote-aware parsing (so comment markers inside quoted paths are preserved), preserves escaped inline-comment markers (`\#`, `\;`) in path values, rejects invalid empty/comment-only path entries, reports duplicate path mappings, flags unexpected unmapped gitlinks, reports mapped paths that no longer resolve to `HEAD` gitlinks while allowing temporary `packages/client` skip policy, and rejects invalid configs where a required path is also listed in `ignoredGitlinks`.
