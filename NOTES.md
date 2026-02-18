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

### Re-verification (2026-02-17 07:50 PST)
- Re-read nested `.gitmodules` and validated HEAD tree entries directly via `git ls-tree`.
- Current gitlinks in `packages/`:
  - `packages/client` -> `96bdcf55698334d77cc36f4c9c23e676a3106995`
  - `packages/protocol` -> `be0d70364769ec6cce4bbd28911bb7912e96a00f`
  - `packages/realm` -> `b1b9cb6bfb4775f9a01114110fbc5aea4b7ec18b`
  - `packages/shard` -> `9780188e86feffa95c1951f0621a47821e21f22f`
- `.gitmodules` still has no stanza for `packages/client`, so recursive init remains structurally blocked regardless of credentials.

### Re-verification (2026-02-17 1:16 PM PST)
- Re-ran from repo root:
  - `git submodule sync --recursive`
  - `git submodule update --init --recursive`
- Result unchanged:
  - `fatal: No url found for submodule path 'packages/client' in .gitmodules`

### Re-verification (2026-02-17 1:27 PM PST)
- Re-ran from repo root:
  - `git submodule sync --recursive`
  - `git submodule update --init --recursive`
- Result unchanged:
  - `fatal: No url found for submodule path 'packages/client' in .gitmodules`

### Re-verification (2026-02-17 3:22 PM PST)
- Re-ran from repo root:
  - `git -C packages/evolution submodule sync --recursive`
  - `git -C packages/evolution submodule update --init --recursive`
- Result unchanged:
  - `fatal: No url found for submodule path 'packages/client' in .gitmodules`

### Re-verification (2026-02-17 3:42 PM PST)
- Re-ran from repo root:
  - `git -C arken/packages/evolution submodule sync --recursive`
  - `git -C arken/packages/evolution submodule update --init --recursive`
- Result unchanged:
  - `fatal: No url found for submodule path 'packages/client' in .gitmodules`

### Re-verification (2026-02-17 3:45 PM PST)
- Re-ran from repo root:
  - `git -C /Users/web/.openclaw/workspace-nel/arken/packages/evolution submodule sync --recursive`
  - `git -C /Users/web/.openclaw/workspace-nel/arken/packages/evolution submodule update --init --recursive`
- Result unchanged:
  - `fatal: No url found for submodule path 'packages/client' in .gitmodules`

### Re-verification (2026-02-17 3:54 PM PST)
- Re-ran from repo root:
  - `git -C /Users/web/.openclaw/workspace-nel/arken/packages/evolution submodule sync --recursive`
  - `git -C /Users/web/.openclaw/workspace-nel/arken/packages/evolution submodule update --init --recursive`
- Result unchanged:
  - `fatal: No url found for submodule path 'packages/client' in .gitmodules`

### Re-verification (2026-02-17 4:24 PM PST)
- Re-ran from repo root:
  - `git -C /Users/web/.openclaw/workspace-nel/arken/packages/evolution submodule sync --recursive`
  - `git -C /Users/web/.openclaw/workspace-nel/arken/packages/evolution submodule update --init --recursive`
- Result unchanged:
  - `fatal: No url found for submodule path 'packages/client' in .gitmodules`

### Re-verification (2026-02-17 4:26 PM PST)
- Re-ran from repo root:
  - `git -C /Users/web/.openclaw/workspace-nel/arken/packages/evolution submodule sync --recursive`
  - `git -C /Users/web/.openclaw/workspace-nel/arken/packages/evolution submodule update --init --recursive`
- Result unchanged:
  - `fatal: No url found for submodule path 'packages/client' in .gitmodules`

### Re-verification (2026-02-17 4:31 PM PST)
- Re-ran from repo root:
  - `git -C /Users/web/.openclaw/workspace-nel/arken/packages/evolution submodule sync --recursive`
  - `git -C /Users/web/.openclaw/workspace-nel/arken/packages/evolution submodule update --init --recursive`
- Result unchanged:
  - `fatal: No url found for submodule path 'packages/client' in .gitmodules`

### Non-client metadata check (2026-02-17 5:12 PM PST)
- Skip policy honored: no recursive submodule sync/update commands executed.
- Directly re-read `.gitmodules`; still only includes:
  - `packages/protocol`
  - `packages/realm`
  - `packages/shard`
- `packages/client` remains intentionally out-of-scope under temporary skip policy.

### Recommended follow-ups
1. Honor temporary skip policy until revoked:
   - ignore `packages/client` and `evolution-unity` integration work,
   - avoid `git submodule sync/update --recursive` during this period.
2. Continue non-client wrapper analysis/docs (`README.md`, `ANALYSIS.md`, `NOTES.md`, `.gitmodules`) so repo context remains current.
3. After skip lifts, normalize nested submodule URLs to HTTPS where possible.
4. Ensure `.gitmodules` entries exist for every nested submodule path (including `packages/client/*`).
5. Add CI check that verifies submodules initialize cleanly.
6. Once nested repos are accessible, run protocol + test coverage review and add folder `README.md` / `NOTES.md` in protocol/test directories.
