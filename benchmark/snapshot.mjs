// Direct same-process comparison: node --expose-gc benchmark/snapshot.mjs <saved-source.ts>
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { performance } from 'node:perf_hooks';

if (!process.argv[2]) throw new Error('Provide the saved baseline TypeScript source path');
async function load(source, label) {
  return (await import(`data:text/javascript;base64,${Buffer.from(`${stripTypeScriptTypes(source)}\n// ${label}`).toString('base64')}`)).s;
}
const before = await load(readFileSync(process.argv[2], 'utf8'), 'baseline');
const after = await load(readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8'), 'candidate');
const id = Symbol('id');
const shapes = [
  ['tiny', (s) => s.object({ text: s.string() }), { text: 'ok' }, { text: 42 }],
  ['nested', (s) => s.object({ name: s.string(), count: s.number(), rows: s.array(s.object({ text: s.string(), depth: s.number().default(0) })) }), { name: 'ok', count: 3, rows: [{ text: 'one' }, { text: 'two' }] }, { name: 'ok', count: 3, rows: [{ text: 42 }] }],
  ['symbols', (s) => s.object({ text: s.string(), [id]: s.string().default('id') }), { text: 'ok' }, { text: 'ok', [id]: 42 }],
];
function measure(fn) {
  const start = performance.now();
  let count = 0;
  do {
    // Make each result escape so timings cannot discard the parsed output.
    for (let i = 0; i < 1000; i++) globalThis.__schemaBenchmarkResult = fn();
    count += 1000;
  } while (performance.now() - start < 1000);
  return count * 1000 / (performance.now() - start);
}
let passed = true;
console.log(JSON.stringify({ node: process.version, baseline: process.argv[2], samples: 10, sampleSeconds: 1 }));
for (const [shape, make, good, bad] of shapes) {
  const oldSchema = make(before);
  const newSchema = make(after);
  assert.deepEqual(newSchema.safeParse(good), oldSchema.safeParse(good));
  assert.deepEqual(newSchema.safeParse(bad), oldSchema.safeParse(bad));
  for (const [workload, oldFn, newFn] of [
    ['construction', () => make(before), () => make(after)],
    ['valid parsing', () => oldSchema.safeParse(good), () => newSchema.safeParse(good)],
    ['invalid parsing', () => oldSchema.safeParse(bad), () => newSchema.safeParse(bad)],
  ]) {
    for (let i = 0; i < 20000; i++) { oldFn(); newFn(); }
    const samples = [[], []];
    const fns = [oldFn, newFn];
    for (let sample = 0; sample < 10; sample++) {
      for (const index of sample % 2 ? [1, 0] : [0, 1]) {
        globalThis.gc?.();
        samples[index].push(measure(fns[index]));
      }
    }
    const means = samples.map((values) => values.reduce((sum, value) => sum + value, 0) / values.length);
    const ok = means[1] >= means[0];
    passed &&= ok;
    console.log(JSON.stringify({ shape, workload, baselineOps: means[0], candidateOps: means[1], throughputDeltaPercent: (means[1] / means[0] - 1) * 100, baselineSamples: samples[0], candidateSamples: samples[1], passed: ok }));
  }
}
console.log(`Direct comparison non-regression gate: ${passed ? 'PASS' : 'FAIL'}`);
if (!passed) process.exitCode = 1;