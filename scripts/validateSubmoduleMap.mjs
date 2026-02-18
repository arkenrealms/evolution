// arken/packages/evolution/scripts/validateSubmoduleMap.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export function normalizeSubmodulePath(value) {
  return value
    .trim()
    .replace(/^"(.+)"$/, '$1')
    .replace(/\\/g, '/')
    .replace(/\/+$|^\.\//g, '');
}

export function parseGitmodules(gitmodulesContent) {
  const lines = gitmodulesContent.split(/\r?\n/);
  const entries = new Map();
  const duplicateMappings = new Map();
  let current;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const section = line.match(/^\[submodule\s+"(.+)"\]$/);
    if (section) {
      current = section[1];
      continue;
    }

    if (!current) continue;

    const match = line.match(/^path\s*=\s*(.+)$/);
    if (!match) continue;

    const mappedPath = normalizeSubmodulePath(match[1]);
    if (entries.has(mappedPath)) {
      const prior = entries.get(mappedPath);
      const dupes = duplicateMappings.get(mappedPath) ?? [prior];
      dupes.push(current);
      duplicateMappings.set(mappedPath, dupes);
      continue;
    }

    entries.set(mappedPath, current);
  }

  return { entries, duplicateMappings };
}

export function listGitlinkPaths(repoRoot) {
  const out = execFileSync('git', ['ls-tree', '-r', '--full-tree', 'HEAD', 'packages'], {
    cwd: repoRoot,
    encoding: 'utf8'
  });

  return out
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => line.startsWith('160000 commit '))
    .map((line) => line.match(/\t(.+)$/)?.[1])
    .filter(Boolean)
    .filter((p) => p.startsWith('packages/'));
}

export function validateSubmoduleMap(
  repoRoot,
  {
    requiredPaths = ['packages/protocol', 'packages/realm', 'packages/shard'],
    ignoredGitlinks = ['packages/client'],
    gitmodulesContent,
    gitlinks
  } = {}
) {
  const gitmodulesPath = path.join(repoRoot, '.gitmodules');
  const resolvedGitmodulesContent = gitmodulesContent ?? fs.readFileSync(gitmodulesPath, 'utf8');
  const { entries: mapping, duplicateMappings } = parseGitmodules(resolvedGitmodulesContent);
  const resolvedGitlinks = gitlinks ?? listGitlinkPaths(repoRoot);

  const missingRequired = requiredPaths.filter((p) => !mapping.has(p));
  const missingGitlinksForRequired = requiredPaths.filter((p) => mapping.has(p) && !resolvedGitlinks.includes(p));
  const unexpectedGitlinks = resolvedGitlinks.filter((p) => !mapping.has(p) && !ignoredGitlinks.includes(p));
  const mappedWithoutGitlink = [...mapping.keys()]
    .filter((p) => !resolvedGitlinks.includes(p))
    .filter((p) => !ignoredGitlinks.includes(p));

  return {
    ok:
      missingRequired.length === 0 &&
      missingGitlinksForRequired.length === 0 &&
      unexpectedGitlinks.length === 0 &&
      mappedWithoutGitlink.length === 0 &&
      duplicateMappings.size === 0,
    missingRequired,
    missingGitlinksForRequired,
    unexpectedGitlinks,
    mappedWithoutGitlink,
    duplicateMappings: [...duplicateMappings.entries()].map(([pathKey, owners]) => ({
      path: pathKey,
      owners
    })),
    mappedPaths: [...mapping.keys()].sort(),
    gitlinks: [...resolvedGitlinks].sort(),
    ignoredGitlinks
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = validateSubmoduleMap(process.cwd());
  if (result.ok) {
    console.log('Submodule mapping check passed.');
    process.exit(0);
  }

  console.error('Submodule mapping check failed.');
  if (result.missingRequired.length) {
    console.error(`Missing required .gitmodules paths: ${result.missingRequired.join(', ')}`);
  }
  if (result.missingGitlinksForRequired.length) {
    console.error(`Required mappings missing gitlinks in HEAD: ${result.missingGitlinksForRequired.join(', ')}`);
  }
  if (result.unexpectedGitlinks.length) {
    console.error(`Unexpected unmapped gitlinks: ${result.unexpectedGitlinks.join(', ')}`);
  }
  if (result.mappedWithoutGitlink.length) {
    console.error(`Mapped paths without gitlinks in HEAD: ${result.mappedWithoutGitlink.join(', ')}`);
  }
  if (result.duplicateMappings.length) {
    const duplicateSummary = result.duplicateMappings
      .map(({ path: mappedPath, owners }) => `${mappedPath} => ${owners.join(' | ')}`)
      .join('; ');
    console.error(`Duplicate .gitmodules path mappings: ${duplicateSummary}`);
  }
  process.exit(1);
}
