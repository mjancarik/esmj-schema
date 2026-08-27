import {
  type SchemaInterfaceOptions,
  type SchemaInterfaceOptions as SchemaInterfaceOptions_,
  type SchemaType,
  type StringSchemaInterface,
  extend,
} from './index.ts';

export * from './index.ts';

// Escapes regex metacharacters in a literal substring so it can be safely
// embedded into a JSON Schema `pattern` (used by startsWith/endsWith/includes
// hints, consumed by @esmj/schema/standard).
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

declare module './index.ts' {
  interface StringSchemaInterface {
    // String length validations
    min(
      length: number,
      options?: SchemaInterfaceOptions_,
    ): StringSchemaInterface;
    max(
      length: number,
      options?: SchemaInterfaceOptions_,
    ): StringSchemaInterface;
    length(
      length: number,
      options?: SchemaInterfaceOptions_,
    ): StringSchemaInterface;
    nonEmpty(options?: SchemaInterfaceOptions_): StringSchemaInterface;

    // String pattern validations
    startsWith(
      prefix: string,
      options?: SchemaInterfaceOptions_,
    ): StringSchemaInterface;
    endsWith(
      suffix: string,
      options?: SchemaInterfaceOptions_,
    ): StringSchemaInterface;
    includes(
      substring: string,
      options?: SchemaInterfaceOptions_,
    ): StringSchemaInterface;

    // String transformations
    trim(): StringSchemaInterface;
    toLowerCase(): StringSchemaInterface;
    toUpperCase(): StringSchemaInterface;
    padStart(length: number, fillChar?: string): StringSchemaInterface;
    padEnd(length: number, fillChar?: string): StringSchemaInterface;
    replace(search: string | RegExp, replace: string): StringSchemaInterface;
  }
}

extend((schema: SchemaType, _, options) => {
  // String schema extensions
  if (options?.type === 'string') {
    const stringSchema = schema as StringSchemaInterface;

    // String length validations
    stringSchema.min = function (
      length,
      { message }: SchemaInterfaceOptions = {},
    ) {
      return this.refine((value) => value.length >= length, {
        message:
          message ||
          ((value: unknown) =>
            `String must be at least ${length} characters long (received ${(value as string).length} characters: "${value}")`),
        jsonSchema: { minLength: length },
      }) as unknown as StringSchemaInterface;
    };

    stringSchema.max = function (
      length,
      { message }: SchemaInterfaceOptions = {},
    ) {
      return this.refine((value) => value.length <= length, {
        message:
          message ||
          ((value: unknown) =>
            `String must be at most ${length} characters long (received ${(value as string).length} characters: "${value}")`),
        jsonSchema: { maxLength: length },
      }) as unknown as StringSchemaInterface;
    };

    stringSchema.length = function (
      length,
      { message }: SchemaInterfaceOptions = {},
    ) {
      return this.refine((value) => value.length === length, {
        message:
          message ||
          ((value: unknown) =>
            `String must be exactly ${length} characters long (received ${(value as string).length} characters: "${value}")`),
        jsonSchema: { minLength: length, maxLength: length },
      }) as unknown as StringSchemaInterface;
    };

    stringSchema.nonEmpty = function ({
      message,
    }: SchemaInterfaceOptions = {}) {
      return this.refine((value) => value.length > 0, {
        message: message || 'String must not be empty (received empty string)',
        jsonSchema: { minLength: 1 },
      }) as unknown as StringSchemaInterface;
    };

    // String pattern validations
    stringSchema.startsWith = function (
      prefix,
      { message }: SchemaInterfaceOptions = {},
    ) {
      return this.refine((value) => value.startsWith(prefix), {
        message:
          message ||
          ((value: unknown) =>
            `String must start with "${prefix}" (received: "${value}")`),
        jsonSchema: { pattern: `^${escapeRegExp(prefix)}` },
      }) as unknown as StringSchemaInterface;
    };

    stringSchema.endsWith = function (
      suffix,
      { message }: SchemaInterfaceOptions = {},
    ) {
      return this.refine((value) => value.endsWith(suffix), {
        message:
          message ||
          ((value: unknown) =>
            `String must end with "${suffix}" (received: "${value}")`),
        jsonSchema: { pattern: `${escapeRegExp(suffix)}$` },
      }) as unknown as StringSchemaInterface;
    };

    stringSchema.includes = function (
      substring,
      { message }: SchemaInterfaceOptions = {},
    ) {
      return this.refine((value) => value.includes(substring), {
        message:
          message ||
          ((value: unknown) =>
            `String must include "${substring}" (received: "${value}")`),
        jsonSchema: { pattern: escapeRegExp(substring) },
      }) as unknown as StringSchemaInterface;
    };

    // String transformations
    stringSchema.toLowerCase = function () {
      return this.transform((value) => value.toLowerCase(), {
        jsonSchema: null,
      }) as unknown as StringSchemaInterface;
    };

    stringSchema.toUpperCase = function () {
      return this.transform((value) => value.toUpperCase(), {
        jsonSchema: null,
      }) as unknown as StringSchemaInterface;
    };

    stringSchema.trim = function () {
      return this.transform((value) => value.trim(), {
        jsonSchema: null,
      }) as unknown as StringSchemaInterface;
    };

    stringSchema.padStart = function (length, fillChar = ' ') {
      return this.transform((value) => value.padStart(length, fillChar), {
        jsonSchema: null,
      }) as unknown as StringSchemaInterface;
    };

    stringSchema.padEnd = function (length, fillChar = ' ') {
      return this.transform((value) => value.padEnd(length, fillChar), {
        jsonSchema: null,
      }) as unknown as StringSchemaInterface;
    };

    stringSchema.replace = function (search, replace) {
      return this.transform((value) => value.replace(search, replace), {
        jsonSchema: null,
      }) as unknown as StringSchemaInterface;
    };
  }

  return schema;
});
