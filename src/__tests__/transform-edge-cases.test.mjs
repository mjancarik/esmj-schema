import assert from 'node:assert';
import { describe, it } from 'node:test';
import { s } from '../full.ts';

describe('Transform and Preprocess Edge Cases', () => {
  it('should handle transform returning different type', () => {
    const schema = s.string().transform((v) => v.length);
    const result = schema.parse('hello');
    assert.strictEqual(result, 5);
    assert.strictEqual(typeof result, 'number');
  });

  it('should handle transform throwing errors', () => {
    const schema = s.string().transform((v) => {
      if (v === 'error') throw new Error('Transform failed');
      return v;
    });

    assert.throws(() => schema.parse('error'));
  });

  it('should handle preprocess with type coercion', () => {
    const schema = s.preprocess((value) => String(value), s.string());

    const result = schema.parse(123);
    assert.strictEqual(result, '123');
    assert.strictEqual(typeof result, 'string');
  });

  it('should handle multiple transforms in sequence', () => {
    const schema = s
      .string()
      .transform((v) => v.toUpperCase())
      .transform((v) => v.split('').reverse().join(''))
      .transform((v) => `[${v}]`);

    const result = schema.parse('hello');
    assert.strictEqual(result, '[OLLEH]');
  });

  it('should handle transform after refine', () => {
    const schema = s
      .string()
      .refine((v) => v.length >= 3, { message: 'Too short' })
      .transform((v) => v.toUpperCase());

    const result = schema.parse('hello');
    assert.strictEqual(result, 'HELLO');
  });

  it('should validate after transform with pipe', () => {
    const schema = s
      .string()
      .transform((v) => Number.parseInt(v))
      .pipe(s.number().min(10));

    const result1 = schema.safeParse('15');
    const result2 = schema.safeParse('5');

    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, false);
  });

  it('should handle preprocess returning null/undefined', () => {
    const schema = s.preprocess(
      (value) => (value === 'null' ? null : value),
      s.string().nullable(),
    );

    const result = schema.parse('null');
    assert.strictEqual(result, null);
  });

  it('should handle transform with arrays', () => {
    const schema = s
      .array(s.number())
      .transform((arr) => arr.reduce((a, b) => a + b, 0));

    const result = schema.parse([1, 2, 3, 4]);
    assert.strictEqual(result, 10);
  });

  it('should handle preprocess with objects', () => {
    const schema = s.preprocess(
      (value) => ({ ...value, processed: true }),
      s.object({
        name: s.string(),
        processed: s.boolean(),
      }),
    );

    const result = schema.parse({ name: 'test' });
    assert.deepStrictEqual(result, { name: 'test', processed: true });
  });

  it('should handle transform returning object', () => {
    const schema = s
      .string()
      .transform((v) => ({ value: v, length: v.length }));

    const result = schema.parse('hello');
    assert.deepStrictEqual(result, { value: 'hello', length: 5 });
  });

  it('should handle transform with optional', () => {
    const schema = s
      .string()
      .optional()
      .transform((v) => v?.toUpperCase());

    const result1 = schema.parse('hello');
    const result2 = schema.parse(undefined);

    assert.strictEqual(result1, 'HELLO');
    assert.strictEqual(result2, undefined);
  });

  it('should handle preprocess with validation', () => {
    const schema = s.preprocess(
      (value) => (typeof value === 'string' ? value.trim() : value),
      s.string().min(3),
    );

    const result1 = schema.safeParse('  hello  ');
    const result2 = schema.safeParse('  hi  ');

    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, false);
  });

  it('should handle nested transforms', () => {
    const schema = s.object({
      name: s.string().transform((v) => v.toUpperCase()),
      age: s.number().transform((v) => v * 2),
    });

    const result = schema.parse({ name: 'john', age: 25 });
    assert.deepStrictEqual(result, { name: 'JOHN', age: 50 });
  });

  it('should handle transform with pipe and validation', () => {
    const schema = s
      .string()
      .transform((v) => v.trim())
      .pipe(s.string().min(5))
      .transform((v) => v.toUpperCase());

    const result = schema.parse('  hello  ');
    assert.strictEqual(result, 'HELLO');
  });

  it('should handle preprocess with default values', () => {
    const schema = s.preprocess((value) => value ?? 'default', s.string());

    const result1 = schema.parse(undefined);
    const result2 = schema.parse('custom');

    assert.strictEqual(result1, 'default');
    assert.strictEqual(result2, 'custom');
  });

  it('should handle transform preserving array order', () => {
    const schema = s
      .array(s.string())
      .transform((arr) => arr.map((s) => s.toUpperCase()));

    const result = schema.parse(['a', 'b', 'c']);
    assert.deepStrictEqual(result, ['A', 'B', 'C']);
  });

  it('should handle preprocess with complex transformations', () => {
    const schema = s.preprocess((value) => {
      if (typeof value === 'string') {
        return Number.parseInt(value, 10);
      }
      return value;
    }, s.number().min(10));

    const result1 = schema.safeParse('15');
    const result2 = schema.safeParse('5');
    const result3 = schema.safeParse(20);

    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, false);
    assert.strictEqual(result3.success, true);
  });
});
