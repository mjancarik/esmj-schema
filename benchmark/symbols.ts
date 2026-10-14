import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { stripTypeScriptTypes } from 'node:module';
import { performance } from 'node:perf_hooks';
import { type SchemaInterface, s } from '../src/index.ts';

// Immutable pre-Symbol baseline; never follow a moving HEAD or relax the gate.
// Both implementations validate the same string-only workloads in one process.
const baselineCommit = 'c335e10b4311e673fd80c1acb3107db6810962a6';
const baselineSource = execFileSync(
  'git',
  ['show', `${baselineCommit}:src/index.ts`],
  { encoding: 'utf8' },
);
const baseline = (
  await import(
    `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(baselineSource)).toString('base64')}`
  )
).s;
const id = Symbol('id');
const definition = (api: typeof s) =>
  api.object({
    name: api.string(),
    count: api.number(),
    rows: api.array(
      api.object({ text: api.string(), depth: api.number().default(0) }),
    ),
  });
const good = {
  name: 'name',
  count: 3,
  rows: [{ text: 'one' }, { text: 'two' }],
};
const bad = { ...good, rows: [{ text: 42 }] };
const oldSchema = definition(baseline);
const newSchema = definition(s);
const scenarios: [string, () => unknown, () => unknown][] = [
  ['construction', () => definition(baseline), () => definition(s)],
  [
    'valid nested parsing',
    () => oldSchema.safeParse(good),
    () => newSchema.safeParse(good),
  ],
  [
    'invalid nested parsing',
    () => oldSchema.safeParse(bad),
    () => newSchema.safeParse(bad),
  ],
];

const cases: [
  string,
  (api: typeof s) => SchemaInterface<unknown, unknown>,
  unknown,
  unknown,
][] = [
  ['empty', (api) => api.object({}), {}, null],
  [
    'tiny',
    (api) => api.object({ text: api.string() }),
    { text: 'ok' },
    { text: 42 },
  ],
  [
    'defaults',
    (api) =>
      api.object({
        text: api.string().default('ok'),
        count: api.number().default(0),
      }),
    {},
    { count: 'bad' },
  ],
];
for (const [name, make, input, invalid] of cases) {
  const before = make(baseline);
  const after = make(s);
  assert.deepEqual(after.safeParse(input), before.safeParse(input));
  assert.deepEqual(after.safeParse(invalid), before.safeParse(invalid));
  scenarios.push(
    [`${name} construction`, () => make(baseline), () => make(s)],
    [
      `${name} first parse (includes construction)`,
      () => make(baseline).safeParse(input),
      () => make(s).safeParse(input),
    ],
    [
      `${name} valid parsing`,
      () => before.safeParse(input),
      () => after.safeParse(input),
    ],
    [
      `${name} invalid parsing`,
      () => before.safeParse(invalid),
      () => after.safeParse(invalid),
    ],
  );
}
assert.deepEqual(newSchema.safeParse(good), oldSchema.safeParse(good));
assert.deepEqual(newSchema.safeParse(bad), oldSchema.safeParse(bad));
scenarios.push([
  'nested first parse (includes construction)',
  () => definition(baseline).safeParse(good),
  () => definition(s).safeParse(good),
]);
console.log(
  JSON.stringify({
    baselineCommit,
    node: process.version,
    samples: 10,
    sampleSeconds: 1,
  }),
);

function measure(fn: () => unknown) {
  const start = performance.now();
  let count = 0;
  do {
    for (let i = 0; i < 1000; i++) fn();
    count += 1000;
  } while (performance.now() - start < 1000);
  return count / ((performance.now() - start) / 1000);
}

let passed = true;
for (const [name, before, after] of scenarios) {
  for (let i = 0; i < 20000; i++) {
    before();
    after();
  }
  const oldSamples: number[] = [];
  const newSamples: number[] = [];
  for (let i = 0; i < 10; i++) {
    const order: [() => unknown, number[]][] =
      i % 2
        ? [
            [after, newSamples],
            [before, oldSamples],
          ]
        : [
            [before, oldSamples],
            [after, newSamples],
          ];
    for (const [fn, samples] of order) {
      globalThis.gc?.();
      samples.push(measure(fn));
    }
  }
  const mean = (samples: number[]) =>
    samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const oldMean = mean(oldSamples);
  const newMean = mean(newSamples);
  const ok = newMean >= oldMean;
  passed &&= ok;
  console.log(
    JSON.stringify({
      name,
      baselineOps: oldMean,
      candidateOps: newMean,
      throughputDeltaPercent: (newMean / oldMean - 1) * 100,
      baselineLatencyUs: 1e6 / oldMean,
      candidateLatencyUs: 1e6 / newMean,
      baselineSamples: oldSamples,
      candidateSamples: newSamples,
      passed: ok,
    }),
  );
}

const rows = s.array(
  s.object({
    [id]: s.string().default(({ context }) => `row-${context?.index}`),
    text: s.string(),
  }),
);
const input = [{ text: 'one' }, { text: 'two' }];
assert.deepEqual(
  rows.parse(input as never).map((row) => row[id]),
  ['row-0', 'row-1'],
);
console.log(
  JSON.stringify({
    name: 'Symbol nested defaults (no equivalent old parser)',
    candidateOps: measure(() => rows.parse(input as never)),
  }),
);
const symbolSchema = () =>
  s.object({ [id]: s.string().default('id'), text: s.string() });
const symbolRow = symbolSchema();
assert.equal(
  symbolRow.safeParse({ text: 'ok', [id]: 42 } as never).success,
  false,
);
const symbolCases: [string, () => unknown][] = [
  ['Symbol construction', symbolSchema],
  [
    'Symbol first parse (includes construction)',
    () => symbolSchema().parse({ text: 'ok' }),
  ],
  ['Symbol valid parsing', () => symbolRow.parse({ text: 'ok', [id]: 'id' })],
  [
    'Symbol invalid parsing',
    () => symbolRow.safeParse({ text: 'ok', [id]: 42 } as never),
  ],
];
for (const [name, fn] of symbolCases)
  console.log(
    JSON.stringify({
      name: `${name} (no equivalent old parser)`,
      candidateOps: measure(fn),
    }),
  );
console.log(`Non-regression gate: ${passed ? 'PASS' : 'FAIL'}`);
if (!passed) process.exitCode = 1;
