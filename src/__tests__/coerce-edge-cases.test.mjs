import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { s } from '../coerce.ts';

describe('s.coerce', () => {
  describe('coerce.number()', () => {
    it('parses string "42" to 42', () =>
      assert.equal(s.coerce.number().parse('42'), 42));

    it('parses "3.14" to 3.14', () =>
      assert.equal(s.coerce.number().parse('3.14'), 3.14));

    it('parses true to 1', () =>
      assert.equal(s.coerce.number().parse(true), 1));

    it('parses false to 0', () =>
      assert.equal(s.coerce.number().parse(false), 0));

    it('parses null to 0', () =>
      assert.equal(s.coerce.number().parse(null), 0));

    it('parses empty string "" to 0', () =>
      assert.equal(s.coerce.number().parse(''), 0));

    it('throws with coerce message for non-numeric string', () =>
      assert.throws(
        () => s.coerce.number().parse('bad'),
        /Cannot coerce .* to a valid number/,
      ));

    it('throws with coerce message for undefined (NaN result)', () =>
      assert.throws(
        () => s.coerce.number().parse(undefined),
        /Cannot coerce .* to a valid number/,
      ));

    it('does NOT emit the misleading "type of number" message', () => {
      const result = s.coerce.number().safeParse('bad');
      assert.equal(result.success, false);
      assert.ok(
        !result.error.message.includes('must be type of number'),
        `Expected no "must be type of number" message, got: ${result.error.message}`,
      );
    });

    it('safeParse returns success with coerced number', () => {
      const result = s.coerce.number().safeParse('99');
      assert.equal(result.success, true);
      assert.equal(result.data, 99);
    });

    it('supports custom error message option', () =>
      assert.throws(
        () => s.coerce.number({ message: 'custom number error' }).parse('bad'),
        /custom number error/,
      ));

    it('chains refine after coerce', () =>
      assert.throws(
        () =>
          s.coerce
            .number()
            .refine((v) => v > 0, { message: 'must be positive' })
            .parse('-5'),
        /must be positive/,
      ));

    it('chains refine success after coerce', () =>
      assert.equal(
        s.coerce
          .number()
          .refine((v) => v > 0, { message: 'must be positive' })
          .parse('5'),
        5,
      ));
  });

  describe('coerce.string()', () => {
    it('parses number 123 to "123"', () =>
      assert.equal(s.coerce.string().parse(123), '123'));

    it('parses true to "true"', () =>
      assert.equal(s.coerce.string().parse(true), 'true'));

    it('parses false to "false"', () =>
      assert.equal(s.coerce.string().parse(false), 'false'));

    it('parses null to "null"', () =>
      assert.equal(s.coerce.string().parse(null), 'null'));

    it('parses undefined to "undefined"', () =>
      assert.equal(s.coerce.string().parse(undefined), 'undefined'));

    it('parses 0 to "0"', () => assert.equal(s.coerce.string().parse(0), '0'));
  });

  describe('coerce.boolean()', () => {
    it('parses 1 to true', () =>
      assert.equal(s.coerce.boolean().parse(1), true));

    it('parses 0 to false', () =>
      assert.equal(s.coerce.boolean().parse(0), false));

    it('parses non-empty string to true', () =>
      assert.equal(s.coerce.boolean().parse('hello'), true));

    it('parses empty string to false', () =>
      assert.equal(s.coerce.boolean().parse(''), false));

    it('parses "false" to true (non-empty string — JS semantics)', () =>
      assert.equal(s.coerce.boolean().parse('false'), true));

    it('parses null to false', () =>
      assert.equal(s.coerce.boolean().parse(null), false));

    it('parses undefined to false', () =>
      assert.equal(s.coerce.boolean().parse(undefined), false));
  });

  describe('coerce.date()', () => {
    it('parses ISO string to Date', () => {
      const result = s.coerce.date().parse('2024-01-01');
      assert.ok(result instanceof Date);
      assert.equal(result.getFullYear(), 2024);
    });

    it('parses numeric timestamp to Date', () => {
      const ts = 1704067200000;
      const result = s.coerce.date().parse(ts);
      assert.ok(result instanceof Date);
      assert.equal(result.getTime(), ts);
    });

    it('passes through an existing Date', () => {
      const d = new Date('2024-06-15');
      assert.ok(s.coerce.date().parse(d) instanceof Date);
    });

    it('throws with coerce message for invalid date string', () =>
      assert.throws(
        () => s.coerce.date().parse('not-a-date'),
        /Cannot coerce .* to a valid date/,
      ));

    it('safeParse returns failure for garbage input', () => {
      const result = s.coerce.date().safeParse('garbage');
      assert.equal(result.success, false);
    });

    it('supports custom error message option', () =>
      assert.throws(
        () => s.coerce.date({ message: 'bad date input' }).parse('garbage'),
        /bad date input/,
      ));
  });
});
