import {
  type SchemaInterfaceOptions,
  type SchemaType,
  type StringSchemaInterface,
  extend,
} from './index.ts';

export * from './index.ts';

declare module './index.ts' {
  interface StringSchemaInterface {
    // String length validations
    min(
      length: number,
      options?: SchemaInterfaceOptions,
    ): StringSchemaInterface;
    max(
      length: number,
      options?: SchemaInterfaceOptions,
    ): StringSchemaInterface;
    length(
      length: number,
      options?: SchemaInterfaceOptions,
    ): StringSchemaInterface;
    nonEmpty(options?: SchemaInterfaceOptions): StringSchemaInterface;

    // String pattern validations
    startsWith(
      prefix: string,
      options?: SchemaInterfaceOptions,
    ): StringSchemaInterface;
    endsWith(
      suffix: string,
      options?: SchemaInterfaceOptions,
    ): StringSchemaInterface;
    includes(
      substring: string,
      options?: SchemaInterfaceOptions,
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
          ((value: string) =>
            `String must be at least ${length} characters long (received ${value.length} characters: "${value}")`),
      });
    };

    stringSchema.max = function (
      length,
      { message }: SchemaInterfaceOptions = {},
    ) {
      return this.refine((value) => value.length <= length, {
        message:
          message ||
          ((value: string) =>
            `String must be at most ${length} characters long (received ${value.length} characters: "${value}")`),
      });
    };

    stringSchema.length = function (
      length,
      { message }: SchemaInterfaceOptions = {},
    ) {
      return this.refine((value) => value.length === length, {
        message:
          message ||
          ((value: string) =>
            `String must be exactly ${length} characters long (received ${value.length} characters: "${value}")`),
      });
    };

    stringSchema.nonEmpty = function ({
      message,
    }: SchemaInterfaceOptions = {}) {
      return this.refine((value) => value.length > 0, {
        message: message || 'String must not be empty (received empty string)',
      });
    };

    // String pattern validations
    stringSchema.startsWith = function (
      prefix,
      { message }: SchemaInterfaceOptions = {},
    ) {
      return this.refine((value) => value.startsWith(prefix), {
        message:
          message ||
          ((value: string) =>
            `String must start with "${prefix}" (received: "${value}")`),
      });
    };

    stringSchema.endsWith = function (
      suffix,
      { message }: SchemaInterfaceOptions = {},
    ) {
      return this.refine((value) => value.endsWith(suffix), {
        message:
          message ||
          ((value: string) =>
            `String must end with "${suffix}" (received: "${value}")`),
      });
    };

    stringSchema.includes = function (
      substring,
      { message }: SchemaInterfaceOptions = {},
    ) {
      return this.refine((value) => value.includes(substring), {
        message:
          message ||
          ((value: string) =>
            `String must include "${substring}" (received: "${value}")`),
      });
    };

    // String transformations
    stringSchema.toLowerCase = function () {
      return this.transform((value) => value.toLowerCase());
    };

    stringSchema.toUpperCase = function () {
      return this.transform((value) => value.toUpperCase());
    };

    stringSchema.trim = function () {
      return this.transform((value) => value.trim());
    };

    stringSchema.padStart = function (length, fillChar = ' ') {
      return this.transform((value) => value.padStart(length, fillChar));
    };

    stringSchema.padEnd = function (length, fillChar = ' ') {
      return this.transform((value) => value.padEnd(length, fillChar));
    };

    stringSchema.replace = function (search, replace) {
      return this.transform((value) => value.replace(search, replace));
    };
  }

  return schema;
});
