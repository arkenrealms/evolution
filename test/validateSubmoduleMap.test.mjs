// arken/packages/evolution/test/validateSubmoduleMap.test.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  normalizeSubmodulePath,
  parseGitmodules,
  validateSubmoduleMap
} from '../scripts/validateSubmoduleMap.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

test('required non-client submodule mappings are present', () => {
  const result = validateSubmoduleMap(repoRoot);
  assert.deepEqual(result.missingRequired, []);
});

test('required mappings correspond to actual gitlinks in HEAD', () => {
  const result = validateSubmoduleMap(repoRoot);
  assert.deepEqual(result.missingGitlinksForRequired, []);
});

test('no unexpected unmapped gitlinks exist outside explicit ignore list', () => {
  const result = validateSubmoduleMap(repoRoot);
  assert.deepEqual(result.unexpectedGitlinks, []);
});

test('client path stays explicitly ignored under temporary skip policy', () => {
  const result = validateSubmoduleMap(repoRoot);
  assert.ok(result.ignoredGitlinks.includes('packages/client'));
  assert.ok(!result.unexpectedGitlinks.includes('packages/client'));
});

test('normalizeSubmodulePath strips wrappers and slash variants', () => {
  assert.equal(normalizeSubmodulePath('"packages/protocol/"'), 'packages/protocol');
  assert.equal(normalizeSubmodulePath('./packages/realm'), 'packages/realm');
  assert.equal(normalizeSubmodulePath('././packages/realm//'), 'packages/realm');
  assert.equal(normalizeSubmodulePath('packages/./protocol'), 'packages/protocol');
  assert.equal(normalizeSubmodulePath('packages\\\\shard'), 'packages/shard');
  assert.equal(normalizeSubmodulePath('packages//shard///'), 'packages/shard');
  assert.equal(normalizeSubmodulePath('packages/protocol # prod mapping'), 'packages/protocol');
  assert.equal(normalizeSubmodulePath('packages/realm ; mirrored path'), 'packages/realm');
  assert.equal(normalizeSubmodulePath('"packages/shard-beta"'), 'packages/shard-beta');
  assert.equal(normalizeSubmodulePath("'packages/sigil-protocol'"), 'packages/sigil-protocol');
  assert.equal(normalizeSubmodulePath('"packages/proto#col" # note'), 'packages/proto#col');
  assert.equal(normalizeSubmodulePath("'packages/rea;lm' ; note"), 'packages/rea;lm');
  assert.equal(normalizeSubmodulePath('packages/proto\\#col # note'), 'packages/proto#col');
  assert.equal(normalizeSubmodulePath('packages/rea\\;lm ; note'), 'packages/rea;lm');
  assert.equal(normalizeSubmodulePath('""'), '');
  assert.equal(normalizeSubmodulePath("''"), '');
  assert.equal(normalizeSubmodulePath('"   "'), '');
});

test('parseGitmodules handles UTF-8 BOM-prefixed .gitmodules content', () => {
  const fixture = `\uFEFF[submodule "packages/protocol"]\n  path = packages/protocol`;
  const parsed = parseGitmodules(fixture);
  assert.equal(parsed.entries.get('packages/protocol'), 'packages/protocol');
});

test('parseGitmodules accepts case-insensitive path keys', () => {
  const fixture = `
[submodule "packages/protocol"]
  Path = packages/protocol
[submodule "packages/realm"]
  PATH = packages/realm
[submodule "packages/shard"]
  pAtH = packages/shard
`.trim();

  const parsed = parseGitmodules(fixture);
  assert.equal(parsed.entries.get('packages/protocol'), 'packages/protocol');
  assert.equal(parsed.entries.get('packages/realm'), 'packages/realm');
  assert.equal(parsed.entries.get('packages/shard'), 'packages/shard');
});

test('parseGitmodules normalizes dot-segment path mappings', () => {
  const fixture = `
[submodule "packages/protocol"]
  path = packages/./protocol
[submodule "packages/realm"]
  path = ./packages/realm/.
`.trim();

  const parsed = parseGitmodules(fixture);
  assert.equal(parsed.entries.get('packages/protocol'), 'packages/protocol');
  assert.equal(parsed.entries.get('packages/realm'), 'packages/realm');
});

test('parseGitmodules accepts section headers with spacing, comments, and mixed case', () => {
  const fixture = `
 [Submodule "packages/protocol"] ; canonical
  path = packages/protocol
[  submodule "packages/realm"  ] # keep
  path = packages/realm
`.trim();

  const parsed = parseGitmodules(fixture);
  assert.equal(parsed.entries.get('packages/protocol'), 'packages/protocol');
  assert.equal(parsed.entries.get('packages/realm'), 'packages/realm');
});

test('parseGitmodules reports duplicate path mappings deterministically', () => {
  const fixture = `
[submodule "packages/protocol"]
  path = "packages/protocol/"
[submodule "packages/protocol-mirror"]
  path = ./packages/protocol
`.trim();

  const parsed = parseGitmodules(fixture);
  assert.equal(parsed.entries.get('packages/protocol'), 'packages/protocol');
  assert.deepEqual(parsed.duplicateMappings.get('packages/protocol'), [
    'packages/protocol',
    'packages/protocol-mirror'
  ]);
  assert.deepEqual(parsed.ownerPathConflicts, []);
});

test('parseGitmodules deduplicates repeated duplicate-owner mappings', () => {
  const fixture = `
[submodule "packages/protocol"]
  path = packages/protocol
[submodule "packages/protocol-mirror"]
  path = packages/protocol
[submodule "packages/protocol-mirror"]
  path = ./packages/protocol/
`.trim();

  const parsed = parseGitmodules(fixture);
  assert.equal(parsed.entries.get('packages/protocol'), 'packages/protocol');
  assert.deepEqual(parsed.duplicateMappings.get('packages/protocol'), [
    'packages/protocol',
    'packages/protocol-mirror'
  ]);
});


test('parseGitmodules ignores repeated identical owner/path mappings', () => {
  const fixture = `
[submodule "packages/protocol"]
  path = packages/protocol
[submodule "packages/protocol"]
  path = ./packages/protocol/
[submodule "packages/realm"]
  path = packages/realm
[submodule "packages/shard"]
  path = packages/shard
`.trim();

  const parsed = parseGitmodules(fixture);
  assert.equal(parsed.entries.get('packages/protocol'), 'packages/protocol');
  assert.deepEqual(parsed.duplicateMappings.get('packages/protocol'), undefined);
  assert.deepEqual(parsed.ownerPathConflicts, []);
});

test('parseGitmodules reports per-owner conflicting path mappings', () => {
  const fixture = `
[submodule "packages/protocol"]
  path = packages/protocol
[submodule "packages/protocol"]
  path = packages/protocol-v2
`.trim();

  const parsed = parseGitmodules(fixture);
  assert.deepEqual(parsed.ownerPathConflicts, [
    {
      owner: 'packages/protocol',
      paths: ['packages/protocol', 'packages/protocol-v2']
    }
  ]);
});

test('parseGitmodules aggregates repeated owner conflicts into one deterministic record', () => {
  const fixture = `
[submodule "packages/protocol"]
  path = packages/protocol
[submodule "packages/protocol"]
  path = packages/protocol-v2
[submodule "packages/protocol"]
  path = packages/protocol-v3
[submodule "packages/realm"]
  path = packages/realm
[submodule "packages/shard"]
  path = packages/shard
`.trim();

  const parsed = parseGitmodules(fixture);
  assert.deepEqual(parsed.ownerPathConflicts, [
    {
      owner: 'packages/protocol',
      paths: ['packages/protocol', 'packages/protocol-v2', 'packages/protocol-v3']
    }
  ]);
});

test('parseGitmodules accepts inline comments on path lines', () => {
  const fixture = `
[submodule "packages/protocol"]
  path = packages/protocol # stable
[submodule "packages/realm"]
  path = packages/realm ; canary
[submodule "packages/shard"]
  path = "packages/shard-beta#v2" # qa branch
[submodule "packages/sigil-protocol"]
  path = 'packages/sigil;protocol' ; integration
[submodule "packages/escaped"]
  path = packages/proto\\#col # escaped comment marker
[submodule "packages/escaped-semicolon"]
  path = packages/rea\\;lm ; escaped comment marker
`.trim();

  const parsed = parseGitmodules(fixture);
  assert.equal(parsed.entries.get('packages/protocol'), 'packages/protocol');
  assert.equal(parsed.entries.get('packages/realm'), 'packages/realm');
  assert.equal(parsed.entries.get('packages/shard-beta#v2'), 'packages/shard');
  assert.equal(parsed.entries.get('packages/sigil;protocol'), 'packages/sigil-protocol');
  assert.equal(parsed.entries.get('packages/proto#col'), 'packages/escaped');
  assert.equal(parsed.entries.get('packages/rea;lm'), 'packages/escaped-semicolon');
});

test('parseGitmodules reports invalid empty/unsafe path mappings', () => {
  const fixture = `
[submodule "packages/protocol"]
  path = packages/protocol
[submodule "packages/realm"]
  path = # intentionally blank
[submodule "packages/shard"]
  path = ; intentionally blank
[submodule "packages/empty"]
  path =
[submodule "packages/quoted-empty"]
  path = ""
[submodule "packages/single-quoted-empty"]
  path = ''
[submodule "packages/quoted-space"]
  path = "   "
[submodule "packages/traversal"]
  path = ../packages/protocol
[submodule "packages/absolute"]
  path = /packages/protocol
[submodule "packages/windows-absolute"]
  path = C:\\packages\\protocol
[submodule "packages/url-http"]
  path = https://example.invalid/repo
[submodule "packages/url-ssh"]
  path = ssh://git@example.invalid/repo
`.trim();

  const parsed = parseGitmodules(fixture);
  assert.equal(parsed.entries.get('packages/protocol'), 'packages/protocol');
  assert.deepEqual(parsed.ownersWithoutValidPath, [
    'packages/realm',
    'packages/shard',
    'packages/empty',
    'packages/quoted-empty',
    'packages/single-quoted-empty',
    'packages/quoted-space',
    'packages/traversal',
    'packages/absolute',
    'packages/windows-absolute',
    'packages/url-http',
    'packages/url-ssh'
  ]);
  assert.deepEqual(parsed.invalidMappings, [
    { owner: 'packages/realm', rawPath: '# intentionally blank' },
    { owner: 'packages/shard', rawPath: '; intentionally blank' },
    { owner: 'packages/empty', rawPath: '' },
    { owner: 'packages/quoted-empty', rawPath: '""' },
    { owner: 'packages/single-quoted-empty', rawPath: "''" },
    { owner: 'packages/quoted-space', rawPath: '"   "' },
    { owner: 'packages/traversal', rawPath: '../packages/protocol' },
    { owner: 'packages/absolute', rawPath: '/packages/protocol' },
    { owner: 'packages/windows-absolute', rawPath: 'C:\\packages\\protocol' },
    { owner: 'packages/url-http', rawPath: 'https://example.invalid/repo' },
    { owner: 'packages/url-ssh', rawPath: 'ssh://git@example.invalid/repo' }
  ]);
});

test('parseGitmodules reports owners with missing path lines', () => {
  const fixture = `
[submodule "packages/protocol"]
  path = packages/protocol
[submodule "packages/realm"]
  url = https://example.invalid/realm.git
[submodule "packages/shard"]
  path = packages/shard
`.trim();

  const parsed = parseGitmodules(fixture);
  assert.deepEqual(parsed.missingPathOwners, ['packages/realm']);
});

test('validateSubmoduleMap reports mapped paths that no longer have gitlinks', () => {
  const fixture = `
[submodule "packages/protocol"]
  path = packages/protocol
[submodule "packages/realm"]
  path = packages/realm
[submodule "packages/shard"]
  path = packages/shard
[submodule "packages/legacy"]
  path = packages/legacy
`.trim();

  const result = validateSubmoduleMap(repoRoot, {
    gitmodulesContent: fixture,
    gitlinks: ['packages/protocol', 'packages/realm', 'packages/shard']
  });

  assert.deepEqual(result.mappedWithoutGitlink, ['packages/legacy']);
  assert.equal(result.ok, false);
});

test('no mapped-without-gitlink paths are present in live .gitmodules', () => {
  const result = validateSubmoduleMap(repoRoot);
  assert.deepEqual(result.mappedWithoutGitlink, []);
});

test('no duplicate path mappings are present in live .gitmodules', () => {
  const result = validateSubmoduleMap(repoRoot);
  assert.deepEqual(result.duplicateMappings, []);
});

test('no invalid empty path mappings are present in live .gitmodules', () => {
  const result = validateSubmoduleMap(repoRoot);
  assert.deepEqual(result.invalidMappings, []);
});

test('validateSubmoduleMap fails when submodule owner has no path mapping', () => {
  const fixture = `
[submodule "packages/protocol"]
  path = packages/protocol
[submodule "packages/realm"]
  url = https://example.invalid/realm.git
[submodule "packages/shard"]
  path = packages/shard
`.trim();

  const result = validateSubmoduleMap(repoRoot, {
    gitmodulesContent: fixture,
    gitlinks: ['packages/protocol', 'packages/realm', 'packages/shard']
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.missingPathOwners, ['packages/realm']);
});

test('validateSubmoduleMap flags owners that never declare a valid path', () => {
  const fixture = `
[submodule "packages/protocol"]
  path = packages/protocol
[submodule "packages/realm"]
  path = # intentionally blank
[submodule "packages/shard"]
  path = ../packages/shard
`.trim();

  const result = validateSubmoduleMap(repoRoot, {
    gitmodulesContent: fixture,
    gitlinks: ['packages/protocol', 'packages/realm', 'packages/shard']
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.ownersWithoutValidPath, ['packages/realm', 'packages/shard']);
});

test('no missing path-owner mappings are present in live .gitmodules', () => {
  const result = validateSubmoduleMap(repoRoot);
  assert.deepEqual(result.missingPathOwners, []);
});

test('all live submodule owners declare at least one valid path mapping', () => {
  const result = validateSubmoduleMap(repoRoot);
  assert.deepEqual(result.ownersWithoutValidPath, []);
});

test('required paths cannot be hidden by ignoredGitlinks', () => {
  const fixture = `
[submodule "packages/protocol"]
  path = packages/protocol
[submodule "packages/realm"]
  path = packages/realm
[submodule "packages/shard"]
  path = packages/shard
`.trim();

  const result = validateSubmoduleMap(repoRoot, {
    gitmodulesContent: fixture,
    gitlinks: ['packages/protocol', 'packages/realm', 'packages/shard'],
    ignoredGitlinks: ['packages/client', './packages/realm/']
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.invalidIgnoredRequiredOverlap, ['packages/realm']);
});

test('validator config rejects empty required and ignored path entries', () => {
  const fixture = `
[submodule "packages/protocol"]
  path = packages/protocol
[submodule "packages/realm"]
  path = packages/realm
[submodule "packages/shard"]
  path = packages/shard
`.trim();

  const result = validateSubmoduleMap(repoRoot, {
    gitmodulesContent: fixture,
    gitlinks: ['packages/protocol', 'packages/realm', 'packages/shard'],
    requiredPaths: ['packages/protocol', '   ', ''],
    ignoredGitlinks: ['packages/client', '  ', '']
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.invalidRequiredPaths, ['   ', '']);
  assert.deepEqual(result.invalidIgnoredPaths, ['  ', '']);
});

test('validator config rejects duplicate required and ignored path entries', () => {
  const fixture = `
[submodule "packages/protocol"]
  path = packages/protocol
[submodule "packages/realm"]
  path = packages/realm
[submodule "packages/shard"]
  path = packages/shard
`.trim();

  const result = validateSubmoduleMap(repoRoot, {
    gitmodulesContent: fixture,
    gitlinks: ['packages/protocol', 'packages/realm', 'packages/shard'],
    requiredPaths: ['packages/protocol', './packages/protocol/', 'packages/realm', 'packages/shard'],
    ignoredGitlinks: ['packages/client', './packages/client/', 'packages/temp']
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.duplicateRequiredPaths, ['packages/protocol']);
  assert.deepEqual(result.duplicateIgnoredPaths, ['packages/client']);
});

test('validator config rejects unsafe required and ignored path entries', () => {
  const fixture = `
[submodule "packages/protocol"]
  path = packages/protocol
[submodule "packages/realm"]
  path = packages/realm
[submodule "packages/shard"]
  path = packages/shard
`.trim();

  const result = validateSubmoduleMap(repoRoot, {
    gitmodulesContent: fixture,
    gitlinks: ['packages/protocol', 'packages/realm', 'packages/shard'],
    requiredPaths: ['packages/protocol', '../packages/realm'],
    ignoredGitlinks: ['packages/client', 'https://example.invalid/ignored']
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.unsafeRequiredPaths, ['../packages/realm']);
  assert.deepEqual(result.unsafeIgnoredPaths, ['https://example.invalid/ignored']);
});

test('validateSubmoduleMap fails when same owner maps to conflicting paths', () => {
  const fixture = `
[submodule "packages/protocol"]
  path = packages/protocol
[submodule "packages/protocol"]
  path = packages/protocol-v2
[submodule "packages/realm"]
  path = packages/realm
[submodule "packages/shard"]
  path = packages/shard
`.trim();

  const result = validateSubmoduleMap(repoRoot, {
    gitmodulesContent: fixture,
    gitlinks: ['packages/protocol', 'packages/protocol-v2', 'packages/realm', 'packages/shard']
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.ownerPathConflicts, [
    {
      owner: 'packages/protocol',
      paths: ['packages/protocol', 'packages/protocol-v2']
    }
  ]);
});

test('gitlink path variants are normalized before comparison', () => {
  const fixture = `
[submodule "packages/protocol"]
  path = packages/protocol
[submodule "packages/realm"]
  path = packages/realm
[submodule "packages/shard"]
  path = packages/shard
`.trim();

  const result = validateSubmoduleMap(repoRoot, {
    gitmodulesContent: fixture,
    gitlinks: ['./packages/protocol/.', 'packages\\realm', 'packages//shard/./']
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.missingGitlinksForRequired, []);
});

test('validateSubmoduleMap reports duplicate gitlinks after normalization', () => {
  const fixture = `
[submodule "packages/protocol"]
  path = packages/protocol
[submodule "packages/realm"]
  path = packages/realm
[submodule "packages/shard"]
  path = packages/shard
`.trim();

  const result = validateSubmoduleMap(repoRoot, {
    gitmodulesContent: fixture,
    gitlinks: ['packages/protocol', './packages/protocol/', 'packages/realm', 'packages/shard']
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.duplicateGitlinks, [{ path: 'packages/protocol', count: 2 }]);
});

test('validateSubmoduleMap deduplicates unexpected gitlinks after normalization', () => {
  const fixture = `
[submodule "packages/protocol"]
  path = packages/protocol
[submodule "packages/realm"]
  path = packages/realm
[submodule "packages/shard"]
  path = packages/shard
`.trim();

  const result = validateSubmoduleMap(repoRoot, {
    gitmodulesContent: fixture,
    gitlinks: ['packages/protocol', 'packages/realm', 'packages/shard', 'packages/extra', './packages/extra/']
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.unexpectedGitlinks, ['packages/extra']);
});

test('validateSubmoduleMap rejects empty gitlink inputs', () => {
  const fixture = `
[submodule "packages/protocol"]
  path = packages/protocol
[submodule "packages/realm"]
  path = packages/realm
[submodule "packages/shard"]
  path = packages/shard
`.trim();

  const result = validateSubmoduleMap(repoRoot, {
    gitmodulesContent: fixture,
    gitlinks: ['packages/protocol', '   ', '']
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.invalidGitlinks, ['   ', '']);
});

test('validateSubmoduleMap rejects unsafe gitlink inputs', () => {
  const fixture = `
[submodule "packages/protocol"]
  path = packages/protocol
[submodule "packages/realm"]
  path = packages/realm
[submodule "packages/shard"]
  path = packages/shard
`.trim();

  const result = validateSubmoduleMap(repoRoot, {
    gitmodulesContent: fixture,
    gitlinks: ['packages/protocol', '../packages/realm', 'ssh://git@example.invalid/repo']
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.unsafeGitlinks, ['../packages/realm', 'ssh://git@example.invalid/repo']);
  assert.deepEqual(result.missingGitlinksForRequired, ['packages/realm', 'packages/shard']);
});

test('live repo has no unsafe gitlink paths', () => {
  const result = validateSubmoduleMap(repoRoot);
  assert.deepEqual(result.unsafeGitlinks, []);
});

test('live repo has no duplicate normalized gitlinks', () => {
  const result = validateSubmoduleMap(repoRoot);
  assert.deepEqual(result.duplicateGitlinks, []);
});
