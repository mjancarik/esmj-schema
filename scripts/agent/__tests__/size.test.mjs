import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateBudgets } from '../lib/size.mjs';

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
