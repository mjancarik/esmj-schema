#!/usr/bin/env node
// test:unit — runs only the repository's real unit suite under src/__tests__
// by default. If explicit selectors/flags are passed, forward only those.

import { spawnSync } from 'node:child_process';

const extraArgs = process.argv.slice(2);
const args = ['--test', '--experimental-strip-types'];

if (extraArgs.length === 0) {
  args.push('src/__tests__/*.test.mjs');
} else {
  args.push(...extraArgs);
}

const result = spawnSync(process.execPath, args, { stdio: 'inherit' });

if (result.error) {
  throw result.error;
}

if (result.signal) {
  process.kill(process.pid, result.signal);
}

process.exit(result.status ?? 0);
