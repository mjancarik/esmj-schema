#!/usr/bin/env node
// agent:doctor — read-only preflight. No installs, no fixes, no process killing.

import { spawnSync } from 'node:child_process';
import { nodeVersionStatus } from './lib/doctor-checks.mjs';

const MIN_NODE_MAJOR = 22; // required for --experimental-strip-types (npm test)
const RECOMMENDED_NODE_MAJOR = 24; // matches .github/workflows/ci.yml

let failed = false;

function ok(message) {
  console.log(`\u2713 ${message}`);
}

function warn(message) {
  console.warn(`\u26A0 ${message}`);
}

function fail(message) {
  console.error(`\u2716 ${message}`);
  failed = true;
}

// 1. Node version
const nodeStatus = nodeVersionStatus(
  process.versions.node,
  MIN_NODE_MAJOR,
  RECOMMENDED_NODE_MAJOR,
);
if (nodeStatus.level === 'fail') {
  fail(
    `Node ${process.versions.node} detected, need >= ${MIN_NODE_MAJOR} (required by "npm test"'s --experimental-strip-types). Install/select a newer Node.`,
  );
} else if (nodeStatus.level === 'warn') {
  warn(
    `Node ${process.versions.node} detected; CI uses Node ${RECOMMENDED_NODE_MAJOR}. Not a failure, but results may differ from CI.`,
  );
} else {
  ok(`Node ${process.versions.node}`);
}

// 2. npm available
const npmVersion = spawnSync('npm', ['--version'], { encoding: 'utf8' });
if (npmVersion.error || npmVersion.status !== 0) {
  fail('npm not found on PATH.');
} else {
  ok(`npm ${npmVersion.stdout.trim()}`);
}

// 3. Dependency tree integrity (read-only; npm ls does not install)
const npmLs = spawnSync('npm', ['ls', '--depth=0'], { encoding: 'utf8' });
if (npmLs.status !== 0) {
  fail(
    'npm ls --depth=0 reports an invalid/missing dependency tree. Run "npm install" (not run automatically).',
  );
  if (npmLs.stdout) console.error(npmLs.stdout.trim());
} else {
  ok('dependency tree matches package.json (npm ls --depth=0)');
}

// 4. Git dirty-tree notice (informational only, never fails the doctor)
const gitStatus = spawnSync('git', ['status', '--porcelain'], {
  encoding: 'utf8',
});
if (gitStatus.error) {
  warn('git not found on PATH — skipping working-tree notice.');
} else if (gitStatus.status !== 0) {
  warn('not a git repository (or git error) — skipping working-tree notice.');
} else {
  const lines = gitStatus.stdout.split('\n').filter(Boolean);
  if (lines.length === 0) {
    ok('working tree clean');
  } else {
    warn(
      `working tree has ${lines.length} changed/untracked path(s) — not a failure, just a notice.`,
    );
  }
}

if (failed) {
  console.error(
    '\nagent:doctor found actionable issues above. Not fixed automatically.',
  );
  process.exit(1);
}

console.log('\nagent:doctor: all read-only preflight checks passed.');
