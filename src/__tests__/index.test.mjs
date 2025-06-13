import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { s } from '../index.ts';

describe('SchemaInterface Methods', () => {
  it('should parse values correctly', () => {
    const schema = s.string();
    assert.equal(schema.parse('hello'), 'hello');
    assert.throws(() => schema.parse(123), /must be type of string/);
  });

  it('should safeParse values correctly', () => {
    const schema = s.string();
    const result = schema.safeParse('hello');
    assert.equal(result.success, true);
    assert.equal(result.data, 'hello');

    const errorResult = schema.safeParse(123);
    assert.equal(errorResult.success, false);
    assert.match(errorResult.error.message, /must be type of string/);
  });

  it('should handle optional values', () => {
    const schema = s.string().optional();
    assert.equal(schema.parse(undefined), undefined);
    assert.equal(schema.parse('hello'), 'hello');
  });

  it('should handle nullable values', () => {
    const schema = s.string().nullable();
    assert.equal(schema.parse(null), null);
    assert.equal(schema.parse('hello'), 'hello');
  });

  it('should handle nullish values', () => {
    const schema = s.string().nullish();
    assert.equal(schema.parse(null), null);
    assert.equal(schema.parse(undefined), undefined);
    assert.equal(schema.parse('hello'), 'hello');
  });

  it('should apply default values', () => {
    const schema = s.string().default('default');
    assert.equal(schema.parse(undefined), 'default');
    assert.equal(schema.parse('hello'), 'hello');
  });

  it('should transform values', () => {
    const schema = s.string().transform((value) => value.toUpperCase());
    assert.equal(schema.parse('hello'), 'HELLO');
  });

  it('should pipe schemas', () => {
    const schema = s
      .string()
      .transform((value) => Number.parseInt(value))
      .pipe(s.number());
    assert.equal(schema.parse('123'), 123);
  });

  it('should refine values', () => {
    const schema = s.string().refine((val) => val.startsWith('A'), {
      message: 'String must start with "A"',
    });
    assert.equal(schema.parse('Apple'), 'Apple');
    assert.throws(() => schema.parse('Banana'), /String must start with "A"/);
  });
});

describe('s Object Methods', () => {
  it('should create string schemas', () => {
    const schema = s.string();
    assert.equal(schema.parse('hello'), 'hello');
  });

  it('should create number schemas', () => {
    const schema = s.number();
    assert.equal(schema.parse(123), 123);
    assert.throws(() => schema.parse('hello'), /must be type of number/);
  });

  it('should create boolean schemas', () => {
    const schema = s.boolean();
    assert.equal(schema.parse(true), true);
    assert.equal(schema.parse(false), false);
    assert.throws(() => schema.parse('hello'), /must be type of boolean/);
  });

  it('should create date schemas', () => {
    const schema = s.date();
    const date = new Date();
    assert.equal(schema.parse(date), date);
    assert.throws(() => schema.parse('hello'), /must be type of date/);
  });

  it('should create enum schemas', () => {
    const schema = s.enum(['admin', 'user', 'guest']);
    assert.equal(schema.parse('admin'), 'admin');
    assert.throws(() => schema.parse('invalid'), /Invalid enum value/);
  });

  it('should create array schemas', () => {
    const schema = s.array(s.string());
    assert.deepEqual(schema.parse(['hello', 'world']), ['hello', 'world']);
    assert.throws(() => schema.parse(['hello', 123]), /must be type of string/);
  });

  it('should create object schemas', () => {
    const schema = s.object({
      name: s.string(),
      age: s.number(),
    });
    assert.deepEqual(schema.parse({ name: 'John', age: 30 }), {
      name: 'John',
      age: 30,
    });
    assert.throws(
      () => schema.parse({ name: 'John' }),
      /must be type of number/,
    );
  });

  it('should create any schemas', () => {
    const schema = s.any();
    assert.equal(schema.parse('hello'), 'hello');
    assert.equal(schema.parse(123), 123);
    assert.equal(schema.parse(null), null);
  });

  it('should preprocess values', () => {
    const schema = s.preprocess((value) => value.trim(), s.string());
    assert.equal(schema.parse('   hello   '), 'hello');
  });
});

describe('Integration Tests', () => {
  it('should parse result from defined schema and input', () => {
    const result = s
      .object({
        username: s.string().default('unknown'),
        password: s.string().default('unknown'),
        birthday: s.preprocess((value) => new Date(value), s.date()),
        account: s
          .string()
          .default('0')
          .transform((value) => Number.parseInt(value))
          .pipe(s.number()),
        money: s.number().default(0),
        address: s
          .object({
            street: s.string(),
            city: s.string().optional(),
            code: s.number().nullable(),
            zip: s.number().nullish(),
          })
          .default({ street: 'unknown' }),
        records: s
          .array(s.object({ name: s.string() }).default({ name: 'unknown' }))
          .default([]),
      })
      .default({})
      .parse({
        username: 'foo',
        password: 'bar',
        birthday: '2024-10-05T21:05:00.000Z',
        extra: 'baz',
        account: '1234',
        money: 100,
        address: { street: 'street' },
        records: [undefined, { name: 'record2' }],
      });

    assert.deepStrictEqual(result, {
      username: 'foo',
      password: 'bar',
      account: 1234,
      birthday: new Date('2024-10-05T21:05:00.000Z'),
      money: 100,
      address: {
        street: 'street',
        city: undefined,
        code: null,
        zip: undefined,
      },
      records: [{ name: 'unknown' }, { name: 'record2' }],
    });
  });

  it('should throw error with right error message', () => {
    const result = s
      .object({
        username: s.string(),
        password: s.string(),
        account: s.number(),
        address: s
          .object({
            street: s.string(),
            city: s.string(),
            code: s.number().nullable(),
            zip: s.number().nullish(),
          })
          .default({ street: 'unknown' }),
        records: s
          .array(s.object({ name: s.string() }).default({ name: 'unknown' }))
          .default([]),
      })
      .default({})
      .safeParse({
        username: 'foo',
        password: 'bar',
        extra: 'baz',
        account: 1234,
        address: { street: 'street' },
        records: [undefined, { name: 'record2' }],
      });

    assert.equal(result.success, false);
    assert.equal(
      result.error.message,
      `Error parsing key "address.city": Error parsing key "city": The value "undefined" must be type of string but is type of "undefined".`,
    );
  });

  it('should validate enum field correctly', () => {
    const schema = s
      .object({
        username: s.string(),
        role: s.enum(['admin', 'user', 'guest']).default('guest'),
      })
      .default({});

    const validResult = schema.parse({
      username: 'testuser',
      role: 'admin',
    });

    assert.deepStrictEqual(validResult, {
      username: 'testuser',
      role: 'admin',
    });

    const defaultResult = schema.parse({
      username: 'testuser',
    });

    assert.deepStrictEqual(defaultResult, {
      username: 'testuser',
      role: 'guest',
    });

    const invalidResult = schema.safeParse({
      username: 'testuser',
      role: 'invalidRole',
    });

    assert.equal(invalidResult.success, false);
    assert.equal(
      invalidResult.error.message,
      `Error parsing key "role": Invalid enum value. Expected "admin" | "user" | "guest", received "invalidRole".`,
    );
  });
});

describe('s.union Method', () => {
  it('should validate a value matching one of the schemas', () => {
    const schema = s.union([s.string(), s.number(), s.boolean()]);

    assert.equal(schema.parse('hello'), 'hello');
    assert.equal(schema.parse(42), 42);
    assert.equal(schema.parse(true), true);
  });

  it('should fail validation for a value not matching any schema', () => {
    const schema = s.union([s.string(), s.number(), s.boolean()]);

    const result = schema.safeParse({ key: 'value' });
    assert.equal(result.success, false);
    assert.equal(
      result.error.message,
      `Invalid union value. Expected the value to match one of the schemas: "string" | "number" | "boolean", but received "object" with value "[object Object]".`,
    );
  });

  it('should work with nested schemas', () => {
    const schema = s.union([
      s.object({ type: s.string(), value: s.number() }),
      s.object({ type: s.string(), value: s.string() }),
    ]);

    const validResult1 = schema.parse({ type: 'number', value: 42 });
    assert.deepStrictEqual(validResult1, { type: 'number', value: 42 });

    const validResult2 = schema.parse({ type: 'string', value: 'hello' });
    assert.deepStrictEqual(validResult2, { type: 'string', value: 'hello' });

    const invalidResult = schema.safeParse({ type: 'unknown', value: true });
    assert.equal(invalidResult.success, false);
    assert.equal(
      invalidResult.error.message,
      `Invalid union value. Expected the value to match one of the schemas: "object" | "object", but received "object" with value "[object Object]".`,
    );
  });

  it('should handle empty union definitions gracefully', () => {
    const schema = s.union([]);
    const result = schema.safeParse('test');
    assert.equal(result.success, false);
    assert.equal(
      result.error.message,
      `Invalid union value. Expected the value to match one of the schemas: , but received "string" with value "test".`,
    );
  });
});
