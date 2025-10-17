import assert from 'node:assert';
import { describe, it } from 'node:test';
import { s } from '../array.ts';

describe('Array Extensions - Edge Cases', () => {
  it('should handle empty array with min(0)', () => {
    const schema = s.array(s.string()).min(0);
    const result = schema.safeParse([]);
    assert.strictEqual(result.success, true);
  });

  it('should handle unique() with primitive types', () => {
    const schema = s.array(s.number()).unique();
    const result1 = schema.safeParse([1, 2, 3]);
    const result2 = schema.safeParse([1, 2, 2]);
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, false);
  });

  it('should handle unique() with objects', () => {
    const schema = s.array(s.object({ id: s.number() })).unique();
    const result1 = schema.safeParse([{ id: 1 }, { id: 2 }]);
    const result2 = schema.safeParse([{ id: 1 }, { id: 1 }]);
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, false);
  });

  it('should handle unique() with nested objects', () => {
    const schema = s
      .array(
        s.object({
          user: s.object({ id: s.number() }),
        }),
      )
      .unique();
    const result = schema.safeParse([{ user: { id: 1 } }, { user: { id: 1 } }]);
    assert.strictEqual(result.success, false);
  });

  it('should handle unique() with string values', () => {
    const schema = s.array(s.string()).unique();
    const result1 = schema.safeParse(['a', 'b', 'c']);
    const result2 = schema.safeParse(['a', 'b', 'a']);
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, false);
  });

  it('should handle sort() with numbers', () => {
    const schema = s.array(s.number()).sort();
    const result = schema.parse([3, 1, 4, 1, 5, 9, 2, 6]);
    assert.deepStrictEqual(result, [1, 1, 2, 3, 4, 5, 6, 9]);
  });

  it('should handle sort() with strings', () => {
    const schema = s.array(s.string()).sort();
    const result = schema.parse(['banana', 'apple', 'cherry']);
    assert.deepStrictEqual(result, ['apple', 'banana', 'cherry']);
  });

  it('should handle reverse() without mutating original', () => {
    const schema = s.array(s.number()).reverse();
    const original = [1, 2, 3];
    const result = schema.parse(original);
    assert.deepStrictEqual(result, [3, 2, 1]);
    assert.deepStrictEqual(original, [1, 2, 3]); // Should not mutate
  });

  it('should handle very large arrays', () => {
    const schema = s.array(s.number()).max(1000000);
    const largeArray = Array.from({ length: 1000000 }, (_, i) => i);
    const result = schema.safeParse(largeArray);
    assert.strictEqual(result.success, true);
  });

  it('should chain multiple array operations', () => {
    const schema = s.array(s.number()).min(2).max(10).unique().sort();
    const result = schema.parse([3, 1, 2]);
    assert.deepStrictEqual(result, [1, 2, 3]);
  });

  it('should validate min length', () => {
    const schema = s.array(s.string()).min(2);
    const result1 = schema.safeParse(['a', 'b']);
    const result2 = schema.safeParse(['a']);
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, false);
  });

  it('should validate max length', () => {
    const schema = s.array(s.string()).max(2);
    const result1 = schema.safeParse(['a', 'b']);
    const result2 = schema.safeParse(['a', 'b', 'c']);
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, false);
  });

  it('should validate exact length', () => {
    const schema = s.array(s.string()).length(3);
    const result1 = schema.safeParse(['a', 'b', 'c']);
    const result2 = schema.safeParse(['a', 'b']);
    const result3 = schema.safeParse(['a', 'b', 'c', 'd']);
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, false);
    assert.strictEqual(result3.success, false);
  });

  it('should validate nonEmpty', () => {
    const schema = s.array(s.string()).nonEmpty();
    const result1 = schema.safeParse(['a']);
    const result2 = schema.safeParse([]);
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, false);
  });

  it('should handle array of objects with validation', () => {
    const schema = s.array(
      s.object({
        id: s.number(),
        name: s.string(),
      }),
    );
    const result1 = schema.safeParse([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
    const result2 = schema.safeParse([
      { id: 1, name: 'Alice' },
      { id: 'invalid', name: 'Bob' },
    ]);
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, false);
  });

  it('should handle nested arrays', () => {
    const schema = s.array(s.array(s.number()));
    const result1 = schema.safeParse([
      [1, 2],
      [3, 4],
    ]);
    const result2 = schema.safeParse([
      [1, 2],
      ['invalid', 4],
    ]);
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, false);
  });

  it('should handle unique with boolean values', () => {
    const schema = s.array(s.boolean()).unique();
    const result1 = schema.safeParse([true, false]);
    const result2 = schema.safeParse([true, true]);
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, false);
  });

  it('should handle combination of sort and reverse', () => {
    const schema = s.array(s.number()).sort().reverse();
    const result = schema.parse([3, 1, 4, 1, 5]);
    // Sort: [1, 1, 3, 4, 5], then reverse: [5, 4, 3, 1, 1]
    assert.deepStrictEqual(result, [5, 4, 3, 1, 1]);
  });

  it('should handle unique with different object references but same values', () => {
    const schema = s.array(s.object({ x: s.number() })).unique();
    const obj1 = { x: 1 };
    const obj2 = { x: 1 }; // Different reference, same value
    const result = schema.safeParse([obj1, obj2]);
    // Should fail because values are the same (even though references differ)
    assert.strictEqual(result.success, false);
  });

  it('should handle boundary values for min', () => {
    const schema = s.array(s.string()).min(3);
    const result1 = schema.safeParse(['a', 'b', 'c']); // Exactly 3
    const result2 = schema.safeParse(['a', 'b']); // Less than 3
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, false);
  });

  it('should handle boundary values for max', () => {
    const schema = s.array(s.string()).max(3);
    const result1 = schema.safeParse(['a', 'b', 'c']); // Exactly 3
    const result2 = schema.safeParse(['a', 'b', 'c', 'd']); // More than 3
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, false);
  });
});
