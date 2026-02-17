# /arken/packages/evolution/NOTES.md

## Analysis snapshot (2026-02-17)

This repository is currently a submodule container. Core code lives in nested submodules:
- `packages/protocol` (`arken-engineering/evolution-protocol`)
- `packages/realm` (`arken-engineering/evolution-realm`)
- `packages/shard` (`arken-engineering/evolution-shard`)
- `packages/client`

### Blocker
`git submodule update --init --recursive` fails due missing nested submodule URL mapping in `packages/client` and SSH-only remote usage for several nested repos.

### Latest verification (2026-02-17 07:34 PST)
- Ran:
  - `git -C arken/packages/evolution submodule sync --recursive`
  - `git -C arken/packages/evolution submodule update --init --recursive`
- Result:
  - `fatal: No url found for submodule path 'packages/client' in .gitmodules`
- Confirmed mismatch:
  - `packages/client` exists as a gitlink entry in repository tree,
  - but `.gitmodules` currently defines only `packages/protocol`, `packages/realm`, and `packages/shard`.

### Recommended follow-ups
1. Normalize nested submodule URLs to HTTPS where possible.
2. Ensure `.gitmodules` entries exist for every nested submodule path (including `packages/client/*`).
3. Add CI check that verifies submodules initialize cleanly.
4. Once nested repos are accessible, run protocol + test coverage review and add folder `README.md` / `NOTES.md` in protocol/test directories.
