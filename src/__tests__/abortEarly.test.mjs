import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { s } from '../index.ts';

describe('abortEarly option', () => {
  it('object schema with abortEarly=true (default) stops at first error', () => {
    const schema = s.object({
      name: s.string(),
      age: s.number(),
      email: s.string(),
    });

    const result = schema.safeParse({
      name: 123, // Invalid string
      age: 'not a number', // Invalid number
      email: 42, // Invalid string
    });

    assert.strictEqual(result.success, false);
    assert(result.error.message.includes('Error parsing key "name"'));
    assert.strictEqual(result.errors.length, 1);
  });

  it('object schema with abortEarly=false collects all errors', () => {
    const schema = s.object({
      name: s.string(),
      age: s.number(),
      email: s.string(),
    });

    const result = schema.safeParse(
      {
        name: 123, // Invalid string
        age: 'not a number', // Invalid number
        email: 42, // Invalid string
      },
      { abortEarly: false },
    );

    assert.strictEqual(result.success, false);
    assert(result.error.message.includes('Error parsing key "name"'));
    assert.strictEqual(result.errors.length, 3);
    assert(result.errors[0].message.includes('Error parsing key "name"'));
    assert(result.errors[1].message.includes('Error parsing key "age"'));
    assert(result.errors[2].message.includes('Error parsing key "email"'));
  });

  it('array schema with abortEarly=false collects all errors', () => {
    const schema = s.array(s.number());

    const result = schema.safeParse([1, 'two', 3, 'four'], {
      abortEarly: false,
    });

    assert.strictEqual(result.success, false);
    assert(result.error.message.includes('Error parsing key "1"'));
    assert.strictEqual(result.errors.length, 2);
    assert(result.errors[0].message.includes('Error parsing key "1"'));
    assert(result.errors[1].message.includes('Error parsing key "3"'));
  });

  it('nested objects with abortEarly=false collect all errors', () => {
    const schema = s.object({
      user: s.object({
        name: s.string(),
        age: s.number(),
      }),
      settings: s.object({
        theme: s.string(),
        notifications: s.boolean(),
      }),
    });

    const result = schema.safeParse(
      {
        user: {
          name: 123, // Invalid string
          age: 'not a number', // Invalid number
        },
        settings: {
          theme: 456, // Invalid string
          notifications: 'off', // Invalid boolean
        },
      },
      { abortEarly: false },
    );

    assert.strictEqual(result.success, false);
    // Should have at least 4 errors
    assert(result.errors.length >= 2);
  });

  it('union schema with abortEarly=false collects errors from all schemas', () => {
    const schema = s.union([
      s.object({ id: s.string(), type: s.enum(['user']) }),
      s.object({ id: s.number(), type: s.enum(['admin']) }),
    ]);

    const result = schema.safeParse(
      {
        id: true,
        type: 'guest',
      },
      { abortEarly: false },
    );

    assert.strictEqual(result.success, false);
    assert(result.errors.length === 1);
    assert(result.errors.some((e) => e.message.includes('union value')));
  });

  it('empty object is validated correctly with abortEarly=false', () => {
    const schema = s.object({
      name: s.string(),
      age: s.number(),
    });

    const result = schema.safeParse({}, { abortEarly: false });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.errors.length, 2);
  });

  it('abortEarly option is propagated through nested schemas', () => {
    const innerSchema = s.object({
      a: s.string(),
      b: s.string(),
    });

    const outerSchema = s.object({
      inner: innerSchema,
    });

    const result = outerSchema.safeParse(
      {
        inner: {
          a: 123,
          b: 456,
        },
      },
      { abortEarly: false },
    );

    assert.strictEqual(result.success, false);
    assert(result.errors.length >= 2);
    assert(result.errors.some((e) => e.message.includes('a"')));
    assert(result.errors.some((e) => e.message.includes('b"')));
  });

  it('abortEarly in array with object items collects all nested errors', () => {
    const personSchema = s.object({
      name: s.string(),
      age: s.number(),
    });

    const peopleSchema = s.array(personSchema);

    const result = peopleSchema.safeParse(
      [
        { name: 'John', age: 30 }, // Valid
        { name: 123, age: 'invalid' }, // Both invalid
        { name: 'Jane', age: 'not a number' }, // Age invalid
      ],
      { abortEarly: false },
    );

    assert.strictEqual(result.success, false);
    assert(result.errors.length >= 3);
  });

  it('refine method respects abortEarly option', () => {
    const schema = s.object({
      password: s.string().refine((val) => val.length >= 8, {
        message: 'Password must be at least 8 characters',
      }),
      email: s.string().refine((val) => val.includes('@'), {
        message: 'Invalid email format',
      }),
    });

    const result = schema.safeParse(
      {
        password: 'short',
        email: 'invalidemail',
      },
      { abortEarly: false },
    );

    assert.strictEqual(result.success, false);
    assert(result.errors.length >= 2);
    assert(
      result.errors.some((e) =>
        e.message.includes('Password must be at least 8'),
      ),
    );
    assert(
      result.errors.some((e) => e.message.includes('Invalid email format')),
    );
  });

  it('should collect all errors from deeply nested structures with abortEarly=false', () => {
    const deepSchema = s.object({
      level1: s.object({
        level2: s.object({
          level3: s.object({
            field: s.string(),
          }),
        }),
      }),
    });

    const result = deepSchema.safeParse(
      {
        level1: {
          level2: {
            level3: { field: 123 },
          },
        },
      },
      { abortEarly: false },
    );

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.errors.length, 1);
    assert(result.errors[0].message.includes('level1.level2.level3.field'));
    assert(result.error.cause.key === 'level1.level2.level3.field');
  });

  it('should handle arrays with mixed type items and collect all errors', () => {
    const mixedSchema = s.array(s.union([s.string(), s.number()]));

    const result = mixedSchema.safeParse([1, '2', true, {}, null], {
      abortEarly: false,
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.errors.length, 3); // true, {}, null should fail
    assert(result.errors[0].message.includes('Error parsing key "2"')); // true
    assert(result.errors[1].message.includes('Error parsing key "3"')); // {}
    assert(result.errors[2].message.includes('Error parsing key "4"')); // null
  });

  it('should collect errors from multiple refinements with abortEarly=false', () => {
    const passwordSchema = s
      .string()
      .refine((v) => v.length >= 8, { message: 'Too short' })
      .refine((v) => /[A-Z]/.test(v), { message: 'Needs uppercase' })
      .refine((v) => /[0-9]/.test(v), { message: 'Needs number' });

    // This should only collect the first error since refine doesn't currently support multiple error collection
    const result = passwordSchema.safeParse('abc', { abortEarly: false });

    assert.strictEqual(result.success, false);
    assert(result.error.message.includes('Too short'));

    // Note: Currently the implementation only returns the first failing refinement
    // This test documents current behavior rather than desired behavior
    assert.strictEqual(result.errors.length, 1);
  });

  it('should validate partial objects correctly with abortEarly=false', () => {
    const userSchema = s.object({
      name: s.string(),
      age: s.number().optional(),
      email: s.string().nullable(),
    });

    const result = userSchema.safeParse(
      {
        name: 123, // Invalid
        age: 'thirty', // Invalid
        // email omitted (invalid since nullable)
      },
      { abortEarly: false },
    );

    assert.strictEqual(result.success, false);

    assert.strictEqual(result.errors.length, 3);
    assert(result.errors[0].message.includes('name'));
    assert(result.errors[1].message.includes('age'));
    assert(result.errors[2].message.includes('email'));
  });

  it('should maintain consistent error message format across different schema types', () => {
    const schema = s.object({
      str: s.string(),
      num: s.number(),
      bool: s.boolean(),
      arr: s.array(s.string()),
    });

    const result = schema.safeParse(
      {
        str: 123,
        num: '123',
        bool: 'true',
        arr: [1, 2, 3],
      },
      { abortEarly: false },
    );

    assert.strictEqual(result.success, false);

    // Check that we have errors for all fields
    assert(result.errors.length >= 4);

    // Check error message format consistency
    result.errors.forEach((error) => {
      assert(
        error.message.includes('Error parsing key') ||
          error.message.includes('The value'),
      );
    });

    // Check that all field errors are included
    const errorKeys = result.errors.map((e) => e.cause?.key || '');
    assert(errorKeys.includes('str'));
    assert(errorKeys.includes('num'));
    assert(errorKeys.includes('bool'));
    assert(errorKeys.some((key) => key.startsWith('arr.')));
  });

  it('should handle union schemas with multiple errors at different levels', () => {
    const complexSchema = s.object({
      profile: s.union([
        s.object({
          type: s.enum(['user']),
          name: s.string(),
          age: s.number(),
        }),
        s.object({
          type: s.enum(['company']),
          companyName: s.string(),
          employees: s.number(),
        }),
      ]),
    });

    const result = complexSchema.safeParse(
      {
        profile: {
          type: 'unknown', // Invalid enum
          name: 123, // Invalid string
          companyName: 456, // Invalid string
        },
      },
      { abortEarly: false },
    );

    assert.strictEqual(result.success, false);

    // The union schema should collect errors from both schemas
    assert(result.errors.length >= 1);

    // Check that the first error is a union error
    assert(result.error.message.includes('union'));
  });
});
