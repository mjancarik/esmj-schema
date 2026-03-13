import assert from 'node:assert';
import { describe, it } from 'node:test';
import { s } from '../index.ts';

describe('s.cast', () => {
  // ─── boolean ───────────────────────────────────────────────────────────────
  describe('cast.boolean()', () => {
    it('passes true through', () =>
      assert.equal(s.cast.boolean().parse(true), true));
    it('passes false through', () =>
      assert.equal(s.cast.boolean().parse(false), false));

    it("casts 'true' to true", () =>
      assert.equal(s.cast.boolean().parse('true'), true));
    it("casts 'True' (mixed case) to true", () =>
      assert.equal(s.cast.boolean().parse('True'), true));
    it("casts 'TRUE' to true", () =>
      assert.equal(s.cast.boolean().parse('TRUE'), true));
    it("casts 'false' to false", () =>
      assert.equal(s.cast.boolean().parse('false'), false));
    it("casts 'FALSE' to false", () =>
      assert.equal(s.cast.boolean().parse('FALSE'), false));

    it("casts 'yes' to true", () =>
      assert.equal(s.cast.boolean().parse('yes'), true));
    it("casts 'YES' to true", () =>
      assert.equal(s.cast.boolean().parse('YES'), true));
    it("casts 'no' to false", () =>
      assert.equal(s.cast.boolean().parse('no'), false));

    it("casts 'on' to true", () =>
      assert.equal(s.cast.boolean().parse('on'), true));
    it("casts 'off' to false", () =>
      assert.equal(s.cast.boolean().parse('off'), false));
    it("casts 'ON' to true", () =>
      assert.equal(s.cast.boolean().parse('ON'), true));

    it("casts string '1' to true", () =>
      assert.equal(s.cast.boolean().parse('1'), true));
    it("casts string '0' to false", () =>
      assert.equal(s.cast.boolean().parse('0'), false));

    it('casts number 1 to true', () =>
      assert.equal(s.cast.boolean().parse(1), true));
    it('casts number 0 to false', () =>
      assert.equal(s.cast.boolean().parse(0), false));

    it('throws for unrecognised string', () =>
      assert.throws(
        () => s.cast.boolean().parse('hello'),
        /Cannot cast "hello" to boolean/,
      ));

    it('throws for number 2 (not 0 or 1)', () =>
      assert.throws(
        () => s.cast.boolean().parse(2),
        /Cannot cast "2" to boolean/,
      ));

    it('throws for null', () =>
      assert.throws(
        () => s.cast.boolean().parse(null),
        /Cannot cast "null" to boolean/,
      ));

    it('throws for undefined', () =>
      assert.throws(
        () => s.cast.boolean().parse(undefined),
        /Cannot cast "undefined" to boolean/,
      ));

    it('throws for empty string', () =>
      assert.throws(
        () => s.cast.boolean().parse(''),
        /Cannot cast "" to boolean/,
      ));

    it('supports custom message', () =>
      assert.throws(
        () => s.cast.boolean({ message: 'bad boolean' }).parse('nope'),
        /bad boolean/,
      ));

    it('chains refine after cast', () =>
      assert.throws(
        () =>
          s.cast
            .boolean()
            .refine((v) => v === true, { message: 'Must be true' })
            .parse('false'),
        /Must be true/,
      ));
  });

  // ─── number ────────────────────────────────────────────────────────────────
  describe('cast.number()', () => {
    it('passes through a plain number', () =>
      assert.equal(s.cast.number().parse(42), 42));
    it('passes through 0', () => assert.equal(s.cast.number().parse(0), 0));
    it('passes through negative', () =>
      assert.equal(s.cast.number().parse(-7.5), -7.5));

    it('casts numeric string', () =>
      assert.equal(s.cast.number().parse('42'), 42));
    it('casts float string', () =>
      assert.equal(s.cast.number().parse('3.14'), 3.14));
    it('casts negative string', () =>
      assert.equal(s.cast.number().parse('-10'), -10));
    it('trims whitespace from string', () =>
      assert.equal(s.cast.number().parse('  99 '), 99));

    it('casts true to 1', () => assert.equal(s.cast.number().parse(true), 1));
    it('casts false to 0', () => assert.equal(s.cast.number().parse(false), 0));

    it('throws for null', () =>
      assert.throws(
        () => s.cast.number().parse(null),
        /Cannot cast "null" to a number/,
      ));

    it('throws for undefined', () =>
      assert.throws(
        () => s.cast.number().parse(undefined),
        /Cannot cast "undefined" to a number/,
      ));

    it('throws for empty string', () =>
      assert.throws(
        () => s.cast.number().parse(''),
        /Cannot cast "" to a number/,
      ));

    it('throws for whitespace-only string', () =>
      assert.throws(
        () => s.cast.number().parse('   '),
        /Cannot cast " {3}" to a number/,
      ));

    it('throws for non-numeric string', () =>
      assert.throws(
        () => s.cast.number().parse('bad'),
        /Cannot cast "bad" to a number/,
      ));

    it('does NOT emit the misleading "type of number" message', () => {
      const result = s.cast.number().safeParse('bad');
      assert.equal(result.success, false);
      assert.ok(
        !result.error.message.includes('must be type of number'),
        `message should not say "must be type of number" but was: ${result.error.message}`,
      );
    });

    it('supports custom message', () =>
      assert.throws(
        () => s.cast.number({ message: 'not a number!' }).parse('x'),
        /not a number!/,
      ));

    it('chains refine after cast', () =>
      assert.equal(
        s.cast
          .number()
          .refine((v) => v > 0, { message: 'Must be positive' })
          .parse('5'),
        5,
      ));
  });

  // ─── string ────────────────────────────────────────────────────────────────
  describe('cast.string()', () => {
    it('passes through a plain string', () =>
      assert.equal(s.cast.string().parse('hello'), 'hello'));
    it('passes through empty string', () =>
      assert.equal(s.cast.string().parse(''), ''));

    it('casts integer to string', () =>
      assert.equal(s.cast.string().parse(123), '123'));
    it('casts float to string', () =>
      assert.equal(s.cast.string().parse(3.14), '3.14'));
    it('casts 0 to string', () => assert.equal(s.cast.string().parse(0), '0'));
    it('casts negative to string', () =>
      assert.equal(s.cast.string().parse(-7), '-7'));

    it('casts true to string', () =>
      assert.equal(s.cast.string().parse(true), 'true'));
    it('casts false to string', () =>
      assert.equal(s.cast.string().parse(false), 'false'));

    it('throws for null', () =>
      assert.throws(
        () => s.cast.string().parse(null),
        /Cannot cast "null" to string/,
      ));

    it('throws for undefined', () =>
      assert.throws(
        () => s.cast.string().parse(undefined),
        /Cannot cast "undefined" to string/,
      ));

    it('throws for NaN', () =>
      assert.throws(
        () => s.cast.string().parse(Number.NaN),
        /Cannot cast "NaN" to string/,
      ));

    it('throws for Infinity', () =>
      assert.throws(
        () => s.cast.string().parse(Number.POSITIVE_INFINITY),
        /Cannot cast "Infinity" to string/,
      ));

    it('throws for plain object', () =>
      assert.throws(
        () => s.cast.string().parse({ a: 1 }),
        /Cannot cast "\[object Object\]" to string/,
      ));

    it('supports custom message', () =>
      assert.throws(
        () => s.cast.string({ message: 'not a string!' }).parse(null),
        /not a string!/,
      ));
  });

  // ─── date ──────────────────────────────────────────────────────────────────
  describe('cast.date()', () => {
    it('passes through a valid Date object', () => {
      const d = new Date('2024-01-01');
      assert.equal(s.cast.date().parse(d), d);
    });

    it('casts ISO string to Date', () => {
      const result = s.cast.date().parse('2024-01-01');
      assert.ok(result instanceof Date);
      assert.ok(!Number.isNaN(result.getTime()));
    });

    it('casts finite timestamp to Date', () => {
      const result = s.cast.date().parse(1704067200000);
      assert.ok(result instanceof Date);
      assert.ok(!Number.isNaN(result.getTime()));
    });

    it('throws for null', () =>
      assert.throws(
        () => s.cast.date().parse(null),
        /Cannot cast "null" to a valid date/,
      ));

    it('throws for undefined', () =>
      assert.throws(
        () => s.cast.date().parse(undefined),
        /Cannot cast "undefined" to a valid date/,
      ));

    it('throws for true', () =>
      assert.throws(
        () => s.cast.date().parse(true),
        /Cannot cast "true" to a valid date/,
      ));

    it('throws for false', () =>
      assert.throws(
        () => s.cast.date().parse(false),
        /Cannot cast "false" to a valid date/,
      ));

    it('throws for empty string', () =>
      assert.throws(
        () => s.cast.date().parse(''),
        /Cannot cast "" to a valid date/,
      ));

    it('throws for invalid date string', () =>
      assert.throws(
        () => s.cast.date().parse('not-a-date'),
        /Cannot cast .* to a valid date/,
      ));

    it('throws for Infinity', () =>
      assert.throws(
        () => s.cast.date().parse(Number.POSITIVE_INFINITY),
        /Cannot cast "Infinity" to a valid date/,
      ));

    it('supports custom message', () =>
      assert.throws(
        () => s.cast.date({ message: 'bad date!' }).parse('garbage'),
        /bad date!/,
      ));
  });

  // ─── coerce vs cast comparison ─────────────────────────────────────────────
  describe('cast vs coerce behavioural differences', () => {
    it("cast.boolean('false') is false, coerce.boolean('false') is true", () => {
      assert.equal(s.cast.boolean().parse('false'), false);
      assert.equal(s.coerce.boolean().parse('false'), true);
    });

    it('cast.number(null) throws, coerce.number(null) returns 0', () => {
      assert.throws(() => s.cast.number().parse(null));
      assert.equal(s.coerce.number().parse(null), 0);
    });

    it("cast.number('') throws, coerce.number('') returns 0", () => {
      assert.throws(() => s.cast.number().parse(''));
      assert.equal(s.coerce.number().parse(''), 0);
    });

    it("cast.string(null) throws, coerce.string(null) returns 'null'", () => {
      assert.throws(() => s.cast.string().parse(null));
      assert.equal(s.coerce.string().parse(null), 'null');
    });

    it('cast.date(null) throws, coerce.date(null) returns epoch Date', () => {
      assert.throws(() => s.cast.date().parse(null));
      const epoch = s.coerce.date().parse(null);
      assert.ok(epoch instanceof Date);
    });
  });

  // ─── json ──────────────────────────────────────────────────────────────────
  describe('cast.json()', () => {
    it('parses a JSON object string into an object', () => {
      const schema = s.cast.json(s.object({ name: s.string() }));
      assert.deepEqual(schema.parse('{"name":"Alice"}'), { name: 'Alice' });
    });

    it('parses a JSON array string into an array', () => {
      const schema = s.cast.json(s.array(s.number()));
      assert.deepEqual(schema.parse('[1,2,3]'), [1, 2, 3]);
    });

    it('parses a JSON number string', () => {
      assert.equal(s.cast.json(s.number()).parse('42'), 42);
    });

    it('parses a JSON boolean string', () => {
      assert.equal(s.cast.json(s.boolean()).parse('true'), true);
    });

    it('passes a non-string object directly to the inner schema', () => {
      const schema = s.cast.json(s.object({ name: s.string() }));
      assert.deepEqual(schema.parse({ name: 'Alice' }), { name: 'Alice' });
    });

    it('passes a non-string array directly to the inner schema', () => {
      const schema = s.cast.json(s.array(s.number()));
      assert.deepEqual(schema.parse([1, 2, 3]), [1, 2, 3]);
    });

    it('safeParse returns failure for invalid JSON string', () => {
      const result = s.cast
        .json(s.object({ name: s.string() }))
        .safeParse('not json');
      assert.equal(result.success, false);
    });

    it('safeParse returns failure for empty string', () => {
      const result = s.cast.json(s.object({ name: s.string() })).safeParse('');
      assert.equal(result.success, false);
    });

    it('does NOT throw on invalid JSON — safeParse is safe', () => {
      assert.doesNotThrow(() =>
        s.cast.json(s.object({ name: s.string() })).safeParse('{bad json}'),
      );
    });

    it('error message contains the invalid input', () => {
      const result = s.cast.json(s.number()).safeParse('bad');
      assert.equal(result.success, false);
      assert.ok(result.error.message.includes('bad'));
    });

    it('supports custom error message string', () => {
      const schema = s.cast.json(s.number(), { message: 'Bad JSON' });
      const result = schema.safeParse('bad');
      assert.equal(result.success, false);
      assert.equal(result.error.message, 'Bad JSON');
    });

    it('supports custom error message function', () => {
      const schema = s.cast.json(s.number(), {
        message: (v) => `custom: ${v}`,
      });
      const result = schema.safeParse('bad');
      assert.equal(result.success, false);
      assert.equal(result.error.message, 'custom: bad');
    });

    it('inner schema validation still runs after parse', () => {
      const schema = s.cast.json(s.object({ age: s.number() }));
      const result = schema.safeParse('{"age":"not-a-number"}');
      assert.equal(result.success, false);
    });

    it('chains .optional()', () => {
      const schema = s.cast.json(s.number()).optional();
      assert.equal(schema.parse(undefined), undefined);
      assert.equal(schema.parse('42'), 42);
    });
  });
});
