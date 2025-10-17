import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { s } from '../index.ts';
import '../full.ts';

describe('Full Schema Validations', () => {
  describe('String Schema Extensions', () => {
    describe('Length Validations', () => {
      it('should validate min length', () => {
        const schema = s.string().min(3);

        // Valid cases
        assert.equal(schema.parse('abc'), 'abc');
        assert.equal(schema.parse('abcdef'), 'abcdef');

        // Invalid cases
        const result = schema.safeParse('ab');
        assert.equal(result.success, false);
        assert.match(result.error.message, /at least 3 characters/);
      });

      it('should validate max length', () => {
        const schema = s.string().max(5);

        // Valid cases
        assert.equal(schema.parse(''), '');
        assert.equal(schema.parse('abc'), 'abc');
        assert.equal(schema.parse('abcde'), 'abcde');

        // Invalid cases
        const result = schema.safeParse('abcdef');
        assert.equal(result.success, false);
        assert.match(result.error.message, /at most 5 characters/);
      });

      it('should validate exact length', () => {
        const schema = s.string().length(4);

        // Valid cases
        assert.equal(schema.parse('abcd'), 'abcd');

        // Invalid cases
        const tooShort = schema.safeParse('abc');
        assert.equal(tooShort.success, false);
        assert.match(tooShort.error.message, /exactly 4 characters/);

        const tooLong = schema.safeParse('abcde');
        assert.equal(tooLong.success, false);
        assert.match(tooLong.error.message, /exactly 4 characters/);
      });

      it('should validate nonEmpty', () => {
        const schema = s.string().nonEmpty();

        // Valid cases
        assert.equal(schema.parse('a'), 'a');

        // Invalid cases
        const result = schema.safeParse('');
        assert.equal(result.success, false);
        assert.match(result.error.message, /not be empty/);
      });
    });

    describe('Pattern Validations', () => {
      it('should validate startsWith', () => {
        const schema = s.string().startsWith('Hello');

        // Valid cases
        assert.equal(schema.parse('Hello World'), 'Hello World');

        // Invalid cases
        const result = schema.safeParse('Hi World');
        assert.equal(result.success, false);
        assert.match(result.error.message, /start with "Hello"/);
      });

      it('should validate endsWith', () => {
        const schema = s.string().endsWith('World');

        // Valid cases
        assert.equal(schema.parse('Hello World'), 'Hello World');

        // Invalid cases
        const result = schema.safeParse('Hello Universe');
        assert.equal(result.success, false);
        assert.match(result.error.message, /end with "World"/);
      });

      it('should validate includes', () => {
        const schema = s.string().includes('test');

        // Valid cases
        assert.equal(
          schema.parse('this is a test string'),
          'this is a test string',
        );

        // Invalid cases
        const result = schema.safeParse('no matching text here');
        assert.equal(result.success, false);
        assert.match(result.error.message, /include "test"/);
      });
    });

    describe('String Transformations', () => {
      it('should trim strings', () => {
        const schema = s.string().trim();
        assert.equal(schema.parse('  hello  '), 'hello');
      });

      it('should convert to lowercase', () => {
        const schema = s.string().toLowerCase();
        assert.equal(schema.parse('HELLO'), 'hello');
      });

      it('should convert to uppercase', () => {
        const schema = s.string().toUpperCase();
        assert.equal(schema.parse('hello'), 'HELLO');
      });

      it('should pad start of string', () => {
        const schema = s.string().padStart(5, '0');
        assert.equal(schema.parse('12'), '00012');
      });

      it('should pad end of string', () => {
        const schema = s.string().padEnd(5, '0');
        assert.equal(schema.parse('12'), '12000');
      });

      it('should replace content in string', () => {
        const schema = s.string().replace('world', 'universe');
        assert.equal(schema.parse('hello world'), 'hello universe');

        const regexSchema = s.string().replace(/[aeiou]/g, '*');
        assert.equal(regexSchema.parse('hello world'), 'h*ll* w*rld');
      });
    });

    it('should chain multiple string validations', () => {
      const schema = s.string().min(3).max(10).startsWith('te').endsWith('st');

      // Valid case
      assert.equal(schema.parse('test'), 'test');

      // Invalid cases
      assert.throws(() => schema.parse('te'), /at least 3 characters/);
      assert.throws(
        () => schema.parse('te_something_st'),
        /at most 10 characters/,
      );
      assert.throws(() => schema.parse('best'), /start with "te"/);
      assert.throws(() => schema.parse('testing'), /end with "st"/);
    });
  });

  describe('Number Schema Extensions', () => {
    describe('Range Validations', () => {
      it('should validate minimum value', () => {
        const schema = s.number().min(5);

        // Valid cases
        assert.equal(schema.parse(5), 5);
        assert.equal(schema.parse(10), 10);

        // Invalid cases
        const result = schema.safeParse(4);
        assert.equal(result.success, false);
        assert.match(result.error.message, /greater than or equal to 5/);
      });

      it('should validate maximum value', () => {
        const schema = s.number().max(10);

        // Valid cases
        assert.equal(schema.parse(5), 5);
        assert.equal(schema.parse(10), 10);

        // Invalid cases
        const result = schema.safeParse(11);
        assert.equal(result.success, false);
        assert.match(result.error.message, /less than or equal to 10/);
      });

      it('should validate positive numbers', () => {
        const schema = s.number().positive();

        // Valid cases
        assert.equal(schema.parse(5), 5);

        // Invalid cases
        const zero = schema.safeParse(0);
        assert.equal(zero.success, false);
        assert.match(zero.error.message, /must be positive/);

        const negative = schema.safeParse(-5);
        assert.equal(negative.success, false);
        assert.match(negative.error.message, /must be positive/);
      });

      it('should validate negative numbers', () => {
        const schema = s.number().negative();

        // Valid cases
        assert.equal(schema.parse(-5), -5);

        // Invalid cases
        const zero = schema.safeParse(0);
        assert.equal(zero.success, false);
        assert.match(zero.error.message, /must be negative/);

        const positive = schema.safeParse(5);
        assert.equal(positive.success, false);
        assert.match(positive.error.message, /must be negative/);
      });
    });

    describe('Type Validations', () => {
      it('should validate integers', () => {
        const schema = s.number().int();

        // Valid cases
        assert.equal(schema.parse(5), 5);

        // Invalid cases
        const result = schema.safeParse(5.5);
        assert.equal(result.success, false);
        assert.match(result.error.message, /must be an integer/);
      });

      it('should validate floating point numbers', () => {
        const schema = s.number().float();

        // Valid cases
        assert.equal(schema.parse(5.5), 5.5);

        // Invalid cases
        const result = schema.safeParse(5);
        assert.equal(result.success, false);
        assert.match(result.error.message, /must be a floating point/);
      });

      it('should validate finite numbers', () => {
        const schema = s.number().finite();

        // Valid cases
        assert.equal(schema.parse(5), 5);

        // Invalid cases
        const result = schema.safeParse(Number.POSITIVE_INFINITY);
        assert.equal(result.success, false);
        assert.match(result.error.message, /must be finite/);
      });
    });

    it('should validate multipleOf', () => {
      const schema = s.number().multipleOf(5);

      // Valid cases
      assert.equal(schema.parse(5), 5);
      assert.equal(schema.parse(10), 10);

      // Invalid cases
      const result = schema.safeParse(7);
      assert.equal(result.success, false);
      assert.match(result.error.message, /multiple of 5/);
    });

    it('should chain multiple number validations', () => {
      const schema = s.number().int().positive().max(100);

      // Valid cases
      assert.equal(schema.parse(42), 42);

      // Invalid cases
      assert.throws(() => schema.parse(3.14), /must be an integer/);
      assert.throws(() => schema.parse(-5), /must be positive/);
      assert.throws(() => schema.parse(200), /less than or equal to 100/);
    });
  });

  describe('Array Schema Extensions', () => {
    describe('Size Validations', () => {
      const stringSchema = s.string();

      it('should validate min length', () => {
        const schema = s.array(stringSchema).min(2);

        // Valid cases
        assert.deepEqual(schema.parse(['a', 'b']), ['a', 'b']);
        assert.deepEqual(schema.parse(['a', 'b', 'c']), ['a', 'b', 'c']);

        // Invalid cases
        const result = schema.safeParse(['a']);
        assert.equal(result.success, false);
        assert.match(result.error.message, /at least 2 items/);
      });

      it('should validate max length', () => {
        const schema = s.array(stringSchema).max(2);

        // Valid cases
        assert.deepEqual(schema.parse([]), []);
        assert.deepEqual(schema.parse(['a']), ['a']);
        assert.deepEqual(schema.parse(['a', 'b']), ['a', 'b']);

        // Invalid cases
        const result = schema.safeParse(['a', 'b', 'c']);
        assert.equal(result.success, false);
        assert.match(result.error.message, /at most 2 items/);
      });

      it('should validate exact length', () => {
        const schema = s.array(stringSchema).length(2);

        // Valid cases
        assert.deepEqual(schema.parse(['a', 'b']), ['a', 'b']);

        // Invalid cases
        const tooShort = schema.safeParse(['a']);
        assert.equal(tooShort.success, false);
        assert.match(tooShort.error.message, /exactly 2 items/);

        const tooLong = schema.safeParse(['a', 'b', 'c']);
        assert.equal(tooLong.success, false);
        assert.match(tooLong.error.message, /exactly 2 items/);
      });

      it('should validate nonEmpty', () => {
        const schema = s.array(stringSchema).nonEmpty();

        // Valid cases
        assert.deepEqual(schema.parse(['a']), ['a']);

        // Invalid cases
        const result = schema.safeParse([]);
        assert.equal(result.success, false);
        assert.match(result.error.message, /not be empty/);
      });
    });

    it('should validate unique items', () => {
      const stringSchema = s.string();
      const schema = s.array(stringSchema).unique();

      // Valid cases
      assert.deepEqual(schema.parse(['a', 'b', 'c']), ['a', 'b', 'c']);

      // Invalid cases
      const result = schema.safeParse(['a', 'b', 'a']);
      assert.equal(result.success, false);
      assert.match(result.error.message, /must be unique/);
    });

    describe('Array Transformations', () => {
      it('should sort items', () => {
        const numberSchema = s.number();
        const schema = s.array(numberSchema).sort();

        assert.deepEqual(schema.parse([3, 1, 2]), [1, 2, 3]);
      });

      it('should reverse items', () => {
        const numberSchema = s.number();
        const schema = s.array(numberSchema).reverse();

        assert.deepEqual(schema.parse([1, 2, 3]), [3, 2, 1]);
      });
    });

    it('should chain multiple array validations', () => {
      const numberSchema = s.number();
      const schema = s.array(numberSchema).min(2).max(5).unique();

      // Valid cases
      assert.deepEqual(schema.parse([1, 2, 3]), [1, 2, 3]);

      // Invalid cases
      assert.throws(() => schema.parse([1]), /at least 2 items/);
      assert.throws(() => schema.parse([1, 2, 3, 4, 5, 6]), /at most 5 items/);
      assert.throws(() => schema.parse([1, 2, 1]), /must be unique/);
    });
  });

  describe('Validation Composition', () => {
    it('should compose validations across different types', () => {
      const userSchema = s.object({
        name: s.string().min(2).max(50).trim(),
        age: s.number().int().positive().max(120),
        email: s.string().includes('@'),
        tags: s.array(s.string()).min(1).max(5).unique(),
      });

      // Valid case
      const validUser = {
        name: '  John Doe  ',
        age: 30,
        email: 'john@example.com',
        tags: ['developer', 'javascript'],
      };

      const parsedUser = userSchema.parse(validUser);
      assert.equal(parsedUser.name, 'John Doe'); // trimmed
      assert.equal(parsedUser.age, 30);
      assert.equal(parsedUser.email, 'john@example.com');
      assert.deepEqual(parsedUser.tags, ['developer', 'javascript']);

      // Invalid cases
      const invalidName = { ...validUser, name: 'A' };
      const nameResult = userSchema.safeParse(invalidName);
      assert.equal(nameResult.success, false);
      assert.match(nameResult.error.message, /at least 2 characters/);

      const invalidAge = { ...validUser, age: -5 };
      const ageResult = userSchema.safeParse(invalidAge);
      assert.equal(ageResult.success, false);
      assert.match(ageResult.error.message, /must be positive/);

      const invalidEmail = { ...validUser, email: 'invalid-email' };
      const emailResult = userSchema.safeParse(invalidEmail);
      assert.equal(emailResult.success, false);
      assert.match(emailResult.error.message, /include "@"/);

      const invalidTags = { ...validUser, tags: ['tag1', 'tag1'] };
      const tagsResult = userSchema.safeParse(invalidTags);
      assert.equal(tagsResult.success, false);
      assert.match(tagsResult.error.message, /must be unique/);
    });

    it('should work with custom validation messages', () => {
      const schema = s
        .string()
        .min(8, { message: 'Password must be at least 8 characters' });

      const result = schema.safeParse('pass');
      assert.equal(result.success, false);
      assert.equal(
        result.error.message,
        'Password must be at least 8 characters',
      );
    });
  });
});
