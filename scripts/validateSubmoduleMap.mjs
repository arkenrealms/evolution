// arken/packages/evolution/scripts/validateSubmoduleMap.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function stripInlineComment(rawValue) {
  let quote = null;
  let escaped = false;

  for (let i = 0; i < rawValue.length; i += 1) {
    const ch = rawValue[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      escaped = true;
      continue;
    }

    if (ch === '"' || ch === "'") {
      if (!quote) {
        quote = ch;
      } else if (quote === ch) {
        quote = null;
      }
      continue;
    }

    if (!quote && (ch === '#' || ch === ';')) {
      return rawValue.slice(0, i).trim();
    }
  }

  return rawValue.trim();
}

export function normalizeSubmodulePath(value) {
  let normalized = stripInlineComment(String(value ?? '').trim());
  normalized = normalized
    .replace(/^"(.*)"$/, '$1')
    .replace(/^'(.*)'$/, '$1')
    .trim()
    .replace(/\\([#;])/g, '$1')
    .replace(/\\/g, '/');

  while (normalized.startsWith('./')) {
    normalized = normalized.slice(2);
  }

  normalized = normalized.replace(/\/+/g, '/').replace(/\/+$/, '');
  normalized = normalized
    .split('/')
    .filter((segment) => segment !== '.')
    .join('/');
  return normalized;
}

function isInvalidSubmodulePath(mappedPath) {
  if (!mappedPath) return true;
  if (mappedPath.startsWith('/')) return true;
  if (/^[A-Za-z]:\//.test(mappedPath)) return true;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(mappedPath)) return true;
  return mappedPath.split('/').includes('..');
}

export function parseGitmodules(gitmodulesContent) {
  const lines = String(gitmodulesContent ?? '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/);
  const entries = new Map();
  const duplicateMappings = new Map();
  const ownerMappings = new Map();
  const ownerPathConflicts = new Map();
  const ownerStates = new Map();
  const invalidMappings = [];
  let current;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const normalizedSectionLine = stripInlineComment(rawLine).trim();
    const section = normalizedSectionLine.match(/^\[\s*submodule\s+"(.+)"\s*\]$/i);
    if (section) {
      current = section[1];
      if (!ownerStates.has(current)) {
        ownerStates.set(current, { sawPathLine: false, hasValidMapping: false });
      }
      continue;
    }

    if (!current) continue;

    const match = line.match(/^path\s*=\s*(.*)$/i);
    if (!match) continue;

    const ownerState = ownerStates.get(current);
    if (ownerState) {
      ownerState.sawPathLine = true;
    }

    const mappedPath = normalizeSubmodulePath(match[1]);
    if (isInvalidSubmodulePath(mappedPath)) {
      invalidMappings.push({ owner: current, rawPath: match[1] });
      continue;
    }

    const priorPathForOwner = ownerMappings.get(current);
    if (priorPathForOwner && priorPathForOwner !== mappedPath) {
      const conflictPaths = ownerPathConflicts.get(current) ?? new Set([priorPathForOwner]);
      conflictPaths.add(mappedPath);
      ownerPathConflicts.set(current, conflictPaths);
      continue;
    }
    if (!priorPathForOwner) {
      ownerMappings.set(current, mappedPath);
    }
    if (ownerState) {
      ownerState.hasValidMapping = true;
    }

    if (entries.has(mappedPath)) {
      const prior = entries.get(mappedPath);
      if (prior === current) {
        continue;
      }
      const dupes = new Set(duplicateMappings.get(mappedPath) ?? [prior]);
      dupes.add(current);
      duplicateMappings.set(mappedPath, [...dupes]);
      continue;
    }

    entries.set(mappedPath, current);
  }

  const missingPathOwners = [...ownerStates.entries()]
    .filter(([, state]) => !state.sawPathLine)
    .map(([owner]) => owner);
  const ownersWithoutValidPath = [...ownerStates.entries()]
    .filter(([, state]) => state.sawPathLine && !state.hasValidMapping)
    .map(([owner]) => owner);

  return {
    entries,
    duplicateMappings,
    ownerPathConflicts: [...ownerPathConflicts.entries()].map(([owner, paths]) => ({
      owner,
      paths: [...paths]
    })),
    missingPathOwners,
    ownersWithoutValidPath,
    invalidMappings
  };
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
  const { entries: mapping, duplicateMappings, ownerPathConflicts, missingPathOwners, ownersWithoutValidPath, invalidMappings } = parseGitmodules(
    resolvedGitmodulesContent
  );
  const resolvedGitlinkCandidates = (gitlinks ?? listGitlinkPaths(repoRoot)).map((rawPath) => ({
    rawPath,
    normalizedPath: normalizeSubmodulePath(rawPath)
  }));
  const invalidGitlinks = resolvedGitlinkCandidates
    .filter(({ normalizedPath }) => !normalizedPath)
    .map(({ rawPath }) => String(rawPath));
  const resolvedGitlinks = resolvedGitlinkCandidates
    .map(({ normalizedPath }) => normalizedPath)
    .filter(Boolean);

  const gitlinkOccurrences = new Map();
  for (const gitlinkPath of resolvedGitlinks) {
    gitlinkOccurrences.set(gitlinkPath, (gitlinkOccurrences.get(gitlinkPath) ?? 0) + 1);
  }

  const normalizedRequiredCandidates = requiredPaths.map((rawPath) => ({
    rawPath,
    normalizedPath: normalizeSubmodulePath(rawPath)
  }));
  const normalizedIgnoredCandidates = ignoredGitlinks.map((rawPath) => ({
    rawPath,
    normalizedPath: normalizeSubmodulePath(rawPath)
  }));

  const invalidRequiredPaths = normalizedRequiredCandidates
    .filter(({ normalizedPath }) => !normalizedPath)
    .map(({ rawPath }) => String(rawPath));
  const invalidIgnoredPaths = normalizedIgnoredCandidates
    .filter(({ normalizedPath }) => !normalizedPath)
    .map(({ rawPath }) => String(rawPath));
  const unsafeRequiredPaths = normalizedRequiredCandidates
    .filter(({ normalizedPath }) => normalizedPath && isInvalidSubmodulePath(normalizedPath))
    .map(({ rawPath }) => String(rawPath));
  const unsafeIgnoredPaths = normalizedIgnoredCandidates
    .filter(({ normalizedPath }) => normalizedPath && isInvalidSubmodulePath(normalizedPath))
    .map(({ rawPath }) => String(rawPath));

  const requiredNormalizedValues = normalizedRequiredCandidates
    .map(({ normalizedPath }) => normalizedPath)
    .filter(Boolean);
  const ignoredNormalizedValues = normalizedIgnoredCandidates
    .map(({ normalizedPath }) => normalizedPath)
    .filter(Boolean);

  const duplicateRequiredPaths = [...new Set(requiredNormalizedValues.filter((p, i) => requiredNormalizedValues.indexOf(p) !== i))];
  const duplicateIgnoredPaths = [...new Set(ignoredNormalizedValues.filter((p, i) => ignoredNormalizedValues.indexOf(p) !== i))];

  const normalizedRequiredPaths = [...new Set(requiredNormalizedValues)];
  const normalizedIgnoredGitlinks = [...new Set(ignoredNormalizedValues)];

  const gitlinkSet = new Set(resolvedGitlinks);
  const invalidIgnoredRequiredOverlap = normalizedRequiredPaths.filter((p) => normalizedIgnoredGitlinks.includes(p));
  const duplicateGitlinks = [...gitlinkOccurrences.entries()]
    .filter(([, count]) => count > 1)
    .map(([gitlinkPath, count]) => ({ path: gitlinkPath, count }));

  const missingRequired = normalizedRequiredPaths.filter((p) => !mapping.has(p));
  const missingGitlinksForRequired = normalizedRequiredPaths.filter((p) => mapping.has(p) && !gitlinkSet.has(p));
  const unexpectedGitlinks = [...new Set(
    resolvedGitlinks.filter((p) => !mapping.has(p) && !normalizedIgnoredGitlinks.includes(p))
  )].sort();
  const mappedWithoutGitlink = [...mapping.keys()]
    .filter((p) => !gitlinkSet.has(p))
    .filter((p) => !normalizedIgnoredGitlinks.includes(p))
    .sort();

  return {
    ok:
      missingRequired.length === 0 &&
      missingGitlinksForRequired.length === 0 &&
      unexpectedGitlinks.length === 0 &&
      mappedWithoutGitlink.length === 0 &&
      duplicateMappings.size === 0 &&
      ownerPathConflicts.length === 0 &&
      missingPathOwners.length === 0 &&
      ownersWithoutValidPath.length === 0 &&
      invalidMappings.length === 0 &&
      duplicateGitlinks.length === 0 &&
      invalidIgnoredRequiredOverlap.length === 0 &&
      invalidRequiredPaths.length === 0 &&
      invalidIgnoredPaths.length === 0 &&
      unsafeRequiredPaths.length === 0 &&
      unsafeIgnoredPaths.length === 0 &&
      invalidGitlinks.length === 0 &&
      duplicateRequiredPaths.length === 0 &&
      duplicateIgnoredPaths.length === 0,
    missingRequired,
    missingGitlinksForRequired,
    unexpectedGitlinks,
    mappedWithoutGitlink,
    invalidIgnoredRequiredOverlap,
    invalidRequiredPaths,
    invalidIgnoredPaths,
    unsafeRequiredPaths,
    unsafeIgnoredPaths,
    invalidGitlinks,
    duplicateRequiredPaths,
    duplicateIgnoredPaths,
    duplicateGitlinks,
    duplicateMappings: [...duplicateMappings.entries()].map(([pathKey, owners]) => ({
      path: pathKey,
      owners
    })),
    ownerPathConflicts,
    missingPathOwners,
    ownersWithoutValidPath,
    invalidMappings,
    mappedPaths: [...mapping.keys()].sort(),
    gitlinks: [...resolvedGitlinks].sort(),
    requiredPaths: normalizedRequiredPaths,
    ignoredGitlinks: normalizedIgnoredGitlinks
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
  if (result.invalidMappings.length) {
    const invalidSummary = result.invalidMappings
      .map(({ owner, rawPath }) => `${owner} => ${String(rawPath).trim() || '<empty>'}`)
      .join('; ');
    console.error(`Invalid empty .gitmodules path mappings: ${invalidSummary}`);
  }
  if (result.missingPathOwners.length) {
    console.error(`Submodule sections missing path mappings: ${result.missingPathOwners.join(', ')}`);
  }
  if (result.ownersWithoutValidPath.length) {
    console.error(`Submodule sections without any valid path mapping: ${result.ownersWithoutValidPath.join(', ')}`);
  }
  if (result.ownerPathConflicts.length) {
    const ownerConflictSummary = result.ownerPathConflicts
      .map(({ owner, paths }) => `${owner} => ${paths.join(' <> ')}`)
      .join('; ');
    console.error(`Conflicting owner path mappings: ${ownerConflictSummary}`);
  }
  if (result.duplicateGitlinks.length) {
    const duplicateGitlinkSummary = result.duplicateGitlinks
      .map(({ path: gitlinkPath, count }) => `${gitlinkPath} (${count}x)`)
      .join('; ');
    console.error(`Duplicate normalized gitlinks in HEAD listing: ${duplicateGitlinkSummary}`);
  }
  if (result.invalidIgnoredRequiredOverlap.length) {
    console.error(
      `Invalid config: required paths cannot also be ignored (${result.invalidIgnoredRequiredOverlap.join(', ')})`
    );
  }
  if (result.invalidRequiredPaths.length) {
    console.error(`Invalid config: required paths include empty values (${result.invalidRequiredPaths.join(', ')})`);
  }
  if (result.invalidIgnoredPaths.length) {
    console.error(`Invalid config: ignored paths include empty values (${result.invalidIgnoredPaths.join(', ')})`);
  }
  if (result.unsafeRequiredPaths.length) {
    console.error(`Invalid config: required paths include unsafe values (${result.unsafeRequiredPaths.join(', ')})`);
  }
  if (result.unsafeIgnoredPaths.length) {
    console.error(`Invalid config: ignored paths include unsafe values (${result.unsafeIgnoredPaths.join(', ')})`);
  }
  if (result.invalidGitlinks.length) {
    console.error(`Invalid gitlink paths include empty values (${result.invalidGitlinks.join(', ')})`);
  }
  if (result.duplicateRequiredPaths.length) {
    console.error(
      `Invalid config: required paths include duplicates (${result.duplicateRequiredPaths.join(', ')})`
    );
  }
  if (result.duplicateIgnoredPaths.length) {
    console.error(
      `Invalid config: ignored paths include duplicates (${result.duplicateIgnoredPaths.join(', ')})`
    );
  }
  process.exit(1);
}
