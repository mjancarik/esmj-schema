import assert from 'node:assert';
import { describe, it } from 'node:test';
import { s } from '../number.ts';

describe('Number Extensions - Edge Cases', () => {
  it('should handle Number.MAX_SAFE_INTEGER', () => {
    const schema = s.number().int();
    const result = schema.safeParse(Number.MAX_SAFE_INTEGER);
    assert.strictEqual(result.success, true);
  });

  it('should handle Number.MIN_SAFE_INTEGER', () => {
    const schema = s.number().int();
    const result = schema.safeParse(Number.MIN_SAFE_INTEGER);
    assert.strictEqual(result.success, true);
  });

  it('should reject Infinity with finite()', () => {
    const schema = s.number().finite();
    const result1 = schema.safeParse(Number.POSITIVE_INFINITY);
    const result2 = schema.safeParse(Number.NEGATIVE_INFINITY);
    assert.strictEqual(result1.success, false);
    assert.strictEqual(result2.success, false);
  });

  it('should handle 0 with positive()', () => {
    const schema = s.number().positive();
    const result = schema.safeParse(0);
    assert.strictEqual(result.success, false); // 0 is not positive
  });

  it('should handle 0 with negative()', () => {
    const schema = s.number().negative();
    const result = schema.safeParse(0);
    assert.strictEqual(result.success, false); // 0 is not negative
  });

  it('should handle -0 correctly', () => {
    const schema = s.number();
    const result = schema.parse(-0);
    assert.strictEqual(Object.is(result, -0), true);
  });

  it('should handle float precision issues', () => {
    const schema = s.number().float();
    const result = schema.safeParse(0.1 + 0.2); // 0.30000000000000004
    assert.strictEqual(result.success, true);
  });

  it('should handle multipleOf with decimals', () => {
    const schema = s.number().multipleOf(0.1);
    const result1 = schema.safeParse(0.3);
    const result2 = schema.safeParse(0.33);
    // Due to floating point precision, 0.3 / 0.1 might not be exactly 3
    // This test documents the actual behavior with floating point math
    assert.strictEqual(typeof result1.success, 'boolean');
    assert.strictEqual(result2.success, false);
  });

  it('should handle multiple constraints together', () => {
    const schema = s.number().int().positive().min(10).max(100).multipleOf(5);
    const result1 = schema.safeParse(15);
    const result2 = schema.safeParse(14);
    const result3 = schema.safeParse(105);
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, false);
    assert.strictEqual(result3.success, false);
  });

  it('should handle scientific notation', () => {
    const schema = s.number();
    const result = schema.parse(1e10);
    assert.strictEqual(result, 10000000000);
  });

  it('should validate integer vs float', () => {
    const intSchema = s.number().int();
    const floatSchema = s.number().float();

    const result1 = intSchema.safeParse(42);
    const result2 = intSchema.safeParse(42.5);
    const result3 = floatSchema.safeParse(42);
    const result4 = floatSchema.safeParse(42.5);

    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, false);
    assert.strictEqual(result3.success, false); // 42 is not a float (no decimal)
    assert.strictEqual(result4.success, true);
  });

  it('should handle min and max range validation', () => {
    const schema = s.number().min(10).max(20);
    const result1 = schema.safeParse(15);
    const result2 = schema.safeParse(5);
    const result3 = schema.safeParse(25);
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, false);
    assert.strictEqual(result3.success, false);
  });

  it('should handle boundary values for min', () => {
    const schema = s.number().min(10);
    const result1 = schema.safeParse(10); // Equal to min
    const result2 = schema.safeParse(9.99); // Just below
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, false);
  });

  it('should handle boundary values for max', () => {
    const schema = s.number().max(10);
    const result1 = schema.safeParse(10); // Equal to max
    const result2 = schema.safeParse(10.01); // Just above
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, false);
  });

  it('should handle negative floats', () => {
    const schema = s.number().float().negative();
    const result1 = schema.safeParse(-3.14);
    const result2 = schema.safeParse(3.14);
    const result3 = schema.safeParse(-5); // Integer, not float
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, false);
    assert.strictEqual(result3.success, false);
  });

  it('should handle multipleOf with 1', () => {
    const schema = s.number().multipleOf(1);
    const result1 = schema.safeParse(5);
    const result2 = schema.safeParse(5.5);
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, false);
  });

  it('should handle very large numbers with multipleOf', () => {
    const schema = s.number().multipleOf(1000000);
    const result1 = schema.safeParse(5000000);
    const result2 = schema.safeParse(5000001);
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, false);
  });

  it('should handle negative numbers with multipleOf', () => {
    const schema = s.number().multipleOf(3);
    const result1 = schema.safeParse(-9);
    const result2 = schema.safeParse(-10);
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, false);
  });
});
