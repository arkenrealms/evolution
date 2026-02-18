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

test('parseGitmodules reports invalid empty path mappings', () => {
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
`.trim();

  const parsed = parseGitmodules(fixture);
  assert.equal(parsed.entries.get('packages/protocol'), 'packages/protocol');
  assert.deepEqual(parsed.invalidMappings, [
    { owner: 'packages/realm', rawPath: '# intentionally blank' },
    { owner: 'packages/shard', rawPath: '; intentionally blank' },
    { owner: 'packages/empty', rawPath: '' },
    { owner: 'packages/quoted-empty', rawPath: '""' },
    { owner: 'packages/single-quoted-empty', rawPath: "''" },
    { owner: 'packages/quoted-space', rawPath: '"   "' }
  ]);
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
    gitlinks: ['./packages/protocol/', 'packages\\realm', 'packages//shard']
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

test('live repo has no duplicate normalized gitlinks', () => {
  const result = validateSubmoduleMap(repoRoot);
  assert.deepEqual(result.duplicateGitlinks, []);
});
