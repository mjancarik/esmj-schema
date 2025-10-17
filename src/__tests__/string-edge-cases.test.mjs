import assert from 'node:assert';
import { describe, it } from 'node:test';
import { s } from '../string.ts';

describe('String Extensions - Edge Cases', () => {
  it('should handle empty string with min(0)', () => {
    const schema = s.string().min(0);
    const result = schema.safeParse('');
    assert.strictEqual(result.success, true);
  });

  it('should handle unicode characters in length validation', () => {
    const schema = s.string().length(5);
    // Emoji counts as multiple characters in JavaScript
    const result = schema.safeParse('👨‍👩‍👧‍👦test');
    // This will likely fail due to how JS counts unicode
    assert.strictEqual(result.success, false);
  });

  it('should handle very long strings efficiently', () => {
    const schema = s.string().max(1000000);
    const longString = 'a'.repeat(1000000);
    const result = schema.safeParse(longString);
    assert.strictEqual(result.success, true);
  });

  it('should chain multiple transformations correctly', () => {
    const schema = s.string().trim().toLowerCase().padStart(10, '0');
    const result = schema.parse('  HELLO  ');
    assert.strictEqual(result, '00000hello');
  });

  it('should handle replace with regex flags', () => {
    const schema = s.string().replace(/hello/gi, 'goodbye');
    const result = schema.parse('Hello HELLO hello');
    assert.strictEqual(result, 'goodbye goodbye goodbye');
  });

  it('should handle startsWith with empty string', () => {
    const schema = s.string().startsWith('');
    const result = schema.safeParse('anything');
    assert.strictEqual(result.success, true);
  });

  it('should handle endsWith with empty string', () => {
    const schema = s.string().endsWith('');
    const result = schema.safeParse('anything');
    assert.strictEqual(result.success, true);
  });

  it('should handle includes with empty string', () => {
    const schema = s.string().includes('');
    const result = schema.safeParse('anything');
    assert.strictEqual(result.success, true);
  });

  it('should handle multiple min/max constraints', () => {
    const schema = s.string().min(3).max(10).min(5); // Last min should override
    const result1 = schema.safeParse('test'); // 4 chars
    const result2 = schema.safeParse('hello'); // 5 chars
    assert.strictEqual(result1.success, false);
    assert.strictEqual(result2.success, true);
  });

  it('should handle padStart with multi-byte characters', () => {
    const schema = s.string().padStart(5, '🎉');
    const result = schema.parse('hi');
    assert.strictEqual(result.length >= 5, true);
  });

  it('should validate and transform in correct order', () => {
    const schema = s.string().min(3).trim().toLowerCase();
    // Should validate length BEFORE trim
    const result = schema.safeParse('  HI  '); // 6 chars including spaces
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data, 'hi');
  });

  it('should handle case transformations with special characters', () => {
    const schema = s.string().toLowerCase();
    const result = schema.parse('ÀÉÎÖÜ123!@#');
    assert.strictEqual(result, 'àéîöü123!@#');
  });

  it('should handle toUpperCase with special characters', () => {
    const schema = s.string().toUpperCase();
    const result = schema.parse('àéîöü123!@#');
    assert.strictEqual(result, 'ÀÉÎÖÜ123!@#');
  });

  it('should handle padEnd with default space character', () => {
    const schema = s.string().padEnd(8);
    const result = schema.parse('hello');
    assert.strictEqual(result, 'hello   ');
    assert.strictEqual(result.length, 8);
  });

  it('should handle replace with empty string', () => {
    const schema = s.string().replace('hello', '');
    const result = schema.parse('hello world');
    assert.strictEqual(result, ' world');
  });

  it('should handle nonEmpty validation', () => {
    const schema = s.string().nonEmpty();
    const result1 = schema.safeParse('hello');
    const result2 = schema.safeParse('');
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, false);
  });

  it('should validate exact length', () => {
    const schema = s.string().length(5);
    const result1 = schema.safeParse('hello');
    const result2 = schema.safeParse('hi');
    const result3 = schema.safeParse('hello world');
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result2.success, false);
    assert.strictEqual(result3.success, false);
  });
});
