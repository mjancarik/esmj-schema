import {
  type ArraySchemaInterface,
  type SchemaInterfaceOptions,
  type SchemaInterfaceOptions as SchemaInterfaceOptions_,
  type SchemaType,
  type SchemaType as SchemaType_,
  extend,
} from './index.ts';

export * from './index.ts';

declare module './index.ts' {
  interface ArraySchemaInterface<T extends SchemaType_> {
    // Array size validations
    min(
      length: number,
      options?: SchemaInterfaceOptions_,
    ): ArraySchemaInterface<T>;
    max(
      length: number,
      options?: SchemaInterfaceOptions_,
    ): ArraySchemaInterface<T>;
    length(
      length: number,
      options?: SchemaInterfaceOptions_,
    ): ArraySchemaInterface<T>;
    nonEmpty(options?: SchemaInterfaceOptions_): ArraySchemaInterface<T>;

    // Array content validations
    unique(options?: SchemaInterfaceOptions_): ArraySchemaInterface<T>;

    // Array transformations
    sort(): ArraySchemaInterface<T>;
    reverse(): ArraySchemaInterface<T>;
  }
}

extend((schema: SchemaType, _, options) => {
  // Array schema extensions
  if (options?.type === 'array') {
    const arraySchema = schema as ArraySchemaInterface<SchemaType>;

    // Array size validations
    arraySchema.min = function (
      length,
      { message }: SchemaInterfaceOptions = {},
    ) {
      return this.refine((arr) => arr.length >= length, {
        message: message || `Array must contain at least ${length} items.`,
        jsonSchema: { minItems: length },
      }) as unknown as ArraySchemaInterface<SchemaType>;
    };

    arraySchema.max = function (
      length,
      { message }: SchemaInterfaceOptions = {},
    ) {
      return this.refine((arr) => arr.length <= length, {
        message: message || `Array must contain at most ${length} items.`,
        jsonSchema: { maxItems: length },
      }) as unknown as ArraySchemaInterface<SchemaType>;
    };

    arraySchema.length = function (
      length,
      { message }: SchemaInterfaceOptions = {},
    ) {
      return this.refine((arr) => arr.length === length, {
        message: message || `Array must contain exactly ${length} items.`,
        jsonSchema: { minItems: length, maxItems: length },
      }) as unknown as ArraySchemaInterface<SchemaType>;
    };

    arraySchema.nonEmpty = function ({ message }: SchemaInterfaceOptions = {}) {
      return this.refine((arr) => arr.length > 0, {
        message: message || 'Array must not be empty.',
        jsonSchema: { minItems: 1 },
      }) as unknown as ArraySchemaInterface<SchemaType>;
    };

    // Array content validations
    arraySchema.unique = function ({ message }: SchemaInterfaceOptions = {}) {
      return this.refine(
        (arr) => {
          const seen = new Set();
          try {
            return arr.every((item) => {
              const serialized = JSON.stringify(item);
              if (seen.has(serialized)) return false;
              seen.add(serialized);
              return true;
            });
          } catch (e) {
            // If items aren't serializable, fall back to Set size check
            // (which will work for primitives)
            return new Set(arr).size === arr.length;
          }
        },
        {
          message: message || 'Array items must be unique.',
          jsonSchema: { uniqueItems: true },
        },
      ) as unknown as ArraySchemaInterface<SchemaType>;
    };

    // Array transformations
    arraySchema.sort = function () {
      return this.transform((arr) => [...arr].sort(), {
        jsonSchema: null,
      }) as unknown as ArraySchemaInterface<SchemaType>;
    };

    arraySchema.reverse = function () {
      return this.transform((arr) => [...arr].reverse(), {
        jsonSchema: null,
      }) as unknown as ArraySchemaInterface<SchemaType>;
    };
  }

  return schema;
});
