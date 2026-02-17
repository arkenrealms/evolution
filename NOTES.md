# /arken/packages/evolution/NOTES.md

## Analysis snapshot (2026-02-17)

This repository is currently a submodule container. Core code lives in nested submodules:
- `packages/protocol` (`arken-engineering/evolution-protocol`)
- `packages/realm` (`arken-engineering/evolution-realm`)
- `packages/shard` (`arken-engineering/evolution-shard`)
- `packages/client`

### Blocker
`git submodule update --init --recursive` fails due missing nested submodule URL mapping in `packages/client` and SSH-only remote usage for several nested repos.

### Recommended follow-ups
1. Normalize nested submodule URLs to HTTPS where possible.
2. Ensure `.gitmodules` entries exist for every nested submodule path (including `packages/client/*`).
3. Add CI check that verifies submodules initialize cleanly.
4. Once nested repos are accessible, run protocol + test coverage review and add folder `README.md` / `NOTES.md` in protocol/test directories.
