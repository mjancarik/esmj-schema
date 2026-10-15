import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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

test('runGate returns 0 when every step succeeds', (t) => {
  const logs = t.mock.method(console, 'log', () => {});
  const code = runGate([okStep('a'), okStep('b'), okStep('c')]);
  assert.equal(code, 0);
  const output = logs.mock.calls
    .map(({ arguments: args }) => args.join(' '))
    .join('\n');
  assert.match(output, /PASS a \(exit 0\)/);
  assert.match(output, /PASS b \(exit 0\)/);
  assert.match(output, /PASS c \(exit 0\)/);
  assert.match(output, /Gate exit code: 0/);
});

test('runGate stops at the first failing step and propagates its exit code', (t) => {
  const logs = t.mock.method(console, 'log', () => {});
  t.mock.method(console, 'error', () => {});
  const steps = [okStep('a'), failStep('b', 7), okStep('c')];
  const code = runGate(steps);
  assert.equal(code, 7);
  const output = logs.mock.calls
    .map(({ arguments: args }) => args.join(' '))
    .join('\n');
  assert.match(output, /PASS a \(exit 0\)/);
  assert.match(output, /FAIL b \(exit 7\)/);
  assert.match(output, /NOT RUN c \(exit N\/A\)/);
  assert.doesNotMatch(output, /▶ c:/);
  assert.match(output, /Gate exit code: 7/);
});

test('runGate reports empty gate as success', () => {
  const code = runGate([]);
  assert.equal(code, 0);
});

test('runGate preserves child termination signals', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import { runGate } from ${JSON.stringify(new URL('../lib/run.mjs', import.meta.url).href)};
    runGate([{ name: 'signal', command: process.execPath,
      args: ['-e', 'process.kill(process.pid, "SIGTERM")'] }]);
  `,
    ],
    { encoding: 'utf8' },
  );
  assert.equal(result.signal, 'SIGTERM');
  assert.doesNotMatch(result.stdout, /PASS signal|Gate exit code: 0/);
});
