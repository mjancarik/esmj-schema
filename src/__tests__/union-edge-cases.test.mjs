import assert from 'node:assert';
import { describe, it } from 'node:test';
import { s } from '../full.ts';

describe('Union Edge Cases', () => {
  it('should try all union branches', () => {
    const schema = s.union([
      s.string().min(10),
      s.string().startsWith('hello'),
    ]);

    const result = schema.parse('hello world');
    assert.strictEqual(result, 'hello world');
  });

  it('should handle union with overlapping types', () => {
    const schema = s.union([s.string(), s.string().min(5)]);

    // Should match first branch
    const result = schema.parse('hi');
    assert.strictEqual(result, 'hi');
  });

  it('should handle union with transformations', () => {
    const schema = s.union([
      s.string().transform((v) => `string: ${v}`),
      s.number().transform((v) => `number: ${v}`),
    ]);

    const result1 = schema.parse('hello');
    const result2 = schema.parse(42);

    assert.strictEqual(result1, 'string: hello');
    assert.strictEqual(result2, 'number: 42');
  });

  it('should handle union with different types', () => {
    const schema = s.union([s.string(), s.number(), s.boolean()]);

    const result1 = schema.safeParse('hello');
    const result2 = schema.safeParse(42);
    const result3 = schema.safeParse(true);
    const result4 = schema.safeParse({ invalid: true });

    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, true);
    assert.strictEqual(result3.success, true);
    assert.strictEqual(result4.success, false);
  });

  it('should handle union of objects with different shapes', () => {
    const schema = s.union([
      s.object({ type: s.string(), value: s.string() }),
      s.object({ type: s.string(), value: s.number() }),
    ]);

    const result1 = schema.parse({ type: 'a', value: 'hello' });
    const result2 = schema.parse({ type: 'b', value: 42 });

    assert.deepStrictEqual(result1, { type: 'a', value: 'hello' });
    assert.deepStrictEqual(result2, { type: 'b', value: 42 });
  });

  it('should handle empty union array', () => {
    const schema = s.union([]);
    const result = schema.safeParse('anything');
    assert.strictEqual(result.success, false);
  });

  it('should handle union with single schema', () => {
    const schema = s.union([s.string()]);
    const result1 = schema.safeParse('hello');
    const result2 = schema.safeParse(123);

    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, false);
  });

  it('should handle union with nullable schemas', () => {
    const schema = s.union([s.string().nullable(), s.number()]);

    const result1 = schema.parse('hello');
    const result2 = schema.parse(42);
    const result3 = schema.parse(null);

    assert.strictEqual(result1, 'hello');
    assert.strictEqual(result2, 42);
    assert.strictEqual(result3, null);
  });

  it('should handle union with optional schemas', () => {
    const schema = s.union([s.string().optional(), s.number()]);

    const result1 = schema.parse('hello');
    const result2 = schema.parse(42);
    const result3 = schema.parse(undefined);

    assert.strictEqual(result1, 'hello');
    assert.strictEqual(result2, 42);
    assert.strictEqual(result3, undefined);
  });

  it('should handle union with refined schemas', () => {
    const schema = s.union([
      s.string().refine((v) => v.length > 5, { message: 'Too short' }),
      s.number().refine((v) => v > 10, { message: 'Too small' }),
    ]);

    const result1 = schema.safeParse('hello world');
    const result2 = schema.safeParse(42);
    const result3 = schema.safeParse('hi');
    const result4 = schema.safeParse(5);

    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, true);
    assert.strictEqual(result3.success, false);
    assert.strictEqual(result4.success, false);
  });

  it('should handle union with array types', () => {
    const schema = s.union([s.array(s.string()), s.array(s.number())]);

    const result1 = schema.safeParse(['a', 'b']);
    const result2 = schema.safeParse([1, 2]);
    const result3 = schema.safeParse(['a', 1]);

    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, true);
    // Mixed types should fail both branches
    assert.strictEqual(result3.success, false);
  });

  it('should handle nested unions', () => {
    const schema = s.union([s.union([s.string(), s.number()]), s.boolean()]);

    const result1 = schema.safeParse('hello');
    const result2 = schema.safeParse(42);
    const result3 = schema.safeParse(true);

    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, true);
    assert.strictEqual(result3.success, true);
  });

  it('should handle union with enum types', () => {
    const schema = s.union([
      s.enum(['red', 'green', 'blue']),
      s.enum(['small', 'medium', 'large']),
    ]);

    const result1 = schema.safeParse('red');
    const result2 = schema.safeParse('medium');
    const result3 = schema.safeParse('invalid');

    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, true);
    assert.strictEqual(result3.success, false);
  });

  it('should provide descriptive error messages', () => {
    const schema = s.union([s.string(), s.number()]);

    const result = schema.safeParse({ invalid: true });

    assert.strictEqual(result.success, false);
    assert.ok(result.error.message.includes('union'));
  });

  it('should handle union with date types', () => {
    const schema = s.union([s.date(), s.string()]);

    const result1 = schema.safeParse(new Date());
    const result2 = schema.safeParse('2023-10-17');
    const result3 = schema.safeParse(123);

    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, true);
    assert.strictEqual(result3.success, false);
  });

  it('should handle union order preference', () => {
    // First matching schema should be used
    const schema = s.union([
      s.string().transform(() => 'first'),
      s.string().transform(() => 'second'),
    ]);

    const result = schema.parse('test');
    assert.strictEqual(result, 'first');
  });
});
