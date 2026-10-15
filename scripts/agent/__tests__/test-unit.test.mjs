import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const unitGlob = 'src/__tests__/*.test.mjs';
const unitFile = 'src/__tests__/index.test.mjs';
const baseArgs = ['--test', '--experimental-strip-types'];

// Exercise the real CLI without launching discovery, watch mode, or size tests.
// Sync the builtin export so the runner's ESM import sees the intercepted spawn.
function invoke(args) {
  return spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import childProcess from 'node:child_process';
       import { syncBuiltinESMExports } from 'node:module';
       childProcess.spawnSync = (command, args) => {
         console.log(JSON.stringify({ command, args }));
         return { status: 0 };
       };
       syncBuiltinESMExports();
       process.argv = [process.execPath, 'scripts/agent/test-unit.mjs', ...${JSON.stringify(args)}];
       await import('./scripts/agent/test-unit.mjs');`,
    ],
    { cwd: root, encoding: 'utf8' },
  );
}

function expectArgs(input, expected) {
  const result = invoke(input);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    command: process.execPath,
    args: [...baseArgs, ...expected],
  });
}

test('unit runner defaults to the unit glob', () => {
  expectArgs([], [unitGlob]);
});

for (const flags of [
  ['--watch'],
  ['--test-name-pattern', 'nullable'],
  ['--test-name-pattern=nullable'],
  ['--test-skip-pattern', 'src/not-a-selector'],
  ['--test-reporter', 'spec', '--test-concurrency', '2'],
  ['--test-timeout=5000', '--test-shard', '1/2'],
  ['--test-reporter', 'tap', '--test-reporter-destination', 'stdout'],
  ['--test-only'],
  ['--watch', '--watch-preserve-output'],
  ['--'],
]) {
  test(`unit runner retains the unit glob for ${flags.join(' ')}`, () => {
    expectArgs(flags, [...flags.filter((flag) => flag !== '--'), unitGlob]);
  });
}

for (const selector of [
  unitFile,
  './src/__tests__/index.test.mjs',
  `${root}${unitFile}`,
  'src/__tests__',
  unitGlob,
]) {
  test(`unit runner forwards explicit unit selection ${selector}`, () => {
    expectArgs([selector], [selector]);
  });
}

test('unit runner keeps flags before explicit selectors and does not add the glob', () => {
  expectArgs(
    [unitFile, '--test-name-pattern', 'nullable'],
    ['--test-name-pattern', 'nullable', unitFile],
  );
});

test('unit runner forwards multiple explicit selectors', () => {
  const second = 'src/__tests__/array-edge-cases.test.mjs';
  expectArgs([unitFile, second], [unitFile, second]);
});

test('unit runner supports the end-of-options separator', () => {
  expectArgs(['--', unitFile], [unitFile]);
});

for (const args of [
  ['scripts/agent/test-size.mjs'],
  ['scripts/agent/__tests__'],
  [`${root}scripts/agent/test-size.mjs`],
  ['src/__tests__/../../scripts/agent/test-size.mjs'],
  ['src/__tests__-outside/index.test.mjs'],
  ['src/__tests__/{index.test.mjs,../../scripts/agent/test-size.mjs}'],
  [unitFile, 'scripts/agent/test-size.mjs'],
  [''],
  ['--', ''],
  ['--test-name-pattern'],
  ['--test-name-pattern='],
  ['--test-reporter', ''],
  ['--test-name-pattern', '--watch'],
  ['--watch=true'],
  ['--unknown-option'],
]) {
  test(`unit runner rejects invalid arguments before spawning: ${JSON.stringify(args)}`, () => {
    const result = invoke(args);
    assert.notEqual(result.status, 0);
    assert.equal(
      result.stdout,
      '',
      'must not launch a child for invalid arguments',
    );
    assert.match(result.stderr, /test:unit:/);
  });
}
