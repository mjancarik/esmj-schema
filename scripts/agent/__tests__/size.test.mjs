import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { evaluateBudgets } from '../lib/size.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));

// Exercise the real CLI with isolated measurements and budgets: no build or npx.
function invokeSize(args, budget) {
  return spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import childProcess from 'node:child_process';
       import fs from 'node:fs';
       import { syncBuiltinESMExports } from 'node:module';
       childProcess.spawnSync = () => ({ status: 0, stdout: JSON.stringify({ bundle: { gzip: { size: 2636 } } }) });
       fs.existsSync = () => true;
       const readFileSync = fs.readFileSync;
       fs.readFileSync = (path, ...options) => {
         if (typeof path === 'string' && path.endsWith('/package.json')) {
           return JSON.stringify({ name: '@esmj/schema', exports: { '.': {} } });
         }
         if (typeof path === 'string' && path.endsWith('/scripts/size-budgets.json')) {
           return JSON.stringify(${JSON.stringify(budget === null ? {} : { index: budget })});
         }
         return readFileSync(path, ...options);
       };
       syncBuiltinESMExports();
       process.argv = [process.execPath, 'scripts/agent/test-size.mjs', ...${JSON.stringify(args)}];
       await import('./scripts/agent/test-size.mjs');`,
    ],
    { cwd: root, encoding: 'utf8' },
  );
}

test('size scripts select bytes for agents and retain kB for users', () => {
  const { scripts } = JSON.parse(
    readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'),
  );
  assert.equal(scripts['test:size'], 'node scripts/agent/test-size.mjs');
  assert.equal(scripts['agent:test:size'], 'npm run test:size -- --bytes');
});

for (const [args, size, limit] of [
  [[], '2.57 kB', '2.65 kB'],
  [['--bytes'], '2636 bytes', '2716 bytes'],
]) {
  test(`size CLI reports passing measurements and budgets in ${args.length ? 'bytes' : 'kB'}`, () => {
    const result = invokeSize(args, 2716);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.stdout.includes(`index: ${size} gzip (budget ${limit})`));
  });

  test(`size CLI reports exceeded budgets in ${args.length ? 'bytes' : 'kB'}`, () => {
    const result = invokeSize(args, 2635);
    assert.equal(result.status, 1);
    const failedLimit = args.length ? '2635 bytes' : '2.57 kB';
    assert.ok(
      result.stderr.includes(
        `index: ${size} gzip exceeds budget of ${failedLimit}`,
      ),
    );
  });

  test(`size CLI reports informational measurements in ${args.length ? 'bytes' : 'kB'}`, () => {
    const result = invokeSize(args, null);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(
      result.stdout.includes(
        `index: ${size} gzip (no budget set — informational only)`,
      ),
    );
  });
}

test('evaluateBudgets passes when every measurement is within budget', () => {
  const { results, failed } = evaluateBudgets({ index: 2800 }, { index: 3000 });
  assert.equal(failed, false);
  assert.deepEqual(results, [
    { entry: 'index', size: 2800, budget: 3000, status: 'pass' },
  ]);
});

test('evaluateBudgets fails when a measurement exceeds its budget', () => {
  const { results, failed } = evaluateBudgets({ index: 3200 }, { index: 3000 });
  assert.equal(failed, true);
  assert.deepEqual(results, [
    { entry: 'index', size: 3200, budget: 3000, status: 'fail' },
  ]);
});

test('evaluateBudgets treats a missing budget as informational, not a failure', () => {
  const { results, failed } = evaluateBudgets({ newEntry: 1234 }, {});
  assert.equal(failed, false);
  assert.deepEqual(results, [
    { entry: 'newEntry', size: 1234, budget: null, status: 'informational' },
  ]);
});

test('evaluateBudgets does not let a later pass mask an earlier failure', () => {
  const { failed } = evaluateBudgets({ a: 3200, b: 100 }, { a: 3000, b: 1000 });
  assert.equal(failed, true);
});
