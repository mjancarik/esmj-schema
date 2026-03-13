import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { s } from '../index.ts';

describe('catch()', () => {
  it('should return static fallback on type mismatch', () => {
    const schema = s.string().catch('fallback');
    assert.equal(schema.parse(123), 'fallback');
    assert.equal(schema.parse(null), 'fallback');
    assert.equal(schema.parse(undefined), 'fallback');
  });

  it('should pass through valid values unchanged', () => {
    const schema = s.string().catch('fallback');
    assert.equal(schema.parse('hello'), 'hello');
  });

  it('should not throw from parse() when catch is applied', () => {
    const schema = s.string().catch('fallback');
    assert.doesNotThrow(() => schema.parse(999));
  });

  it('should return success:true from safeParse() on failure', () => {
    const schema = s.string().catch('fallback');
    const result = schema.safeParse(999);
    assert.equal(result.success, true);
    assert.equal(result.data, 'fallback');
  });

  it('should call function fallback with ctx.input and ctx.error', () => {
    let capturedCtx = null;
    const schema = s.string().catch((ctx) => {
      capturedCtx = ctx;
      return 'caught';
    });
    schema.parse(42);
    assert.equal(capturedCtx.input, 42);
    assert.ok(typeof capturedCtx.error.message === 'string');
    assert.match(capturedCtx.error.message, /must be type of string/);
  });

  it('should allow function fallback to use ctx.input for dynamic fallback', () => {
    const schema = s.number().catch((ctx) => String(ctx.input));
    assert.equal(schema.parse('hello'), 'hello');
  });

  it('should allow function fallback to use ctx.error.message', () => {
    const schema = s.string().catch((ctx) => ctx.error.message);
    const result = schema.parse(123);
    assert.match(result, /must be type of string/);
  });

  it('fires on any failure, unlike default() which only fires for undefined', () => {
    const withCatch = s.string().catch('fallback');
    const withDefault = s.string().default('fallback');

    // catch fires for null
    assert.equal(withCatch.parse(null), 'fallback');
    // default does NOT save null — it still fails
    assert.throws(() => withDefault.parse(null), /must be type of string/);

    // both produce the fallback for undefined (via different paths)
    assert.equal(withCatch.parse(undefined), 'fallback');
    assert.equal(withDefault.parse(undefined), 'fallback');
  });

  it('should catch refine failures when catch is placed after refine', () => {
    const schema = s
      .string()
      .refine((val) => val.length > 3, { message: 'too short' })
      .catch('fallback');
    assert.equal(schema.parse('hi'), 'fallback');
    assert.equal(schema.parse('hello'), 'hello');
  });

  it('should NOT catch refine failures when catch is placed before refine', () => {
    const schema = s
      .string()
      .catch('fallback')
      .refine((val) => val.length > 3, { message: 'too short' });
    // valid string that fails refine is NOT caught (catch ran before refine)
    assert.throws(() => schema.parse('hi'), /too short/);
    // type failure: catch converts it to 'fallback' (length 8 > 3), refine passes
    assert.equal(schema.parse(123), 'fallback');
  });

  it('should catch failures after transform', () => {
    const schema = s
      .string()
      .transform((val) => val.toUpperCase())
      .catch('FALLBACK');
    assert.equal(schema.parse(123), 'FALLBACK');
    assert.equal(schema.parse('hello'), 'HELLO');
  });

  it('should work on number schema', () => {
    const schema = s.number().catch(0);
    assert.equal(schema.parse('not a number'), 0);
    assert.equal(schema.parse(42), 42);
  });

  it('should work on array schema', () => {
    const schema = s.array(s.string()).catch([]);
    assert.deepEqual(schema.parse('not an array'), []);
    assert.deepEqual(schema.parse(['a', 'b']), ['a', 'b']);
  });

  it('should apply per-field catch inside an object schema', () => {
    const schema = s.object({
      name: s.string().catch('unknown'),
      age: s.number(),
    });
    const result = schema.parse({ name: 123, age: 30 });
    assert.equal(result.name, 'unknown');
    assert.equal(result.age, 30);
  });

  it('should return fallback without re-validating it', () => {
    // fallback is null which would normally fail string validation — no error expected
    const schema = s.string().catch((_ctx) => null);
    const result = schema.safeParse(123);
    assert.equal(result.success, true);
    assert.equal(result.data, null);
  });
});
