# Scripts

Wrapper-level tooling for `arken/packages/evolution`.

## Current utilities
- `validateSubmoduleMap.mjs`: validates required non-client `.gitmodules` paths, verifies required mappings also exist as HEAD gitlinks, normalizes quoted `path = "..."` stanzas, reports duplicate path mappings, and flags unexpected unmapped gitlinks while allowing temporary `packages/client` skip policy.
