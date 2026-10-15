#!/usr/bin/env node
// test:unit — runs only the repository's real unit suite under src/__tests__
// by default, including flag-only calls. Explicit selectors stay in that suite.

import { spawnSync } from 'node:child_process';
import { isAbsolute, relative, resolve, sep } from 'node:path';

const extraArgs = process.argv.slice(2);
const args = ['--test', '--experimental-strip-types'];
const selectors = [];
const booleanFlags = new Set([
  '--watch',
  '--watch-preserve-output',
  '--test-only',
]);
const valueFlags = new Set([
  '--test-name-pattern',
  '--test-skip-pattern',
  '--test-reporter',
  '--test-reporter-destination',
  '--test-concurrency',
  '--test-timeout',
  '--test-shard',
]);

function invalid(message) {
  console.error(`test:unit: ${message}`);
  process.exit(1);
}

let optionsEnded = false;
for (let index = 0; index < extraArgs.length; index++) {
  const arg = extraArgs[index];
  if (!optionsEnded && arg === '--') {
    optionsEnded = true;
    continue;
  }
  if (!optionsEnded && arg.startsWith('-')) {
    const equals = arg.indexOf('=');
    const flag = equals === -1 ? arg : arg.slice(0, equals);
    if (booleanFlags.has(flag) && equals === -1) {
      args.push(arg);
    } else if (valueFlags.has(flag)) {
      const value = equals === -1 ? extraArgs[++index] : arg.slice(equals + 1);
      if (!value || value.startsWith('--')) invalid(`${flag} requires a value`);
      args.push(...(equals === -1 ? [flag, value] : [arg]));
    } else {
      invalid(`unsupported option: ${arg}`);
    }
    continue;
  }

  const scopedPath = relative(resolve('src/__tests__'), resolve(arg));
  if (
    !arg ||
    isAbsolute(scopedPath) ||
    scopedPath === '..' ||
    scopedPath.startsWith(`..${sep}`) ||
    arg.split(sep).includes('..') ||
    /[{}]/.test(arg)
  ) {
    invalid(`selector must stay inside src/__tests__: ${JSON.stringify(arg)}`);
  }
  selectors.push(arg);
}

args.push(
  ...(selectors.length === 0 ? ['src/__tests__/*.test.mjs'] : selectors),
);

const result = spawnSync(process.execPath, args, { stdio: 'inherit' });

if (result.error) {
  throw result.error;
}

if (result.signal) {
  process.kill(process.pid, result.signal);
}

process.exit(result.status ?? 0);
