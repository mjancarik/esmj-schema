import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nodeVersionStatus } from '../lib/doctor-checks.mjs';

test('nodeVersionStatus fails below the minimum', () => {
  assert.equal(nodeVersionStatus('20.10.0', 22, 24).level, 'fail');
});

test('nodeVersionStatus warns between minimum and recommended', () => {
  assert.equal(nodeVersionStatus('22.6.0', 22, 24).level, 'warn');
});

test('nodeVersionStatus is ok at or above recommended', () => {
  assert.equal(nodeVersionStatus('24.0.0', 22, 24).level, 'ok');
  assert.equal(nodeVersionStatus('25.1.0', 22, 24).level, 'ok');
});
