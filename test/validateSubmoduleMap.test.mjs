// arken/packages/evolution/test/validateSubmoduleMap.test.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { parseGitmodules, validateSubmoduleMap } from '../scripts/validateSubmoduleMap.mjs';

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

test('parseGitmodules reports duplicate path mappings deterministically', () => {
  const fixture = `
[submodule "packages/protocol"]
  path = "packages/protocol"
[submodule "packages/protocol-mirror"]
  path = packages/protocol
`.trim();

  const parsed = parseGitmodules(fixture);
  assert.equal(parsed.entries.get('packages/protocol'), 'packages/protocol');
  assert.deepEqual(parsed.duplicateMappings.get('packages/protocol'), [
    'packages/protocol',
    'packages/protocol-mirror'
  ]);
});

test('no duplicate path mappings are present in live .gitmodules', () => {
  const result = validateSubmoduleMap(repoRoot);
  assert.deepEqual(result.duplicateMappings, []);
});
