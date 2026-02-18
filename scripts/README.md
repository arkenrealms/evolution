# Scripts

Wrapper-level tooling for `arken/packages/evolution`.

## Current utilities
- `validateSubmoduleMap.mjs`: validates required non-client `.gitmodules` paths, verifies required mappings also exist as HEAD gitlinks, normalizes quoted `path = "..."` stanzas, reports duplicate path mappings, flags unexpected unmapped gitlinks, and now reports mapped paths that no longer exist as gitlinks in `HEAD` while allowing temporary `packages/client` skip policy.
