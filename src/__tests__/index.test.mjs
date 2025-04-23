import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { s } from '../index.ts';

describe('schema', () => {
  it('should parse result from defined schema and input', () => {
    const result = s
      .object({
        username: s.string().default('unknown'),
        password: s.string().default('unknown'),
        birthday: s.preprocess((value) => new Date(value), s.date()),
        account: s
          .string()
          .default('0')
          .transform((value) => Number.parseInt(value))
          .pipe(s.number()),
        money: s.number().default(0),
        address: s
          .object({
            street: s.string(),
            city: s.string().optional(),
            code: s.number().nullable(),
            zip: s.number().nullish(),
          })
          .default({ street: 'unknown' }),
        records: s
          .array(s.object({ name: s.string() }).default({ name: 'unknown' }))
          .default([]),
      })
      .default({})
      .parse({
        username: 'foo',
        password: 'bar',
        birthday: '2024-10-05T21:05:00.000Z',
        extra: 'baz',
        account: '1234',
        money: 100,
        address: { street: 'street' },
        records: [undefined, { name: 'record2' }],
      });

    assert.deepStrictEqual(result, {
      username: 'foo',
      password: 'bar',
      account: 1234,
      birthday: new Date('2024-10-05T21:05:00.000Z'),
      money: 100,
      address: {
        street: 'street',
        city: undefined,
        code: null,
        zip: undefined,
      },
      records: [{ name: 'unknown' }, { name: 'record2' }],
    });
  });

  it('should throw error with right error message', () => {
    const result = s
      .object({
        username: s.string(),
        password: s.string(),
        account: s.number(),
        address: s
          .object({
            street: s.string(),
            city: s.string(),
            code: s.number().nullable(),
            zip: s.number().nullish(),
          })
          .default({ street: 'unknown' }),
        records: s
          .array(s.object({ name: s.string() }).default({ name: 'unknown' }))
          .default([]),
      })
      .default({})
      .safeParse({
        username: 'foo',
        password: 'bar',
        extra: 'baz',
        account: 1234,
        address: { street: 'street' },
        records: [undefined, { name: 'record2' }],
      });

    assert.equal(result.success, false);
    assert.equal(
      result.error.message,
      `Error parsing key "address.city": Error parsing key "city": The value "undefined" must be type of string but is type of "undefined".`,
    );
  });
});
