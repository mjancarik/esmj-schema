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

  it('should mutate a shared schema instance when a modifier is applied after reuse (known gotcha)', () => {
    // Modifiers like optional()/nullable()/nullish() patch the schema's
    // internal _parse in place and return `this`, they do not clone the
    // schema. Because `s.object()` stores a direct reference to the schema
    // instances passed in its definition, calling a modifier on `base`
    // *after* it was already used inside `requiredUser` retroactively
    // changes how `requiredUser` validates the `name` field too, since both
    // point at the very same schema instance.
    const base = s.string();
    const requiredUser = s.object({ name: base });

    // Before mutation, `name` is required.
    assert.strictEqual(requiredUser.safeParse({}).success, false);

    base.optional();

    // After calling optional() on the shared `base` instance, `requiredUser`
    // is affected too, even though `optional()` was never called on
    // `requiredUser` or its `name` field directly.
    assert.strictEqual(requiredUser.safeParse({}).success, true);
  });

  it('should fix the shared-instance gotcha when clone() is used before reuse', () => {
    // Calling clone() before handing the schema off to s.object() produces
    // an independent instance, so mutating the original `base` afterwards
    // no longer affects `requiredUser`.
    const base = s.string();
    const requiredUser = s.object({ name: base.clone() });

    assert.strictEqual(requiredUser.safeParse({}).success, false);

    base.optional();

    // requiredUser is unaffected because it holds a cloned, independent copy.
    assert.strictEqual(requiredUser.safeParse({}).success, false);
    // The original `base` schema itself is optional now, as expected.
    assert.strictEqual(base.safeParse(undefined).success, true);
  });

  it('should produce an independent instance from clone()', () => {
    const original = s.string();
    const clone = original.clone();

    assert.notStrictEqual(clone, original);

    // Mutating the clone must not affect the original.
    clone.optional();
    assert.strictEqual(original.safeParse(undefined).success, false);
    assert.strictEqual(clone.safeParse(undefined).success, true);
  });

  it('should not affect a clone when the original is mutated afterwards', () => {
    const original = s.string();
    const clone = original.clone();

    original.optional();

    assert.strictEqual(original.safeParse(undefined).success, true);
    assert.strictEqual(clone.safeParse(undefined).success, false);
  });

  it('should keep clone() unaffected by nullable()/nullish()/default()/catch()/pipe()/refine()/transform() applied to the original', () => {
    // These modifiers previously closed over the schema instance created by
    // createSchemaInterface directly instead of using `this`, which would
    // have silently mutated the original even when called via a clone (or
    // vice versa). This test guards against that regressing.
    const original = s.string();
    const clone = original.clone();

    original.nullish();
    assert.strictEqual(clone.safeParse(null).success, false);

    const original2 = s.string();
    const clone2 = original2.clone();
    original2.default('fallback');
    assert.throws(() => clone2.parse(undefined));

    const original3 = s.string();
    const clone3 = original3.clone();
    original3.catch('fallback');
    assert.strictEqual(clone3.safeParse(123).success, false);

    const original4 = s.string();
    const clone4 = original4.clone();
    original4.pipe(s.string().transform((v) => v.toUpperCase()));
    assert.strictEqual(clone4.parse('hello'), 'hello');

    const original5 = s.string();
    const clone5 = original5.clone();
    original5.refine((v) => v.length > 3, { message: 'too short' });
    assert.strictEqual(clone5.safeParse('ab').success, true);

    const original6 = s.string();
    const clone6 = original6.clone();
    original6.transform((v) => v.toUpperCase());
    assert.strictEqual(clone6.parse('hello'), 'hello');

    const original7 = s.string();
    const clone7 = original7.clone();
    original7.nullable();
    assert.strictEqual(clone7.safeParse(null).success, false);
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
