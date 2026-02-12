import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { s } from '../index.ts';

describe('s.literal()', () => {
  describe('Basic Functionality', () => {
    it('should accept exact string literal value', () => {
      const schema = s.literal('admin');
      assert.equal(schema.parse('admin'), 'admin');
    });

    it('should accept exact number literal value', () => {
      const schema = s.literal(42);
      assert.equal(schema.parse(42), 42);
    });

    it('should accept exact boolean literal value', () => {
      const schema = s.literal(true);
      assert.equal(schema.parse(true), true);
    });

    it('should accept false boolean literal', () => {
      const schema = s.literal(false);
      assert.equal(schema.parse(false), false);
    });

    it('should accept zero number literal', () => {
      const schema = s.literal(0);
      assert.equal(schema.parse(0), 0);
    });

    it('should accept empty string literal', () => {
      const schema = s.literal('');
      assert.equal(schema.parse(''), '');
    });

    it('should accept negative number literal', () => {
      const schema = s.literal(-100);
      assert.equal(schema.parse(-100), -100);
    });

    it('should accept decimal number literal', () => {
      const schema = s.literal(3.14);
      assert.equal(schema.parse(3.14), 3.14);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for non-matching string value', () => {
      const schema = s.literal('admin');
      assert.throws(
        () => schema.parse('user'),
        /Expected literal value "admin", received "user"/,
      );
    });

    it('should throw error for non-matching number value', () => {
      const schema = s.literal(42);
      assert.throws(
        () => schema.parse(43),
        /Expected literal value "42", received "43"/,
      );
    });

    it('should throw error for non-matching boolean value', () => {
      const schema = s.literal(true);
      assert.throws(
        () => schema.parse(false),
        /Expected literal value "true", received "false"/,
      );
    });

    it('should throw error for wrong type (string instead of number)', () => {
      const schema = s.literal(42);
      assert.throws(
        () => schema.parse('42'),
        /Expected literal value "42", received "42"/,
      );
    });

    it('should throw error for wrong type (number instead of string)', () => {
      const schema = s.literal('42');
      assert.throws(
        () => schema.parse(42),
        /Expected literal value "42", received "42"/,
      );
    });

    it('should throw error for undefined', () => {
      const schema = s.literal('admin');
      assert.throws(
        () => schema.parse(undefined),
        /Expected literal value "admin", received "undefined"/,
      );
    });

    it('should throw error for null', () => {
      const schema = s.literal('admin');
      assert.throws(
        () => schema.parse(null),
        /Expected literal value "admin", received "null"/,
      );
    });
  });

  describe('safeParse', () => {
    it('should return success for matching value', () => {
      const schema = s.literal('admin');
      const result = schema.safeParse('admin');
      assert.equal(result.success, true);
      assert.equal(result.data, 'admin');
    });

    it('should return error for non-matching value', () => {
      const schema = s.literal('admin');
      const result = schema.safeParse('user');
      assert.equal(result.success, false);
      assert.match(result.error.message, /Expected literal value "admin"/);
    });

    it('should return error for wrong type', () => {
      const schema = s.literal(42);
      const result = schema.safeParse('42');
      assert.equal(result.success, false);
      assert.match(result.error.message, /Expected literal value "42"/);
    });
  });

  describe('Custom Error Messages', () => {
    it('should use custom error message as string', () => {
      const schema = s.literal('admin', {
        message: 'User role must be admin',
      });
      assert.throws(() => schema.parse('user'), /User role must be admin/);
    });

    it('should use custom error message as function', () => {
      const schema = s.literal('admin', {
        message: (value) => `Role "${value}" is not allowed`,
      });
      assert.throws(() => schema.parse('user'), /Role "user" is not allowed/);
    });

    it('should use custom name', () => {
      const schema = s.literal('admin', { name: 'userRole' });
      assert.equal(schema._getName(), 'userRole');
    });
  });

  describe('Modifiers', () => {
    it('should work with optional()', () => {
      const schema = s.literal('admin').optional();
      assert.equal(schema.parse('admin'), 'admin');
      assert.equal(schema.parse(undefined), undefined);
      assert.throws(
        () => schema.parse('user'),
        /Expected literal value "admin"/,
      );
    });

    it('should work with nullable()', () => {
      const schema = s.literal('admin').nullable();
      assert.equal(schema.parse('admin'), 'admin');
      assert.equal(schema.parse(null), null);
      assert.throws(
        () => schema.parse('user'),
        /Expected literal value "admin"/,
      );
    });

    it('should work with nullish()', () => {
      const schema = s.literal('admin').nullish();
      assert.equal(schema.parse('admin'), 'admin');
      assert.equal(schema.parse(null), null);
      assert.equal(schema.parse(undefined), undefined);
      assert.throws(
        () => schema.parse('user'),
        /Expected literal value "admin"/,
      );
    });

    it('should work with default()', () => {
      const schema = s.literal('admin').default('admin');
      assert.equal(schema.parse(undefined), 'admin');
      assert.equal(schema.parse('admin'), 'admin');
    });

    it('should work with transform()', () => {
      const schema = s
        .literal('admin')
        .transform((value) => value.toUpperCase());
      assert.equal(schema.parse('admin'), 'ADMIN');
    });

    it('should work with refine()', () => {
      const schema = s
        .literal('admin')
        .refine((value) => value === 'admin', { message: 'Must be admin' });
      assert.equal(schema.parse('admin'), 'admin');
    });
  });

  describe('Type Information', () => {
    it('should have correct type', () => {
      const schema = s.literal('admin');
      assert.equal(schema._getType(), 'literal');
    });

    it('should have correct description', () => {
      const schema = s.literal('admin');
      assert.equal(schema._getDescription(), 'literal("admin")');
    });

    it('should have correct description for number', () => {
      const schema = s.literal(42);
      assert.equal(schema._getDescription(), 'literal("42")');
    });

    it('should have correct description for boolean', () => {
      const schema = s.literal(true);
      assert.equal(schema._getDescription(), 'literal("true")');
    });
  });

  describe('Common Use Cases', () => {
    it('should validate user roles', () => {
      const adminSchema = s.literal('admin');
      const userSchema = s.literal('user');

      assert.equal(adminSchema.parse('admin'), 'admin');
      assert.equal(userSchema.parse('user'), 'user');
      assert.throws(() => adminSchema.parse('user'));
      assert.throws(() => userSchema.parse('admin'));
    });

    it('should validate status codes', () => {
      const successSchema = s.literal(200);
      const notFoundSchema = s.literal(404);

      assert.equal(successSchema.parse(200), 200);
      assert.equal(notFoundSchema.parse(404), 404);
      assert.throws(() => successSchema.parse(404));
      assert.throws(() => notFoundSchema.parse(200));
    });

    it('should validate flags', () => {
      const enabledSchema = s.literal(true);
      const disabledSchema = s.literal(false);

      assert.equal(enabledSchema.parse(true), true);
      assert.equal(disabledSchema.parse(false), false);
      assert.throws(() => enabledSchema.parse(false));
      assert.throws(() => disabledSchema.parse(true));
    });

    it('should work in object schemas', () => {
      const schema = s.object({
        type: s.literal('user'),
        name: s.string(),
      });

      const result = schema.parse({
        type: 'user',
        name: 'John',
      });

      assert.equal(result.type, 'user');
      assert.equal(result.name, 'John');

      assert.throws(
        () => schema.parse({ type: 'admin', name: 'John' }),
        /Expected literal value "user"/,
      );
    });

    it('should work with union for multiple literals', () => {
      const roleSchema = s.union([
        s.literal('admin'),
        s.literal('user'),
        s.literal('guest'),
      ]);

      assert.equal(roleSchema.parse('admin'), 'admin');
      assert.equal(roleSchema.parse('user'), 'user');
      assert.equal(roleSchema.parse('guest'), 'guest');
      assert.throws(() => roleSchema.parse('moderator'));
    });

    it('should discriminate union types', () => {
      const schema = s.union([
        s.object({
          type: s.literal('success'),
          data: s.string(),
        }),
        s.object({
          type: s.literal('error'),
          error: s.string(),
        }),
      ]);

      const successResult = schema.parse({
        type: 'success',
        data: 'Hello',
      });
      assert.equal(successResult.type, 'success');
      assert.equal(successResult.data, 'Hello');

      const errorResult = schema.parse({
        type: 'error',
        error: 'Failed',
      });
      assert.equal(errorResult.type, 'error');
      assert.equal(errorResult.error, 'Failed');
    });

    it('should validate API response types', () => {
      const responseSchema = s.object({
        status: s.literal('ok'),
        version: s.literal(1),
        data: s.string(),
      });

      const result = responseSchema.parse({
        status: 'ok',
        version: 1,
        data: 'response data',
      });

      assert.equal(result.status, 'ok');
      assert.equal(result.version, 1);
      assert.equal(result.data, 'response data');
    });
  });

  describe('Edge Cases', () => {
    it('should handle special string characters', () => {
      const schema = s.literal('hello\nworld');
      assert.equal(schema.parse('hello\nworld'), 'hello\nworld');
      assert.throws(() => schema.parse('hello world'));
    });

    it('should handle unicode strings', () => {
      const schema = s.literal('👋 Hello');
      assert.equal(schema.parse('👋 Hello'), '👋 Hello');
      assert.throws(() => schema.parse('Hello'));
    });

    it('should distinguish between 0 and false', () => {
      const zeroSchema = s.literal(0);
      const falseSchema = s.literal(false);

      assert.equal(zeroSchema.parse(0), 0);
      assert.equal(falseSchema.parse(false), false);
      assert.throws(() => zeroSchema.parse(false));
      assert.throws(() => falseSchema.parse(0));
    });

    it('should distinguish between empty string and falsy values', () => {
      const emptySchema = s.literal('');

      assert.equal(emptySchema.parse(''), '');
      assert.throws(() => emptySchema.parse(0));
      assert.throws(() => emptySchema.parse(false));
      assert.throws(() => emptySchema.parse(null));
      assert.throws(() => emptySchema.parse(undefined));
    });

    it('should handle very large numbers', () => {
      const schema = s.literal(Number.MAX_SAFE_INTEGER);
      assert.equal(
        schema.parse(Number.MAX_SAFE_INTEGER),
        Number.MAX_SAFE_INTEGER,
      );
      assert.throws(() => schema.parse(Number.MAX_SAFE_INTEGER - 1));
    });

    it('should handle very small numbers', () => {
      const schema = s.literal(Number.MIN_SAFE_INTEGER);
      assert.equal(
        schema.parse(Number.MIN_SAFE_INTEGER),
        Number.MIN_SAFE_INTEGER,
      );
      assert.throws(() => schema.parse(Number.MIN_SAFE_INTEGER + 1));
    });
  });
});
