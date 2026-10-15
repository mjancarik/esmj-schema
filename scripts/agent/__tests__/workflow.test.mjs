import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const reporter = './scripts/agent/lib/reporter.mjs';

// Exercise composition without invoking real checks or touching git state.
function invokeGate(script, failAt = -1) {
  return spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import childProcess from 'node:child_process';
    import { syncBuiltinESMExports } from 'node:module';
    let index = 0;
    childProcess.spawnSync = (command, args) => {
      console.log('CALL ' + JSON.stringify({ command, args }));
      return { status: index++ === ${failAt} ? 7 : 0 };
    };
    syncBuiltinESMExports();
    await import(${JSON.stringify(`../${script}`)});
  `,
    ],
    { cwd: join(root, 'scripts/agent/__tests__'), encoding: 'utf8' },
  );
}

function calls(result) {
  return result.stdout
    .split('\n')
    .filter((line) => line.startsWith('CALL '))
    .map((line) => JSON.parse(line.slice(5)));
}

const allScripts = [
  'agent:doctor',
  'agent:check:guidance',
  'agent:verify',
  'agent:test:tooling',
  'agent:check:whitespace',
];

test('complete gate composes predefined scripts in order', () => {
  const result = invokeGate('verify-all.mjs');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    calls(result),
    allScripts.map((name) => ({ command: 'npm', args: ['run', name] })),
  );
  assert.match(result.stdout, /Gate exit code: 0/);
});

for (let index = 0; index < allScripts.length; index++) {
  test(`complete gate stops at ${allScripts[index]} failure`, () => {
    const result = invokeGate('verify-all.mjs', index);
    assert.equal(result.status, 7, result.stderr);
    assert.equal(calls(result).length, index + 1);
    assert.ok(result.stdout.includes(`FAIL ${allScripts[index]} (exit 7)`));
    for (const name of allScripts.slice(index + 1)) {
      assert.ok(result.stdout.includes(`NOT RUN ${name} (exit N/A)`));
    }
  });
}

test('whitespace gate checks unstaged and staged diffs without writes', () => {
  const result = invokeGate('check-whitespace.mjs');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(calls(result), [
    { command: 'git', args: ['diff', '--check'] },
    { command: 'git', args: ['diff', '--cached', '--check'] },
  ]);
});

test('whitespace failure stops the gate and retains the failing exit', () => {
  const result = invokeGate('check-whitespace.mjs', 0);
  assert.equal(result.status, 7);
  assert.equal(calls(result).length, 1);
  assert.match(result.stdout, /NOT RUN staged whitespace/);
});

test('CI-parity gate retains check order and uses agent unit output', () => {
  const result = invokeGate('verify.mjs');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    calls(result).map(({ args }) => args[1]),
    ['agent:test:unit', 'typecheck', 'lint', 'build', 'agent:test:size'],
  );
});

test('npm scripts select concise agent reporters without changing user tests', () => {
  const { scripts } = JSON.parse(
    readFileSync(join(root, 'package.json'), 'utf8'),
  );
  assert.equal(
    scripts['agent:verify:all'],
    'node scripts/agent/verify-all.mjs',
  );
  assert.equal(
    scripts['agent:check:whitespace'],
    'node scripts/agent/check-whitespace.mjs',
  );
  assert.equal(
    scripts['agent:test:unit'],
    `npm run test:unit -- --test-reporter=${reporter}`,
  );
  assert.ok(
    scripts['agent:test:tooling'].includes(`--test-reporter=${reporter}`),
  );
  assert.equal(scripts['test:unit'], 'node scripts/agent/test-unit.mjs');
  assert.equal(scripts.test, 'npm run test:unit');
});

for (const fails of [false, true]) {
  test(`concise native reporter retains totals and diagnostics (${fails ? 'failure' : 'success'})`, (t) => {
    const tmp = join(root, 'tmp');
    mkdirSync(tmp, { recursive: true });
    const dir = mkdtempSync(join(tmp, 'reporter-test-'));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const fixture = join(dir, 'fixture.test.mjs');
    writeFileSync(
      fixture,
      `
      import { test, describe } from 'node:test';
      import assert from 'node:assert/strict';
      describe('nested suite', () => {
        test('passing progress hidden', (t) => {
          console.log('stdout retained');
          console.error('stderr retained');
          t.diagnostic('diagnostic retained');
        });
        test.skip('skip retained', () => {});
        test.todo('todo retained');
        ${fails ? "test('failure retained', () => assert.equal('actual value', 'expected value'));" : ''}
      });
    `,
    );
    const env = { ...process.env };
    env.NODE_TEST_CONTEXT = undefined;
    const result = spawnSync(
      process.execPath,
      ['--test', `--test-reporter=${reporter}`, fixture],
      { cwd: root, encoding: 'utf8', env },
    );
    const output = result.stdout + result.stderr;
    assert.equal(result.status, fails ? 1 : 0, output);
    assert.doesNotMatch(output, /passing progress hidden/);
    for (const text of [
      'stdout retained',
      'stderr retained',
      'diagnostic retained',
      'skip retained',
      'todo retained',
    ]) {
      assert.ok(output.includes(text), output);
    }
    assert.match(output, /tests \d+/);
    assert.match(output, /suites 1/);
    assert.match(output, /pass 1/);
    assert.match(output, new RegExp(`fail ${fails ? 1 : 0}`));
    assert.match(output, /skipped 1/);
    assert.match(output, /todo 1/);
    if (fails) {
      for (const text of [
        'failure retained',
        'actual value',
        'expected value',
        'fixture.test.mjs',
      ]) {
        assert.ok(output.includes(text), output);
      }
    }
  });
}
