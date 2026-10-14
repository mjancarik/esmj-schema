import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runGate } from '../lib/run.mjs';

// Isolated fixtures: real child processes, but ephemeral `node -e` one-liners
// that only exit with a controlled code — no shared resources, no repo state.

function okStep(name) {
  return { name, command: process.execPath, args: ['-e', 'process.exit(0)'] };
}

function failStep(name, code = 2) {
  return {
    name,
    command: process.execPath,
    args: ['-e', `process.exit(${code})`],
  };
}

test('runGate returns 0 when every step succeeds', () => {
  const code = runGate([okStep('a'), okStep('b'), okStep('c')]);
  assert.equal(code, 0);
});

test('runGate stops at the first failing step and propagates its exit code', () => {
  const steps = [okStep('a'), failStep('b', 7), okStep('c')];
  const code = runGate(steps);
  assert.equal(code, 7);
});

test('runGate reports empty gate as success', () => {
  const code = runGate([]);
  assert.equal(code, 0);
});
