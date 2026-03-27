import assert from 'node:assert';
import { describe, it } from 'node:test';
import { s } from '../index.ts';

describe('s.function()', () => {
  // ─── valid inputs ──────────────────────────────────────────────────────────
  it('passes an arrow function', () => {
    const fn = () => {};
    assert.strictEqual(s.function().parse(fn), fn);
  });

  it('passes a named function', () => {
    function handler() {}
    assert.strictEqual(s.function().parse(handler), handler);
  });

  it('passes an async function', () => {
    const fn = async () => {};
    assert.strictEqual(s.function().parse(fn), fn);
  });

  it('passes a function with arguments', () => {
    const fn = (a, b) => a + b;
    assert.strictEqual(s.function().parse(fn), fn);
  });

  it('passes a class constructor (callable)', () => {
    class MyClass {}
    assert.strictEqual(s.function().parse(MyClass), MyClass);
  });

  // ─── invalid inputs ────────────────────────────────────────────────────────
  it('throws for a string', () =>
    assert.throws(() => s.function().parse('hello')));

  it('throws for a number', () => assert.throws(() => s.function().parse(42)));

  it('throws for null', () => assert.throws(() => s.function().parse(null)));

  it('throws for undefined', () =>
    assert.throws(() => s.function().parse(undefined)));

  it('throws for a plain object', () =>
    assert.throws(() => s.function().parse({ call: () => {} })));

  it('throws for an array', () => assert.throws(() => s.function().parse([])));

  it('throws for a boolean', () =>
    assert.throws(() => s.function().parse(true)));

  // ─── error message ─────────────────────────────────────────────────────────
  it('default error message contains the invalid value', () => {
    const result = s.function().safeParse('nope');
    assert.equal(result.success, false);
    assert.ok(result.error.message.includes('nope'));
  });

  it('supports custom message as string', () => {
    const schema = s.function({ message: 'Expected a callback' });
    const result = schema.safeParse(42);
    assert.equal(result.success, false);
    assert.equal(result.error.message, 'Expected a callback');
  });

  it('supports custom message as function', () => {
    const schema = s.function({ message: (v) => `"${v}" is not a function` });
    const result = schema.safeParse(42);
    assert.equal(result.success, false);
    assert.equal(result.error.message, '"42" is not a function');
  });

  // ─── modifiers ─────────────────────────────────────────────────────────────
  it('.optional() allows undefined', () => {
    const schema = s.function().optional();
    assert.equal(schema.parse(undefined), undefined);
    const fn = () => {};
    assert.strictEqual(schema.parse(fn), fn);
  });

  it('.nullable() allows null', () => {
    const schema = s.function().nullable();
    assert.equal(schema.parse(null), null);
    const fn = () => {};
    assert.strictEqual(schema.parse(fn), fn);
  });

  it('.refine() chains correctly', () => {
    const schema = s.function().refine((fn) => fn.length === 2, {
      message: 'Must accept exactly 2 arguments',
    });
    assert.ok(schema.parse((a, b) => a + b));
    assert.throws(() => schema.parse(() => {}));
  });

  // ─── inside s.object() ─────────────────────────────────────────────────────
  it('works as a field inside s.object()', () => {
    const schema = s.object({
      name: s.string(),
      onClick: s.function(),
    });
    const fn = () => {};
    const result = schema.parse({ name: 'btn', onClick: fn });
    assert.equal(result.name, 'btn');
    assert.strictEqual(result.onClick, fn);
  });

  it('fails inside s.object() when field is not a function', () => {
    const schema = s.object({
      name: s.string(),
      onClick: s.function(),
    });
    assert.throws(() => schema.parse({ name: 'btn', onClick: 'not-a-fn' }));
  });

  it('safeParse returns success:false for invalid function field', () => {
    const schema = s.object({ handler: s.function() });
    const result = schema.safeParse({ handler: null });
    assert.equal(result.success, false);
  });
});
