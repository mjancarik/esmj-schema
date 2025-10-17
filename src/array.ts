import {
  type ArraySchemaInterface,
  type SchemaInterfaceOptions,
  type SchemaType,
  extend,
} from './index.ts';

export * from './index.ts';

declare module './index.ts' {
  interface ArraySchemaInterface<T extends SchemaType> {
    // Array size validations
    min(
      length: number,
      options?: SchemaInterfaceOptions,
    ): ArraySchemaInterface<T>;
    max(
      length: number,
      options?: SchemaInterfaceOptions,
    ): ArraySchemaInterface<T>;
    length(
      length: number,
      options?: SchemaInterfaceOptions,
    ): ArraySchemaInterface<T>;
    nonEmpty(options?: SchemaInterfaceOptions): ArraySchemaInterface<T>;

    // Array content validations
    unique(options?: SchemaInterfaceOptions): ArraySchemaInterface<T>;

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
      });
    };

    arraySchema.max = function (
      length,
      { message }: SchemaInterfaceOptions = {},
    ) {
      return this.refine((arr) => arr.length <= length, {
        message: message || `Array must contain at most ${length} items.`,
      });
    };

    arraySchema.length = function (
      length,
      { message }: SchemaInterfaceOptions = {},
    ) {
      return this.refine((arr) => arr.length === length, {
        message: message || `Array must contain exactly ${length} items.`,
      });
    };

    arraySchema.nonEmpty = function ({ message }: SchemaInterfaceOptions = {}) {
      return this.refine((arr) => arr.length > 0, {
        message: message || 'Array must not be empty.',
      });
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
        },
      );
    };

    // Array transformations
    arraySchema.sort = function () {
      return this.transform((arr) => [...arr].sort());
    };

    arraySchema.reverse = function () {
      return this.transform((arr) => [...arr].reverse());
    };
  }

  return schema;
});
