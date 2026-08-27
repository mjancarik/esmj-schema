import assert from 'node:assert';
import { describe, it } from 'node:test';
import { extend, s } from '../full.ts';
import '../standard.ts';

const draft07 = { target: 'draft-07' };
const draft202012 = { target: 'draft-2020-12' };

describe('Standard Schema / Standard JSON Schema', () => {
  describe('~standard base props', () => {
    it('exposes version and vendor', () => {
      const schema = s.string();
      assert.strictEqual(schema['~standard'].version, 1);
      assert.strictEqual(schema['~standard'].vendor, 'esmj-schema');
    });

    it('validate() returns { value } on success', () => {
      const schema = s.string();
      const result = schema['~standard'].validate('hello');
      assert.deepStrictEqual(result, { value: 'hello' });
    });

    it('validate() returns { issues } on failure', () => {
      const schema = s.string();
      const result = schema['~standard'].validate(123);
      assert.strictEqual('issues' in result, true);
      assert.strictEqual(result.issues.length, 1);
      assert.strictEqual(typeof result.issues[0].message, 'string');
    });

    it('validate() reports nested path for object schemas', () => {
      const schema = s.object({ user: s.object({ name: s.string() }) });
      const result = schema['~standard'].validate(
        { user: { name: 123 } },
        undefined,
      );
      assert.strictEqual('issues' in result, true);
      assert.deepStrictEqual(result.issues[0].path, ['user', 'name']);
    });
  });

  describe('jsonSchema.input() — primitives', () => {
    it('string', () => {
      const result = s.string()['~standard'].jsonSchema.input(draft07);
      assert.strictEqual(
        result.$schema,
        'http://json-schema.org/draft-07/schema#',
      );
      assert.strictEqual(result.type, 'string');
    });

    it('number', () => {
      const result = s.number()['~standard'].jsonSchema.input(draft202012);
      assert.strictEqual(
        result.$schema,
        'https://json-schema.org/draft/2020-12/schema',
      );
      assert.strictEqual(result.type, 'number');
    });

    it('boolean', () => {
      const result = s.boolean()['~standard'].jsonSchema.input(draft07);
      assert.strictEqual(result.type, 'boolean');
    });

    it('date', () => {
      const result = s.date()['~standard'].jsonSchema.input(draft07);
      assert.strictEqual(result.type, 'string');
      assert.strictEqual(result.format, 'date-time');
    });

    it('any', () => {
      const result = s.any()['~standard'].jsonSchema.input(draft07);
      assert.deepStrictEqual(
        Object.keys(result).filter((k) => k !== '$schema'),
        [],
      );
    });

    it('literal -> const', () => {
      const result = s.literal('admin')['~standard'].jsonSchema.input(draft07);
      assert.strictEqual(result.const, 'admin');
    });

    it('enum -> enum', () => {
      const result = s
        .enum(['a', 'b', 'c'])
        ['~standard'].jsonSchema.input(draft07);
      assert.strictEqual(result.type, 'string');
      assert.deepStrictEqual(result.enum, ['a', 'b', 'c']);
    });

    it('union -> anyOf', () => {
      const result = s
        .union([s.string(), s.number()])
        ['~standard'].jsonSchema.input(draft07);
      assert.deepStrictEqual(result.anyOf, [
        { type: 'string' },
        { type: 'number' },
      ]);
    });

    it('function throws (unsupported)', () => {
      assert.throws(() => {
        s.function()['~standard'].jsonSchema.input(draft07);
      });
    });

    it('unsupported target throws', () => {
      assert.throws(() => {
        s.string()['~standard'].jsonSchema.input({ target: 'openapi-3.0' });
      });
    });
  });

  describe('jsonSchema — string constraints', () => {
    it('min/max -> minLength/maxLength', () => {
      const result = s
        .string()
        .min(3)
        .max(10)
        ['~standard'].jsonSchema.input(draft07);
      assert.strictEqual(result.minLength, 3);
      assert.strictEqual(result.maxLength, 10);
    });

    it('length -> minLength === maxLength', () => {
      const result = s
        .string()
        .length(5)
        ['~standard'].jsonSchema.input(draft07);
      assert.strictEqual(result.minLength, 5);
      assert.strictEqual(result.maxLength, 5);
    });

    it('nonEmpty -> minLength 1', () => {
      const result = s
        .string()
        .nonEmpty()
        ['~standard'].jsonSchema.input(draft07);
      assert.strictEqual(result.minLength, 1);
    });

    it('startsWith -> single pattern', () => {
      const result = s
        .string()
        .startsWith('foo')
        ['~standard'].jsonSchema.input(draft07);
      assert.strictEqual(result.pattern, '^foo');
    });

    it('startsWith + endsWith -> allOf of two patterns', () => {
      const result = s
        .string()
        .startsWith('foo')
        .endsWith('bar')
        ['~standard'].jsonSchema.input(draft07);
      assert.deepStrictEqual(result.allOf, [
        { pattern: '^foo' },
        { pattern: 'bar$' },
      ]);
      assert.strictEqual('pattern' in result, false);
    });

    it('repeated min() keeps the strictest (largest) bound', () => {
      const result = s
        .string()
        .min(3)
        .min(5)
        ['~standard'].jsonSchema.input(draft07);
      assert.strictEqual(result.minLength, 5);
    });

    it('a caller-supplied jsonSchema option on a built-in constraint method is ignored', () => {
      // min() always contributes its own fixed `{ minLength: <length> }`
      // hint to refine() and does not forward a caller-supplied `jsonSchema`
      // option (only `message` is read from the options argument).
      const result = s
        .string()
        .min(3, { jsonSchema: { minLength: 999 } })
        ['~standard'].jsonSchema.input(draft07);
      assert.strictEqual(result.minLength, 3);
    });

    it('trim()/toLowerCase() do not affect input() or throw on output()', () => {
      const schema = s.string().trim().toLowerCase();
      const input = schema['~standard'].jsonSchema.input(draft07);
      assert.strictEqual(input.type, 'string');
      const output = schema['~standard'].jsonSchema.output(draft07);
      assert.strictEqual(output.type, 'string');
    });
  });

  describe('jsonSchema — number constraints', () => {
    it('min/max -> minimum/maximum', () => {
      const result = s
        .number()
        .min(0)
        .max(100)
        ['~standard'].jsonSchema.input(draft07);
      assert.strictEqual(result.minimum, 0);
      assert.strictEqual(result.maximum, 100);
    });

    it('int() -> type integer', () => {
      const result = s.number().int()['~standard'].jsonSchema.input(draft07);
      assert.strictEqual(result.type, 'integer');
    });

    it('positive() -> exclusiveMinimum 0', () => {
      const result = s
        .number()
        .positive()
        ['~standard'].jsonSchema.input(draft07);
      assert.strictEqual(result.exclusiveMinimum, 0);
    });

    it('negative() -> exclusiveMaximum 0', () => {
      const result = s
        .number()
        .negative()
        ['~standard'].jsonSchema.input(draft07);
      assert.strictEqual(result.exclusiveMaximum, 0);
    });

    it('multipleOf()', () => {
      const result = s
        .number()
        .multipleOf(5)
        ['~standard'].jsonSchema.input(draft07);
      assert.strictEqual(result.multipleOf, 5);
    });

    it('float() -> not integer', () => {
      const result = s.number().float()['~standard'].jsonSchema.input(draft07);
      assert.deepStrictEqual(result.not, { type: 'integer' });
    });
  });

  describe('jsonSchema — array constraints', () => {
    it('min/max -> minItems/maxItems + items', () => {
      const result = s
        .array(s.string())
        .min(1)
        .max(5)
        ['~standard'].jsonSchema.input(draft07);
      assert.strictEqual(result.type, 'array');
      assert.strictEqual(result.minItems, 1);
      assert.strictEqual(result.maxItems, 5);
      assert.deepStrictEqual(result.items, { type: 'string' });
    });

    it('unique() -> uniqueItems', () => {
      const result = s
        .array(s.number())
        .unique()
        ['~standard'].jsonSchema.input(draft07);
      assert.strictEqual(result.uniqueItems, true);
    });

    it('nonEmpty() -> minItems 1', () => {
      const result = s
        .array(s.number())
        .nonEmpty()
        ['~standard'].jsonSchema.input(draft07);
      assert.strictEqual(result.minItems, 1);
    });

    it('sort()/reverse() do not affect input() or throw on output()', () => {
      const schema = s.array(s.number()).sort();
      assert.strictEqual(
        schema['~standard'].jsonSchema.input(draft07).type,
        'array',
      );
      assert.strictEqual(
        schema['~standard'].jsonSchema.output(draft07).type,
        'array',
      );
    });
  });

  describe('jsonSchema — object schemas', () => {
    it('properties/required/additionalProperties: false', () => {
      const schema = s.object({
        name: s.string(),
        age: s.number().optional(),
      });
      const result = schema['~standard'].jsonSchema.input(draft07);

      assert.strictEqual(result.type, 'object');
      assert.deepStrictEqual(result.properties, {
        name: { type: 'string' },
        age: { type: 'number' },
      });
      assert.deepStrictEqual(result.required, ['name']);
      assert.strictEqual(result.additionalProperties, false);
    });

    it('nested objects convert recursively', () => {
      const schema = s.object({
        user: s.object({ name: s.string() }),
      });
      const result = schema['~standard'].jsonSchema.input(draft07);
      assert.deepStrictEqual(result.properties.user, {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
        additionalProperties: false,
      });
    });

    it('array of objects', () => {
      const schema = s.array(s.object({ id: s.number() }));
      const result = schema['~standard'].jsonSchema.input(draft07);
      assert.deepStrictEqual(result.items, {
        type: 'object',
        properties: { id: { type: 'number' } },
        required: ['id'],
        additionalProperties: false,
      });
    });
  });

  describe('jsonSchema — modifiers', () => {
    it('optional() excludes field from parent required[] but does not change own type', () => {
      const schema = s.object({ nickname: s.string().optional() });
      const result = schema['~standard'].jsonSchema.input(draft07);
      assert.strictEqual('required' in result, false);
      assert.deepStrictEqual(result.properties.nickname, { type: 'string' });
    });

    it('nullable() adds "null" to type', () => {
      const result = s
        .string()
        .nullable()
        ['~standard'].jsonSchema.input(draft07);
      assert.deepStrictEqual(result.type, ['string', 'null']);
    });

    it('nullable() on const/anyOf shapes wraps with anyOf', () => {
      const result = s
        .literal('x')
        .nullable()
        ['~standard'].jsonSchema.input(draft07);
      assert.deepStrictEqual(result.anyOf, [{ const: 'x' }, { type: 'null' }]);
    });

    it('default() adds default keyword', () => {
      const result = s
        .string()
        .default('unknown')
        ['~standard'].jsonSchema.input(draft07);
      assert.strictEqual(result.default, 'unknown');
    });

    it('default() with a function is skipped (no default keyword)', () => {
      const result = s
        .number()
        .default(() => Date.now())
        ['~standard'].jsonSchema.input(draft07);
      assert.strictEqual('default' in result, false);
    });
  });

  describe('jsonSchema — transform()', () => {
    it('output() throws without a hint', () => {
      const schema = s.string().transform((v) => v.length);
      assert.throws(() => schema['~standard'].jsonSchema.output(draft07));
    });

    it('input() is unaffected by transform() without a hint', () => {
      const schema = s.string().transform((v) => v.length);
      const result = schema['~standard'].jsonSchema.input(draft07);
      assert.strictEqual(result.type, 'string');
    });

    it('output() throws when jsonSchema is explicitly undefined (treated like no hint)', () => {
      const schema = s
        .string()
        .transform((v) => v.length, { jsonSchema: undefined });
      assert.throws(() => schema['~standard'].jsonSchema.output(draft07));
    });

    it('output() uses the explicit hint when provided', () => {
      const schema = s
        .string()
        .transform((v) => v.length, { jsonSchema: { type: 'number' } });
      const result = schema['~standard'].jsonSchema.output(draft07);
      assert.strictEqual(result.type, 'number');
    });
  });

  describe('jsonSchema — pipe()', () => {
    it('output() delegates to the piped-into schema', () => {
      const schema = s
        .string()
        .transform((v) => Number.parseInt(v, 10))
        .pipe(s.number().positive());
      const output = schema['~standard'].jsonSchema.output(draft07);
      assert.strictEqual(output.type, 'number');
      assert.strictEqual(output.exclusiveMinimum, 0);
    });

    it('input() is unaffected by pipe()', () => {
      const schema = s
        .string()
        .transform((v) => Number.parseInt(v, 10))
        .pipe(s.number().positive());
      const input = schema['~standard'].jsonSchema.input(draft07);
      assert.strictEqual(input.type, 'string');
    });
  });

  describe('jsonSchema — custom refine() hints (extend() integration)', () => {
    extend((schema, _validation, options) => {
      if (options?.type === 'number') {
        schema.evenNumber = function () {
          return this.refine((value) => value % 2 === 0, {
            message: 'Number must be even',
            jsonSchema: { multipleOf: 2 },
          });
        };
      }
      return schema;
    });

    it('a third-party extend()-added constraint method contributes its jsonSchema hint without standard.ts knowing its name', () => {
      const result = s
        .number()
        .evenNumber()
        ['~standard'].jsonSchema.input(draft07);
      assert.strictEqual(result.multipleOf, 2);
    });

    it('repeated custom refine() hints on exclusiveMinimum keep the strictest (largest) bound', () => {
      const result = s
        .number()
        .refine((v) => v > 1, { jsonSchema: { exclusiveMinimum: 1 } })
        .refine((v) => v > 5, { jsonSchema: { exclusiveMinimum: 5 } })
        ['~standard'].jsonSchema.input(draft07);
      assert.strictEqual(result.exclusiveMinimum, 5);
    });

    it('repeated custom refine() hints on exclusiveMaximum keep the strictest (smallest) bound', () => {
      const result = s
        .number()
        .refine((v) => v < 100, { jsonSchema: { exclusiveMaximum: 100 } })
        .refine((v) => v < 10, { jsonSchema: { exclusiveMaximum: 10 } })
        ['~standard'].jsonSchema.input(draft07);
      assert.strictEqual(result.exclusiveMaximum, 10);
    });
  });

  describe('clone() divergence', () => {
    it('independent .min()/.max() calls on separate clones do not leak into each other', () => {
      const base = s.string();
      const a = base.clone().min(3);
      const b = base.clone().max(1);

      const aResult = a['~standard'].jsonSchema.input(draft07);
      const bResult = b['~standard'].jsonSchema.input(draft07);

      assert.strictEqual(aResult.minLength, 3);
      assert.strictEqual('maxLength' in aResult, false);

      assert.strictEqual(bResult.maxLength, 1);
      assert.strictEqual('minLength' in bResult, false);

      // The original base schema must remain unaffected by either clone.
      const baseResult = base['~standard'].jsonSchema.input(draft07);
      assert.strictEqual('minLength' in baseResult, false);
      assert.strictEqual('maxLength' in baseResult, false);
    });

    it('optional() on one clone does not affect a sibling clone', () => {
      const base = s.string();
      const required = base.clone();
      const optional = base.clone().optional();

      const schema = s.object({ required, optional });
      const result = schema['~standard'].jsonSchema.input(draft07);

      assert.deepStrictEqual(result.required, ['required']);
    });
  });
});
