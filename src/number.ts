import {
  type NumberSchemaInterface,
  type SchemaInterfaceOptions,
  type SchemaType,
  extend,
} from './index.ts';

export * from './index.ts';

declare module './index.ts' {
  interface NumberSchemaInterface {
    // Number range validations
    min(value: number, options?: SchemaInterfaceOptions): NumberSchemaInterface;
    max(value: number, options?: SchemaInterfaceOptions): NumberSchemaInterface;
    positive(options?: SchemaInterfaceOptions): NumberSchemaInterface;
    negative(options?: SchemaInterfaceOptions): NumberSchemaInterface;
    int(options?: SchemaInterfaceOptions): NumberSchemaInterface;
    float(options?: SchemaInterfaceOptions): NumberSchemaInterface;
    multipleOf(
      value: number,
      options?: SchemaInterfaceOptions,
    ): NumberSchemaInterface;

    // Additional number validations
    finite(options?: SchemaInterfaceOptions): NumberSchemaInterface;
  }
}

extend((schema: SchemaType, _, options) => {
  // Number schema extensions
  if (options?.type === 'number') {
    const numberSchema = schema as NumberSchemaInterface;

    // Number range validations
    numberSchema.min = function (
      value,
      { message }: SchemaInterfaceOptions = {},
    ) {
      return this.refine((num) => num >= value, {
        message: message || `Number must be greater than or equal to ${value}.`,
      }) as unknown as NumberSchemaInterface;
    };

    numberSchema.max = function (
      value,
      { message }: SchemaInterfaceOptions = {},
    ) {
      return this.refine((num) => num <= value, {
        message: message || `Number must be less than or equal to ${value}.`,
      }) as unknown as NumberSchemaInterface;
    };

    numberSchema.positive = function ({
      message,
    }: SchemaInterfaceOptions = {}) {
      return this.refine((num) => num > 0, {
        message: message || 'Number must be positive.',
      }) as unknown as NumberSchemaInterface;
    };

    numberSchema.negative = function ({
      message,
    }: SchemaInterfaceOptions = {}) {
      return this.refine((num) => num < 0, {
        message: message || 'Number must be negative.',
      }) as unknown as NumberSchemaInterface;
    };

    numberSchema.int = function ({ message }: SchemaInterfaceOptions = {}) {
      return this.refine((num) => Number.isInteger(num), {
        message: message || 'Number must be an integer.',
      }) as unknown as NumberSchemaInterface;
    };

    numberSchema.float = function ({ message }: SchemaInterfaceOptions = {}) {
      return this.refine(
        (num) => Number.isFinite(num) && !Number.isInteger(num),
        {
          message: message || 'Number must be a floating point (non-integer).',
        },
      ) as unknown as NumberSchemaInterface;
    };

    numberSchema.multipleOf = function (
      value,
      { message }: SchemaInterfaceOptions = {},
    ) {
      return this.refine((num) => num % value === 0, {
        message: message || `Number must be a multiple of ${value}.`,
      }) as unknown as NumberSchemaInterface;
    };

    numberSchema.finite = function ({ message }: SchemaInterfaceOptions = {}) {
      return this.refine((num) => Number.isFinite(num), {
        message: message || 'Number must be finite.',
      }) as unknown as NumberSchemaInterface;
    };
  }

  return schema;
});
