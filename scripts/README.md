# arken/packages/evolution/scripts

Wrapper-level tooling for `arken/packages/evolution`.

## Current utilities
- `validateSubmoduleMap.mjs`: validates required non-client `.gitmodules` paths, verifies required mappings also exist as HEAD gitlinks, normalizes quoted/path-variant entries (quotes, `./`, trailing slash, backslashes), reports duplicate path mappings, flags unexpected unmapped gitlinks, and reports mapped paths that no longer resolve to `HEAD` gitlinks while allowing temporary `packages/client` skip policy.
