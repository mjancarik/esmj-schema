import assert from 'node:assert/strict';
import { test } from 'node:test';
import { s } from '../index.ts';

test('array() auto-injects { index } into context for each element', () => {
  const item = s.object({
    order: s.contextRef('index').pipe(s.number()),
  });

  const result = s.array(item).parse([{}, {}, {}]);

  assert.deepEqual(
    result.map((row) => row.order),
    [0, 1, 2],
  );
});

test('array() merges caller-provided context with the auto-injected index', () => {
  const item = s.object({
    order: s.contextRef('index').pipe(s.number()),
    tenant: s.contextRef('tenant').pipe(s.string()),
  });

  const result = s.array(item).parse([{}, {}], { context: { tenant: 'acme' } });

  assert.deepEqual(result, [
    { order: 0, tenant: 'acme' },
    { order: 1, tenant: 'acme' },
  ]);
});

test('array() innermost index wins for nested arrays (documented limitation)', () => {
  const inner = s.object({ order: s.contextRef('index').pipe(s.number()) });
  const outer = s.array(inner);

  const result = s.array(outer).parse([[{}, {}], [{}]]);

  // Only the inner array's index is visible — outer index is overwritten.
  assert.deepEqual(
    result.map((group) => group.map((row) => row.order)),
    [[0, 1], [0]],
  );
});

test('object().derive() with when: "always" (default) overrides parsed values', () => {
  const schema = s
    .object({
      id: s.string().optional(),
      label: s.string().optional(),
      order: s.number().optional(),
    })
    .derive((row, { context }) => ({
      id: row.id ?? `action:${context?.index ?? 0}`,
      order: context?.index ?? 0,
    }));

  const result = schema.parse(
    { label: 'Save', order: 99 },
    { context: { index: 2 } },
  );

  assert.deepEqual(result, {
    label: 'Save',
    id: 'action:2',
    order: 2,
  });
});

test('object().derive() with when: "missing" only fills undefined keys', () => {
  const schema = s
    .object({
      id: s.string().optional(),
      order: s.number().optional(),
    })
    .derive(
      (row, { context }) => ({
        id: `action:${context?.index ?? 0}`,
        order: context?.index ?? 0,
      }),
      { when: 'missing' },
    );

  const result = schema.parse({ order: 99 }, { context: { index: 2 } });

  assert.deepEqual(result, {
    id: 'action:2',
    order: 99,
  });
});

test('object().derive() on a clone() does not affect the original schema', () => {
  const base = s.object({ order: s.number().optional() });
  const clone = base.clone();

  clone.derive((row, { context }) => ({ order: context?.index ?? 0 }));

  assert.deepEqual(base.parse({}, { context: { index: 5 } }), {
    order: undefined,
  });
  assert.deepEqual(clone.parse({}, { context: { index: 5 } }), { order: 5 });
});

test('object().derive() composed with .pipe() (slash-action style)', () => {
  const outputSchema = s.object({
    id: s.string(),
    label: s.string(),
    order: s.number(),
  });

  const schema = s
    .object({
      id: s.string().optional(),
      label: s.string().optional(),
      order: s.number().optional(),
    })
    .derive((row, { context }) => {
      const index = context?.index ?? 0;

      return {
        id: row.id ?? `action:${index}`,
        label: row.label ?? row.id ?? `Action ${index}`,
        order: typeof row.order === 'number' ? row.order : index,
      };
    })
    .pipe(outputSchema);

  const result = schema.parse({}, { context: { index: 3 } });

  assert.deepEqual(result, {
    id: 'action:3',
    label: 'Action 3',
    order: 3,
  });
});

test('object().derive() works without any context provided', () => {
  const schema = s
    .object({ order: s.number().optional() })
    .derive((row, { context }) => ({
      order: row.order ?? context?.index ?? 0,
    }));

  assert.deepEqual(schema.parse({}), { order: 0 });
});

test('s.contextRef() resolves undefined when context/key is missing', () => {
  const schema = s.object({ order: s.contextRef('index').optional() });

  assert.deepEqual(schema.parse({}), { order: undefined });
});

test('s.withContext() validates/defaults the context bag before building the schema', () => {
  const schema = s.withContext(
    s.object({ index: s.number().default(0) }),
    (context) =>
      s.object({
        order: s.number().default(context.index),
      }),
  );

  assert.deepEqual(schema.parse({}, { context: { index: 5 } }), { order: 5 });
  assert.deepEqual(schema.parse({}), { order: 0 });
});

test('s.withContext().safeParse() surfaces context validation failures', () => {
  const schema = s.withContext(s.object({ index: s.number() }), (context) =>
    s.object({ order: s.number().default(context.index) }),
  );

  const result = schema.safeParse({}, { context: { index: 'nope' } });

  assert.equal(result.success, false);
});

test('default() function form receives { context } for value ?? context ?? literal fallback chains', () => {
  const schema = s.object({
    order: s.number().default(({ context }) => context?.index ?? 0),
  });

  assert.deepEqual(schema.parse({}, { context: { index: 2 } }), { order: 2 });
  assert.deepEqual(schema.parse({}), { order: 0 });
  // input value always wins — default() only fires for undefined
  assert.deepEqual(schema.parse({ order: 5 }, { context: { index: 2 } }), {
    order: 5,
  });
});

test('default() function form still works with zero-arg callbacks (backward compatible)', () => {
  const schema = s.string().default(() => 'unknown');

  assert.equal(schema.parse(undefined), 'unknown');
  assert.equal(schema.parse('hello'), 'hello');
});

test('default() function form receives context auto-injected by array() per element', () => {
  const item = s.object({
    order: s.number().default(({ context }) => context?.index ?? -1),
  });

  const result = s.array(item).parse([{}, {}, {}]);

  assert.deepEqual(
    result.map((row) => row.order),
    [0, 1, 2],
  );
});
