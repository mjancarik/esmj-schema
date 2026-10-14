import assert from 'node:assert/strict';
import { test } from 'node:test';
import { s } from '../index.ts';
import '../standard.ts';

const id = Symbol('id.with.dot');

test('JSON preflight retains composite ownership after refine retagging', () => {
  const symbolic = () => s.object({ [id]: s.string() });
  const schemas = [
    symbolic().refine(() => true, { type: 'string' }),
    s.array(symbolic()).refine(() => true, { type: 'any' }),
    s.union([s.string(), symbolic()]).refine(() => true, { type: 'number' }),
  ];
  for (const schema of schemas) {
    for (const mode of ['input', 'output']) {
      assert.throws(
        () => schema['~standard'].jsonSchema[mode]({ target: 'draft-07' }),
        /Symbol.*JSON Schema/,
      );
    }
  }
});

test('Standard validates Symbol values and refreshes derived clone binding', () => {
  const base = s.object({ [id]: s.string().optional() });
  const derived = base.clone().derive(() => ({ [id]: 'derived' }));
  assert.equal(derived['~standard'].validate({}).value[id], 'derived');
  assert.equal(base['~standard'].validate({}).value[id], undefined);
  assert.equal(base['~standard'].validate({ [id]: 42 }).issues.length, 1);
  assert.deepEqual(
    base['~standard'].validate({ [id]: 42 }).issues[0].path,
    String(id).split('.'),
  );
});

test('JSON conversion rejects declared Symbols throughout definitions, hints and pipe stages', () => {
  let calls = 0;
  const symbolic = () =>
    s.object({
      [id]: s.string().default(() => {
        calls++;
        return 'id';
      }),
    });
  const schemas = [
    symbolic(),
    s.object({ row: symbolic() }),
    s.array(symbolic()),
    s.union([s.string(), symbolic()]),
    symbolic().optional().nullable(),
    symbolic().transform(() => ({}), { jsonSchema: { type: 'object' } }),
    symbolic().pipe(s.object({})),
    s.object({}).pipe(symbolic()).pipe(s.object({})),
  ];
  for (const schema of schemas) {
    for (const target of ['draft-07', 'draft-2020-12']) {
      for (const mode of ['input', 'output'])
        assert.throws(
          () => schema['~standard'].jsonSchema[mode]({ target }),
          /Symbol.*JSON Schema/,
        );
    }
  }
  assert.equal(calls, 0);
});

test('JSON conversion ignores non-enumerable and inherited definition Symbols', () => {
  const definition = Object.create({ [id]: s.string() });
  Object.defineProperty(definition, Symbol('hidden'), { value: s.string() });
  definition.text = s.string();
  for (const mode of ['input', 'output'])
    assert.deepEqual(
      s.object(definition)['~standard'].jsonSchema[mode]({ target: 'draft-07' })
        .properties,
      { text: { type: 'string' } },
    );
});

test('JSON preflight traverses shared and cyclic graphs to reachable Symbol fields', () => {
  const shared = s.object({ value: s.string() });
  const symbolic = s.object({ [id]: s.string() });
  const objectBranches = [shared, shared];
  const cycleLink = s.union(objectBranches);
  const cyclic = s.object({ first: shared, second: shared, self: cycleLink });
  objectBranches.push(cyclic, symbolic);
  const branches = [shared, shared];
  const cyclicUnion = s.union(branches);
  branches.push(cyclicUnion, symbolic);
  const piped = s.object({});
  piped.pipe(piped).pipe(symbolic);
  const schemas = [
    s.object({ first: shared, second: shared, symbolic }),
    cyclic,
    cyclicUnion,
    piped,
  ];
  // Every cycle has a reachable Symbol: rejection occurs before conversion.
  for (const schema of schemas) {
    for (const target of ['draft-07', 'draft-2020-12']) {
      for (const mode of ['input', 'output']) {
        assert.throws(
          () => schema['~standard'].jsonSchema[mode]({ target }),
          /Symbol.*JSON Schema/,
        );
      }
    }
  }
});

test('JSON conversion and parsing share fixed string and Symbol definition snapshots', () => {
  const definition = { text: s.string() };
  const row = s.object(definition);
  const schema = s.object({ row });
  const symbolicDefinition = { text: s.string(), [id]: s.string() };
  const symbolic = s.object(symbolicDefinition);
  const protectedSchemas = [
    symbolic,
    s.object({ row: symbolic }),
    symbolic.clone(),
    symbolic.clone().transform(() => ({}), { jsonSchema: { type: 'object' } }),
    symbolic.clone().pipe(s.object({})),
    s.object({}).pipe(symbolic).pipe(s.object({})),
    symbolic.clone().refine(() => true, { type: 'string' }),
  ];
  definition[id] = s.string();
  definition.text = s.number();
  definition.extra = s.number();
  symbolicDefinition[id] = s.number();
  symbolicDefinition.text = s.number();
  delete symbolicDefinition[id];
  Reflect.deleteProperty(symbolicDefinition, 'text');
  assert.deepEqual(row.parse({ text: 'ok', [id]: 42 }), { text: 'ok' });
  assert.deepEqual(symbolic.parse({ text: 'ok', [id]: 'id' }), {
    text: 'ok',
    [id]: 'id',
  });
  for (const target of ['draft-07', 'draft-2020-12']) {
    for (const mode of ['input', 'output']) {
      const convert = () => schema['~standard'].jsonSchema[mode]({ target });
      const baseline = convert();
      assert.deepEqual(baseline.properties.row.properties, {
        text: { type: 'string' },
      });
      for (const current of protectedSchemas)
        assert.throws(
          () => current['~standard'].jsonSchema[mode]({ target }),
          /Symbol.*JSON Schema/,
        );
      assert.throws(
        () => s.object(definition)['~standard'].jsonSchema[mode]({ target }),
        /Symbol.*JSON Schema/,
      );
      assert.deepEqual(
        s.object(symbolicDefinition)['~standard'].jsonSchema[mode]({ target })
          .properties,
        {},
      );
      delete definition[id];
      assert.deepEqual(convert(), baseline);
      definition[id] = s.string();
    }
  }
});

test('JSON introspection never rereads getters and retains live shared child hints', () => {
  let reads = 0;
  const child = s.string();
  const schema = s.object({
    get text() {
      reads++;
      return child;
    },
  });
  const clone = schema.clone();
  assert.equal(reads, 1);
  child.refine((value) => value.length >= 2, { jsonSchema: { minLength: 2 } });
  for (const target of ['draft-07', 'draft-2020-12'])
    for (const mode of ['input', 'output']) {
      for (const current of [schema, clone]) {
        assert.deepEqual(
          current['~standard'].jsonSchema[mode]({ target }).properties,
          { text: { type: 'string', minLength: 2 } },
        );
        assert.equal(current.safeParse({ text: 'x' }).success, false);
        assert.deepEqual(current.parse({ text: 'ok' }), { text: 'ok' });
      }
    }
  assert.equal(reads, 1);
});

test('unsupported JSON target takes precedence over Symbol preflight', () => {
  const schema = s.object({ [id]: s.string() }).transform(() => ({}));
  let definitionReads = 0;
  const original = schema._getDefinition;
  schema._getDefinition = () => {
    definitionReads++;
    return original();
  };
  for (const mode of ['input', 'output']) {
    assert.throws(
      () => schema['~standard'].jsonSchema[mode]({ target: 'openapi-3.0' }),
      /Unsupported JSON Schema target "openapi-3\.0"/,
    );
    assert.equal(definitionReads, 0);
  }
  for (const mode of ['input', 'output']) {
    assert.throws(
      () => schema['~standard'].jsonSchema[mode]({ target: 'draft-07' }),
      /Symbol.*JSON Schema/,
    );
  }
  assert.equal(definitionReads, 2);
});

test('JSON conversion never invokes transform callbacks on success or Symbol rejection', () => {
  let calls = 0;
  const transform = (value) => {
    calls++;
    return value;
  };
  const ordinary = s
    .object({ text: s.string().transform(transform, { jsonSchema: null }) })
    .transform(transform, { jsonSchema: null });
  const symbolic = s
    .object({ [id]: s.string().transform(transform, { jsonSchema: null }) })
    .transform(transform, { jsonSchema: { type: 'object' } });
  const piped = s
    .string()
    .transform(transform)
    .pipe(symbolic)
    .pipe(s.object({}));
  for (const target of ['draft-07', 'draft-2020-12']) {
    for (const mode of ['input', 'output']) {
      assert.deepEqual(
        ordinary['~standard'].jsonSchema[mode]({ target }).properties,
        { text: { type: 'string' } },
      );
      for (const schema of [symbolic, piped]) {
        assert.throws(
          () => schema['~standard'].jsonSchema[mode]({ target }),
          /Symbol.*JSON Schema/,
        );
      }
      assert.equal(calls, 0);
    }
  }
});
