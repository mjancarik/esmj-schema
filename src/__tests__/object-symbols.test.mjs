import assert from 'node:assert/strict';
import { test } from 'node:test';
import { s } from '../index.ts';

const id = Symbol.for('mrakomor.componentId');

test('Symbol failures retain the parent abortEarly snapshot', () => {
  const second = Symbol('second');
  const options = { abortEarly: false };
  const schema = s.object({
    before: s.string().default(() => {
      options.abortEarly = true;
      return 'before';
    }),
    [id]: s.string(),
    [second]: s.string(),
  });
  assert.equal(schema.safeParse({}, options).errors.length, 2);
});

test('local Symbols with identical descriptions remain distinct fields', () => {
  const first = Symbol('local-id');
  const second = Symbol('local-id');
  const schema = s.object({ [first]: s.string(), [second]: s.number() });
  const row = schema.parse({ [first]: 'first', [second]: 2 });
  assert.notEqual(first, second);
  assert.equal(String(first), String(second));
  assert.deepEqual(Reflect.ownKeys(row), [first, second]);
  assert.equal(row[first], 'first');
  assert.equal(row[second], 2);
  assert.equal(schema.safeParse({ [first]: 'first' }).success, false);
  assert.equal(schema.safeParse({ [second]: 2 }).success, false);
  assert.equal(
    schema.safeParse({ [first]: 2, [second]: 'first' }).success,
    false,
  );
});

test('numeric strings run in index order and all strings precede Symbol factories', () => {
  const first = Symbol('first');
  const second = Symbol('second');
  const calls = [];
  const field = (key) =>
    s.string().default(() => {
      calls.push(key);
      return String(calls.length);
    });
  const schema = s.object({
    [first]: field(first),
    10: field('10'),
    text: field('text'),
    2: field('2'),
    [second]: field(second),
    '01': field('01'),
  });
  const row = schema.parse({});
  const order = ['2', '10', 'text', '01', first, second];
  assert.deepEqual(calls, order);
  assert.deepEqual(Reflect.ownKeys(row), order);
  assert.deepEqual(
    order.map((key) => row[key]),
    ['1', '2', '3', '4', '5', '6'],
  );
  assert.deepEqual(schema.parse(row), row);
  assert.deepEqual(calls, order);
});

test('declared Symbols validate, preserve identity, spread and omit JSON IDs', () => {
  const other = Symbol('mrakomor.componentId');
  const schema = s.object({
    [id]: s.string(),
    [other]: s.number(),
    text: s.string(),
  });
  const row = schema.parse({
    [Symbol.for('mrakomor.componentId')]: 'row-1',
    [other]: 2,
    text: 'Hello',
    extra: true,
    [Symbol('extra')]: true,
  });
  assert.deepEqual(Reflect.ownKeys(row), ['text', id, other]);
  assert.equal(row[id], 'row-1');
  assert.equal(row[other], 2);
  assert.equal({ ...row }[id], 'row-1');
  assert.equal(Object.getOwnPropertyDescriptor(row, id).enumerable, true);
  assert.equal(JSON.stringify(row).includes('row-1'), false);
  assert.deepEqual(schema.parse(row), row);
  assert.equal(Object.hasOwn(row, 'componentId'), false);
});

test('Symbol failures use ordinary diagnostics and aggregate nested paths', () => {
  const schema = s.object({
    rows: s.array(s.object({ [id]: s.string(), text: s.string() })),
  });
  for (const bad of [42, Symbol('bad'), undefined]) {
    const result = schema.safeParse({ rows: [{ [id]: bad, text: 'ok' }] });
    assert.equal(result.success, false);
    assert.equal(result.error.cause.key, `rows.0.${String(id)}`);
    assert.throws(
      () => schema.parse({ rows: [{ [id]: bad, text: 'ok' }] }),
      (error) => error instanceof Error && !(error instanceof TypeError),
    );
  }
  const result = schema.safeParse(
    { rows: [{ [id]: 42, text: 42 }] },
    { abortEarly: false },
  );
  assert.equal(result.errors.length, 2);
  assert.equal(result.errors[0].cause.key, 'rows.0.text');
  assert.equal(result.errors[1].cause.key, `rows.0.${String(id)}`);
});

test('Symbol defaults receive context/index and do not rerun on normalized rows', () => {
  let calls = 0;
  const schema = s.array(
    s.object({
      [id]: s
        .string()
        .default(
          ({ context }) => `${context.prefix}-${context.index}-${++calls}`,
        ),
    }),
  );
  const rows = schema.parse([{}, {}], { context: { prefix: 'row' } });
  assert.deepEqual(
    rows.map((row) => row[id]),
    ['row-0-1', 'row-1-2'],
  );
  assert.deepEqual(schema.parse(rows), rows);
  assert.equal(calls, 2);
  const stop = s.object({
    text: s.string(),
    [id]: s.string().default(() => {
      calls++;
      return 'new';
    }),
  });
  assert.equal(stop.safeParse({}).success, false);
  assert.equal(calls, 2);
});

test('Symbol field modifiers retain existing order and pipe semantics', () => {
  const optional = Symbol('optional');
  const nullable = Symbol('nullable');
  const nullish = Symbol('nullish');
  const schema = s.object({
    [optional]: s.string().optional(),
    [nullable]: s.string().nullable(),
    [nullish]: s.string().nullish(),
    [id]: s.string().transform(Number).pipe(s.number()),
  });
  const row = schema.parse({ [nullable]: null, [id]: '12' });
  assert.equal(row[optional], undefined);
  assert.equal(row[nullable], null);
  assert.equal(row[nullish], undefined);
  assert.equal(row[id], 12);
  assert.equal(Object.hasOwn(row, optional), true);
  assert.equal(schema.safeParse({ [nullable]: 3, [id]: '12' }).success, false);
});

test('only own enumerable definition Symbols participate; input uses property access', () => {
  const hidden = Symbol('hidden');
  const inherited = Symbol('inherited');
  const definition = Object.create({
    [inherited]: s.string(),
    legacy: s.string(),
  });
  definition[id] = s.string();
  Object.defineProperty(definition, hidden, { value: s.string() });
  const schema = s.object(definition);
  const input = Object.create({ [id]: 'inherited-input', legacy: 'legacy' });
  assert.equal(schema.parse(input)[id], 'inherited-input');
  Object.defineProperty(input, id, { value: 'hidden-input' });
  Object.defineProperty(input, hidden, {
    get() {
      throw new Error('undeclared getter');
    },
  });
  assert.deepEqual(schema.parse(input), {
    legacy: 'legacy',
    [id]: 'hidden-input',
  });
  assert.equal(schema._getDescription().includes(String(id)), true);
  assert.equal(schema._getDescription().includes('legacy: string'), true);
  assert.equal(schema._getDescription().includes(String(hidden)), false);
  assert.equal(schema._getDescription().includes(String(inherited)), false);
});

test('definition snapshots isolate string and Symbol additions, replacements and deletions', () => {
  const added = Symbol('added');
  const definition = { text: s.string(), [id]: s.string() };
  const schema = s.object(definition);
  const clone = schema.clone();
  const input = { text: 'ok', [id]: 'id', extra: 3, [added]: 4 };
  const expected = { text: 'ok', [id]: 'id' };
  const description = schema._getDescription();
  const check = () => {
    for (const current of [schema, clone]) {
      assert.deepEqual(current.parse(input), expected);
      assert.equal(current.safeParse({}).success, false);
      assert.equal(current._getDescription(), description);
    }
  };
  definition.extra = s.number();
  definition[added] = s.number();
  check();
  assert.deepEqual(s.object(definition).parse(input), input);
  definition.text = s.number();
  definition[id] = s.number();
  check();
  assert.equal(s.object(definition).safeParse(input).success, false);
  assert.deepEqual(
    s.object(definition).parse({ text: 1, [id]: 2, extra: 3, [added]: 4 }),
    { text: 1, [id]: 2, extra: 3, [added]: 4 },
  );
  Reflect.deleteProperty(definition, 'text');
  delete definition[id];
  check();
  assert.deepEqual(s.object(definition).parse(input), { extra: 3, [added]: 4 });
  assert.equal(Object.isFrozen(definition), false);
});

test('snapshots isolate prototype and enumerability changes in parsing and descriptions', () => {
  const hidden = Symbol('hidden');
  const prototype = { inherited: s.string(), [hidden]: s.string() };
  const definition = Object.create(prototype);
  Object.assign(definition, { own: s.string(), [id]: s.string() });
  Object.defineProperty(definition, 'hidden', {
    value: s.string(),
    configurable: true,
  });
  Object.defineProperty(definition, hidden, {
    value: s.string(),
    configurable: true,
  });
  const schema = s.object(definition);
  const input = {
    inherited: 'old',
    own: 'own',
    hidden: 'hidden',
    [id]: 'id',
    [hidden]: 'hidden',
  };
  const expected = { own: 'own', inherited: 'old', [id]: 'id' };
  const description = schema._getDescription();
  prototype.inherited = s.number();
  prototype.extra = s.number();
  Object.setPrototypeOf(definition, { replacement: s.number() });
  for (const key of ['own', id])
    Object.defineProperty(definition, key, { enumerable: false });
  for (const key of ['hidden', hidden])
    Object.defineProperty(definition, key, { enumerable: true });
  assert.deepEqual(schema.parse(input), expected);
  assert.equal(schema._getDescription(), description);
  assert.equal(
    description,
    `object({ own: string, inherited: string, ${String(id)}: string })`,
  );
  assert.deepEqual(Reflect.ownKeys(schema._getDefinition()), [
    'own',
    'inherited',
    id,
  ]);
  assert.deepEqual(s.object(definition).parse({ ...input, replacement: 1 }), {
    hidden: 'hidden',
    replacement: 1,
    [hidden]: 'hidden',
  });
});

test('snapshot string traversal preserves numeric ordering at each prototype level', () => {
  const calls = [];
  const field = (key) =>
    s.string().default(() => {
      calls.push(key);
      return key;
    });
  const grandparent = { 1: field('1'), last: field('last') };
  const parent = Object.assign(Object.create(grandparent), {
    2: field('2'),
    middle: field('middle'),
  });
  const definition = Object.assign(Object.create(parent), {
    3: field('3'),
    first: field('first'),
    [id]: field('symbol'),
  });
  const schema = s.object(definition);
  Object.setPrototypeOf(parent, null);
  grandparent.extra = s.number();
  schema.parse({});
  assert.deepEqual(calls, ['3', 'first', '2', 'middle', '1', 'last', 'symbol']);
  assert.equal(
    schema._getDescription(),
    `object({ 3: string, first: string, 2: string, middle: string, 1: string, last: string, ${String(id)}: string })`,
  );
});

test('self-deleting definition getters retain their returned schema references', () => {
  for (const inherited of [false, true]) {
    const child = s.string();
    let calls = 0;
    const owner = {
      get text() {
        calls++;
        Reflect.deleteProperty(owner, 'text');
        return child;
      },
    };
    const schema = s.object(inherited ? Object.create(owner) : owner);
    assert.equal(schema.safeParse({}).success, false);
    assert.equal(schema.safeParse({ text: 42 }).success, false);
    assert.deepEqual(schema.parse({ text: 'ok' }), { text: 'ok' });
    assert.equal(schema._getDefinition().text, child);
    assert.equal(schema._getDescription(), 'object({ text: string })');
    assert.equal(calls, 1);
  }
});

test('included getters run once at construction, never at parse or introspection', () => {
  const calls = [];
  const child = s.string();
  const prototype = {
    get inherited() {
      calls.push('inherited');
      return child;
    },
  };
  const definition = Object.create(prototype);
  Object.defineProperties(definition, {
    text: {
      enumerable: true,
      get() {
        calls.push('text');
        return child;
      },
    },
    [id]: {
      enumerable: true,
      get() {
        calls.push(id);
        return child;
      },
    },
    hidden: {
      get() {
        throw new Error('excluded');
      },
    },
    [Symbol('hidden')]: {
      get() {
        throw new Error('excluded');
      },
    },
  });
  const schema = s.object(definition);
  assert.deepEqual(calls, ['text', 'inherited', id]);
  for (const current of [schema, schema.clone()]) {
    assert.deepEqual(
      current.parse({ text: 'text', inherited: 'inherited', [id]: 'id' }),
      { text: 'text', inherited: 'inherited', [id]: 'id' },
    );
    current._getDescription();
    assert.equal(current._getDefinition().text, child);
  }
  assert.deepEqual(calls, ['text', 'inherited', id]);
  assert.throws(
    () =>
      s.object({
        get text() {
          throw new Error('construction');
        },
      }),
    /construction/,
  );
  assert.throws(
    () =>
      s.object({
        get [id]() {
          throw new Error('symbol construction');
        },
      }),
    /symbol construction/,
  );
});

test('captured schemas retain the live parser receiver for custom extenders', () => {
  const child = s.string();
  const schema = s.object({ text: child, [id]: child });
  const original = child._parse;
  let calls = 0;
  child._parse = function (value, options) {
    assert.equal(this, child);
    calls++;
    return original.call(this, value, options);
  };
  assert.deepEqual(schema.parse({ text: 'text', [id]: 'id' }), {
    text: 'text',
    [id]: 'id',
  });
  assert.equal(calls, 2);
});

test('introspection is memoized, frozen and prototype-safe while child modifiers remain live', () => {
  const child = s.string();
  const childClone = child.clone();
  const definition = {
    ['__proto__']: child,
    constructor: child,
    toString: child,
    [id]: child,
  };
  const schema = s.object(definition);
  const clone = schema.clone();
  const snapshot = schema._getDefinition();
  assert.notEqual(snapshot, definition);
  assert.equal(Object.getPrototypeOf(snapshot), null);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(schema._getDefinition(), snapshot);
  assert.equal(clone._getDefinition(), snapshot);
  assert.deepEqual(Reflect.ownKeys(snapshot), [
    '__proto__',
    'constructor',
    'toString',
    id,
  ]);
  for (const key of Reflect.ownKeys(snapshot)) {
    assert.equal(snapshot[key], child);
    assert.throws(() => {
      snapshot[key] = s.number();
    }, TypeError);
    assert.throws(() => {
      delete snapshot[key];
    }, TypeError);
  }
  assert.throws(() => {
    snapshot.extra = child;
  }, TypeError);
  child.default('live');
  child.refine(() => true, { type: 'live-child' });
  // Prototype-shadowed inputs retain normal property access; output redesign is out of scope.
  const empty = Object.create(null);
  for (const current of [schema, clone]) {
    assert.equal(current.parse(empty)[id], 'live');
    assert.equal(current._getDescription().includes('live-child'), true);
  }
  assert.equal(childClone.safeParse(undefined).success, false);
  const independent = s.object({ [id]: childClone });
  assert.equal(independent.safeParse({}).success, false);
  clone.derive(() => ({ [id]: 'clone' }));
  assert.equal(clone.parse(empty)[id], 'clone');
  assert.equal(schema.parse(empty)[id], 'live');
});

test('derive always/missing Symbols and clones preserve existing contracts', () => {
  const base = s.object({ [id]: s.string().optional() });
  const always = base.clone().derive(() => ({ [id]: 'always' }));
  const missing = base
    .clone()
    .derive(() => ({ [id]: 'missing' }), { when: 'missing' });
  assert.equal(base.parse({})[id], undefined);
  assert.equal(always.parse({ [id]: 'input' })[id], 'always');
  assert.equal(missing.parse({})[id], 'missing');
  assert.equal(missing.parse({ [id]: 'input' })[id], 'input');
  const hidden = {};
  Object.defineProperty(hidden, id, { value: 'hidden' });
  assert.equal(
    base
      .clone()
      .derive(() => hidden, { when: 'missing' })
      .parse({})[id],
    undefined,
  );
});

test('invalid containers remain rejected', () => {
  const schema = s.object({ [id]: s.string().default('id') });
  for (const value of [null, undefined, [], 1, 'x'])
    assert.equal(schema.safeParse(value).success, false);
});

test('derive missing fills undefined but preserves null for string and Symbol fields', () => {
  const base = s.object({
    text: s.string().nullish(),
    [id]: s.string().nullish(),
  });
  const missing = base
    .clone()
    .derive(() => ({ text: 'derived-text', [id]: 'derived-id' }), {
      when: 'missing',
    });
  assert.deepEqual(missing.parse({}), {
    text: 'derived-text',
    [id]: 'derived-id',
  });
  assert.deepEqual(missing.parse({ text: undefined, [id]: undefined }), {
    text: 'derived-text',
    [id]: 'derived-id',
  });
  assert.deepEqual(missing.parse({ text: null, [id]: null }), {
    text: null,
    [id]: null,
  });
  const always = base.clone().derive(() => ({ text: undefined, [id]: null }));
  const row = always.parse({ text: 'input', [id]: 'input' });
  assert.deepEqual(row, { text: undefined, [id]: null });
  assert.equal(Object.hasOwn(row, 'text'), true);
  assert.equal(Object.hasOwn(row, id), true);
});

test('derive inherits string overrides only in missing mode and never inherits Symbols', () => {
  const base = s.object({
    text: s.string().optional(),
    [id]: s.string().optional(),
  });
  const overrides = Object.create({
    text: 'inherited-text',
    [id]: 'inherited-id',
  });
  const always = base.clone().derive(() => overrides);
  const missing = base.clone().derive(() => overrides, { when: 'missing' });
  assert.deepEqual(always.parse({}), { text: undefined, [id]: undefined });
  assert.deepEqual(missing.parse({}), {
    text: 'inherited-text',
    [id]: undefined,
  });
  assert.deepEqual(missing.parse({ text: 'input', [id]: 'input-id' }), {
    text: 'input',
    [id]: 'input-id',
  });
});

test('derive rejects null and undefined override containers in both modes', () => {
  const base = s.object({ [id]: s.string().optional() });
  for (const when of ['always', 'missing']) {
    for (const overrides of [null, undefined]) {
      const schema = base.clone().derive(() => overrides, { when });
      const result = schema.safeParse({});
      assert.equal(result.success, false);
      assert.equal(
        result.error.message,
        `derive() callback must return a plain object of overrides, got ${overrides === null ? 'null' : 'undefined'}`,
      );
      assert.deepEqual(result.errors, [result.error]);
      assert.throws(() => schema.parse({}), /derive\(\) callback must return/);
    }
  }
});
