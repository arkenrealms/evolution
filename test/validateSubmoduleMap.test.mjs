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
  assert.equal(normalizeSubmodulePath('packages\\shard'), 'packages/shard');
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
