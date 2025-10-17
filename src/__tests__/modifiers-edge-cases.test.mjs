import assert from 'node:assert';
import { describe, it } from 'node:test';
import { s } from '../index.ts';

describe('Modifiers Edge Cases', () => {
  it('should handle optional with default', () => {
    const schema = s.string().optional().default('fallback');
    const result = schema.parse(undefined);
    assert.strictEqual(result, 'fallback');
  });

  it('should handle nullable with default', () => {
    const schema = s.string().nullable().default('fallback');
    const result1 = schema.parse(null);
    const result2 = schema.parse(undefined);
    assert.strictEqual(result1, null);
    assert.strictEqual(result2, 'fallback');
  });

  it('should handle nullish with default', () => {
    const schema = s.string().nullish().default('fallback');
    const result1 = schema.parse(null);
    const result2 = schema.parse(undefined);
    assert.strictEqual(result1, null);
    // nullish allows undefined, but default applies to undefined
    // so it becomes 'fallback'
    assert.strictEqual(result2, 'fallback');
  });

  it('should handle multiple optional() calls', () => {
    const schema = s.string().optional().optional();
    const result = schema.safeParse(undefined);
    assert.strictEqual(result.success, true);
  });

  it('should handle optional after nullable', () => {
    const schema = s.string().nullable().optional();
    const result1 = schema.safeParse(null);
    const result2 = schema.safeParse(undefined);
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, true);
  });

  it('should handle default with transform', () => {
    const schema = s
      .string()
      .default('hello')
      .transform((v) => v.toUpperCase());

    const result = schema.parse(undefined);
    assert.strictEqual(result, 'HELLO');
  });

  it('should not use default when value is empty string', () => {
    const schema = s.string().default('fallback');
    const result = schema.parse('');
    assert.strictEqual(result, '');
  });

  it('should not use default when value is 0', () => {
    const schema = s.number().default(999);
    const result = schema.parse(0);
    assert.strictEqual(result, 0);
  });

  it('should not use default when value is false', () => {
    const schema = s.boolean().default(true);
    const result = schema.parse(false);
    assert.strictEqual(result, false);
  });

  it('should handle default with function', () => {
    let counter = 0;
    const schema = s.number().default(() => ++counter);

    const result1 = schema.parse(undefined);
    const result2 = schema.parse(undefined);

    assert.strictEqual(result1, 1);
    assert.strictEqual(result2, 2);
  });

  it('should handle nullable with valid value', () => {
    const schema = s.string().nullable();
    const result = schema.parse('hello');
    assert.strictEqual(result, 'hello');
  });

  it('should handle nullish with valid value', () => {
    const schema = s.string().nullish();
    const result = schema.parse('hello');
    assert.strictEqual(result, 'hello');
  });

  it('should handle optional with valid value', () => {
    const schema = s.string().optional();
    const result = schema.parse('hello');
    assert.strictEqual(result, 'hello');
  });

  it('should handle nullable converting invalid to null', () => {
    const schema = s.string().nullable();
    const result = schema.safeParse(123);
    assert.strictEqual(result.success, false);
  });

  it('should handle optional converting invalid to undefined', () => {
    const schema = s.string().optional();
    const result = schema.safeParse(123);
    assert.strictEqual(result.success, false);
  });

  it('should handle nullish allowing both null and undefined', () => {
    const schema = s.string().nullish();
    const result1 = schema.safeParse(null);
    const result2 = schema.safeParse(undefined);
    const result3 = schema.safeParse('hello');

    assert.strictEqual(result1.success, true);
    assert.strictEqual(result1.data, null);
    assert.strictEqual(result2.success, true);
    assert.strictEqual(result2.data, undefined);
    assert.strictEqual(result3.success, true);
    assert.strictEqual(result3.data, 'hello');
  });

  it('should handle default in object schema', () => {
    const schema = s.object({
      name: s.string(),
      role: s.string().default('user'),
    });

    const result = schema.parse({ name: 'John' });
    assert.deepStrictEqual(result, { name: 'John', role: 'user' });
  });

  it('should handle optional in object schema', () => {
    const schema = s.object({
      name: s.string(),
      email: s.string().optional(),
    });

    const result = schema.parse({ name: 'John' });
    assert.deepStrictEqual(result, { name: 'John', email: undefined });
  });

  it('should handle nullable in nested objects', () => {
    const schema = s.object({
      user: s
        .object({
          name: s.string(),
        })
        .nullable(),
    });

    const result1 = schema.parse({ user: { name: 'John' } });
    const result2 = schema.parse({ user: null });

    assert.deepStrictEqual(result1, { user: { name: 'John' } });
    assert.deepStrictEqual(result2, { user: null });
  });

  it('should handle default with array schema', () => {
    const schema = s.array(s.string()).default([]);

    const result = schema.parse(undefined);
    assert.deepStrictEqual(result, []);
  });

  it('should handle multiple modifiers in sequence', () => {
    const schema = s.string().nullable().optional().default('fallback');

    const result1 = schema.parse('hello');
    const result2 = schema.parse(null);
    const result3 = schema.parse(undefined);

    assert.strictEqual(result1, 'hello');
    assert.strictEqual(result2, null);
    assert.strictEqual(result3, 'fallback');
  });
});
