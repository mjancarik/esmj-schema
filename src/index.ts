import { resolve } from 'node:path';

export type ErrorStructure = {
  message: string;
  cause?: {
    key?: string;
  };
};

export type Valid<Output> = {
  success: true;
  data: Output;
};

export type Invalid = {
  success: false;
  error: ErrorStructure;
  errors?: ErrorStructure[];
};

type InternalParseOutput<Output> = Valid<Output> | Invalid;

type ValidationMethod<Input, Output> = (
  value: Input | Partial<Input>,
) => boolean | InternalParseOutput<Output>;

interface ParseOptions {
  abortEarly?: boolean;
}

// @TODO Partial<Input> should be used only for optional schema keys
export interface SchemaInterface<Input, Output> {
  _getName(): string;
  _getType(): string;
  _getDescription(): string;
  _parse(
    value: Input | Partial<Input>,
    options?: ParseOptions,
  ): InternalParseOutput<Output>;
  parse(value: Input | Partial<Input>, options?: ParseOptions): Output;
  safeParse(
    value: Input | Partial<Input>,
    options?: ParseOptions,
  ): InternalParseOutput<Output>;
  optional(): SchemaInterface<Input, Partial<Output> | undefined>;
  transform<NewOutput>(
    callback: (value: Input) => NewOutput,
  ): SchemaInterface<Input, NewOutput>;
  nullable(): SchemaInterface<Input, Output | null>;
  nullish(): SchemaInterface<Input, Output | undefined | null>;
  default(
    defaultValue: Partial<Input> | (() => Partial<Input>) | Partial<Output>,
  ): SchemaInterface<Input, Output>;
  pipe<NewOutput>(
    schema: SchemaInterface<Output, NewOutput>,
  ): SchemaInterface<Output, NewOutput>;
  refine(
    validation: ValidationMethod<Input, Output>,
    options?: CreateSchemaInterfaceOptions,
  ): SchemaInterface<Input, Output>;
}

export interface UnionSchemaInterface<
  T extends Array<SchemaInterface<unknown, unknown>>,
> extends SchemaInterface<
    ReturnType<T[number]['parse']>,
    ReturnType<T[number]['parse']>
  > {}
export interface EnumSchemaInterface<T extends string>
  extends SchemaInterface<string, T> {}
export interface StringSchemaInterface
  extends SchemaInterface<string, string> {}
export interface NumberSchemaInterface
  extends SchemaInterface<number, number> {}
export interface BooleanSchemaInterface
  extends SchemaInterface<boolean, boolean> {}
export interface DateSchemaInterface extends SchemaInterface<Date, Date> {}
export interface ArraySchemaInterface<T extends SchemaType>
  extends SchemaInterface<
    Array<ReturnType<T['parse']>>,
    Array<ReturnType<T['parse']>>
  > {}
export interface ObjectSchemaInterface<T extends Record<string, SchemaType>>
  extends SchemaInterface<
    { [Property in keyof T]: ReturnType<T[Property]['parse']> },
    { [Property in keyof T]: ReturnType<T[Property]['parse']> }
  > {}

export type SchemaType =
  | StringSchemaInterface
  | SchemaInterface<unknown, unknown>
  | SchemaInterface<string, string>
  | SchemaInterface<string, string | undefined>
  | SchemaInterface<string, string | null>
  | SchemaInterface<string, string | undefined | null>
  | ObjectSchemaInterface<Record<string, SchemaType>>
  | SchemaInterface<object, object>
  | SchemaInterface<object, object | undefined>
  | SchemaInterface<object, object | null>
  | SchemaInterface<object, object | undefined | null>
  | NumberSchemaInterface
  | SchemaInterface<number, number>
  | SchemaInterface<number, number | undefined>
  | SchemaInterface<number, number | null>
  | SchemaInterface<number, number | undefined | null>
  | BooleanSchemaInterface
  | SchemaInterface<boolean, boolean>
  | SchemaInterface<boolean, boolean | undefined>
  | SchemaInterface<boolean, boolean | null>
  | SchemaInterface<boolean, boolean | undefined | null>
  | DateSchemaInterface
  | SchemaInterface<Date, Date>
  | SchemaInterface<Date, Date | undefined>
  | SchemaInterface<Date, Date | null>
  | SchemaInterface<Date, Date | undefined | null>
  | EnumSchemaInterface<string>
  | UnionSchemaInterface<Array<SchemaInterface<unknown, unknown>>>

  //| ArraySchemaInterface<SchemaType>
  | ArraySchemaInterface<
      | StringSchemaInterface
      | ObjectSchemaInterface<Record<string, SchemaType>>
      | NumberSchemaInterface
      | BooleanSchemaInterface
      | DateSchemaInterface
      | EnumSchemaInterface<string>
    >
  | SchemaInterface<Array<unknown>, Array<unknown>>
  | SchemaInterface<Array<unknown>, Array<unknown> | undefined>
  | SchemaInterface<Array<unknown>, Array<unknown> | null>
  | SchemaInterface<Array<unknown>, Array<unknown> | undefined | null>;

type ErrorMessage = string | ((value: unknown) => string);

export type ExtenderType = (
  inter: SchemaType,
  validation: Function,
  options?: { message: ErrorMessage; type: string },
) => SchemaType;

interface CreateSchemaInterfaceOptions {
  name?: string;
  type?: string;
  message?: ErrorMessage;
}
export type SchemaInterfaceOptions = Omit<CreateSchemaInterfaceOptions, 'type'>;

const defaultParseOptions: ParseOptions = {
  abortEarly: true,
};

function formatError(
  error: ErrorStructure,
  parentKey?: string | number,
): ErrorStructure {
  if (!parentKey) return error;

  const errorKey = error?.cause?.key
    ? `${parentKey}.${error.cause.key}`
    : `${parentKey}`;

  return {
    message: `Error parsing key "${errorKey}": ${error.message}`,
    cause: { key: errorKey },
  };
}

function propagateNestedErrors(
  item: Invalid,
  errors: ErrorStructure[],
  key: string | number,
): void {
  if (!item.errors || item.errors.length === 0) return;

  item.errors.forEach((err) => {
    const formattedError = formatError(err, key);

    errors.push(formattedError);
  });
}

function resolveParseOptions(parseOptions?: ParseOptions): ParseOptions {
  return {
    ...defaultParseOptions,
    ...parseOptions,
  };
}

const stringValidation = (value) =>
  typeof value === 'string' || value instanceof String;
const numberValidation = (value) =>
  typeof value === 'number' || value instanceof Number;
const booleanValidation = (value) => value === true || value === false;
const dateValidation = (value) =>
  value instanceof Date && !Number.isNaN(value.getTime());
const arrayValidation = (value) => Array.isArray(value);
const objectValidation = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const s = {
  /**
   * Creates an object schema with validated fields.
   *
   * @param definition - Object containing field schemas
   * @param options - Optional configuration (name, message)
   * @returns Object schema interface
   *
   * @example
   * ```typescript
   * const userSchema = s.object({
   *   name: s.string(),
   *   age: s.number()
   * });
   * ```
   */
  object<T extends Record<string, SchemaType>>(
    definition: {
      [Property in keyof T]: T[Property];
    },
    options?: SchemaInterfaceOptions,
  ): ObjectSchemaInterface<T> {
    const schema = createSchemaInterface<
      { [Property in keyof T]: ReturnType<T[Property]['parse']> },
      { [Property in keyof T]: ReturnType<T[Property]['parse']> }
    >(objectValidation, {
      ...options,
      type: 'object',
    });

    // Add a more detailed description for object schemas
    schema._getDescription = () => {
      const fieldDescriptions = Object.entries(definition)
        .map(
          ([key, schema]) =>
            `${key}: ${(schema as SchemaInterface<unknown, unknown>)._getDescription()}`,
        )
        .join(', ');
      return `object({ ${fieldDescriptions} })`;
    };

    hookOriginal(schema, '_parse', (originalParse, data, parseOptions) => {
      const value = originalParse(data, parseOptions);
      const { abortEarly } = resolveParseOptions(
        parseOptions as ParseOptions | undefined,
      );

      if (value.success === false) {
        return value;
      }

      const acc = {} as Record<string, unknown>;
      const errors: ErrorStructure[] = [];

      for (const key in definition) {
        let item = (
          definition[key]._parse as (
            value: unknown,
            parseOptions?: ParseOptions,
          ) => InternalParseOutput<unknown>
        )(value.data[key], parseOptions as ParseOptions | undefined);

        if (item.success) {
          acc[key] = item.data;
        } else {
          item = item as Invalid;

          if (abortEarly !== false) {
            const formattedError = formatError(item.error, key);
            return {
              success: false,
              error: formattedError,
              errors: [formattedError],
            };
          }

          propagateNestedErrors(item, errors, key);
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: errors[0], // First error as the main error
          errors,
        };
      }

      return {
        success: true,
        data: acc as {
          [Property in keyof T]: ReturnType<T[Property]['parse']>;
        },
      };
    });

    return schema;
  },
  /**
   * Creates a string schema.
   *
   * @param options - Optional configuration (name, message)
   * @returns String schema interface
   *
   * @example
   * ```typescript
   * const nameSchema = s.string();
   * const result = nameSchema.parse('John'); // 'John'
   * ```
   */
  string(options?: SchemaInterfaceOptions): StringSchemaInterface {
    return createSchemaInterface<string, string>(stringValidation, {
      ...options,
      type: 'string',
    }) as StringSchemaInterface;
  },
  /**
   * Creates a number schema.
   *
   * @param options - Optional configuration (name, message)
   * @returns Number schema interface
   *
   * @example
   * ```typescript
   * const ageSchema = s.number();
   * const result = ageSchema.parse(25); // 25
   * ```
   */
  number(options?: SchemaInterfaceOptions): NumberSchemaInterface {
    return createSchemaInterface<number, number>(numberValidation, {
      ...options,
      type: 'number',
    }) as NumberSchemaInterface;
  },
  /**
   * Creates a boolean schema.
   *
   * @param options - Optional configuration (name, message)
   * @returns Boolean schema interface
   *
   * @example
   * ```typescript
   * const isActiveSchema = s.boolean();
   * const result = isActiveSchema.parse(true); // true
   * ```
   */
  boolean(options?: SchemaInterfaceOptions): BooleanSchemaInterface {
    return createSchemaInterface<boolean, boolean>(booleanValidation, {
      ...options,
      type: 'boolean',
    }) as BooleanSchemaInterface;
  },
  /**
   * Creates a date schema.
   *
   * @param options - Optional configuration (name, message)
   * @returns Date schema interface
   *
   * @example
   * ```typescript
   * const birthdateSchema = s.date();
   * const result = birthdateSchema.parse(new Date()); // Date object
   * ```
   */
  date(options?: SchemaInterfaceOptions): DateSchemaInterface {
    return createSchemaInterface<Date, Date>(dateValidation, {
      ...options,
      type: 'date',
    }) as DateSchemaInterface;
  },
  /**
   * Creates an enum schema with predefined values.
   *
   * @param definition - Array of allowed string values
   * @param options - Optional configuration (name, message)
   * @returns Enum schema interface
   *
   * @example
   * ```typescript
   * const roleSchema = s.enum(['admin', 'user', 'guest']);
   * const result = roleSchema.parse('admin'); // 'admin'
   * ```
   */
  enum(
    definition: Readonly<Array<string>>,
    options?: SchemaInterfaceOptions,
  ): EnumSchemaInterface<(typeof definition)[number]> {
    const validation = (value) => definition.includes(value);

    const message = (value) =>
      `Invalid ${type} value. Expected ${definition.map((value) => `"${value}"`).join(' | ')}, received "${value}".`;
    const type = 'enum';

    const schema = createSchemaInterface<string, (typeof definition)[number]>(
      validation,
      {
        message,
        ...options,
        type,
      },
    ) as EnumSchemaInterface<(typeof definition)[number]>;

    // Add a more detailed description for enum schemas
    schema._getDescription = () => {
      return `enum(${definition.map((value) => `"${value}"`).join(' | ')})`;
    };

    return schema as EnumSchemaInterface<(typeof definition)[number]>;
  },
  /**
   * Creates an array schema with element validation.
   *
   * @param definition - Schema for array elements
   * @param options - Optional configuration (name, message)
   * @returns Array schema interface
   *
   * @example
   * ```typescript
   * const tagsSchema = s.array(s.string());
   * const result = tagsSchema.parse(['tag1', 'tag2']); // ['tag1', 'tag2']
   * ```
   */
  array<T extends SchemaType>(
    definition: T,
    options?: SchemaInterfaceOptions,
  ): ArraySchemaInterface<T> {
    const schema = createSchemaInterface<
      Array<ReturnType<T['parse']>>,
      Array<ReturnType<T['parse']>>
    >(arrayValidation, {
      ...options,
      type: 'array',
    });

    // Add a more detailed description for array schemas
    schema._getDescription = () => {
      return `array(${(definition as SchemaInterface<unknown, unknown>)._getDescription()})`;
    };

    hookOriginal(schema, '_parse', (originalParse, data, parseOptions) => {
      const value = originalParse(data, parseOptions);
      const { abortEarly } = resolveParseOptions(
        parseOptions as ParseOptions | undefined,
      );

      if (value.success === false) {
        return value;
      }

      const acc = [] as Array<ReturnType<T['parse']>>;
      const errors: ErrorStructure[] = [];

      for (let index = 0; index < value.data.length; index++) {
        let item = (
          definition._parse as (
            value: unknown,
            parseOptions?: ParseOptions,
          ) => InternalParseOutput<unknown>
        )(value.data[index], parseOptions as ParseOptions | undefined);

        if (item.success) {
          acc.push(item.data as ReturnType<T['parse']>);
        } else {
          item = item as Invalid;

          if (abortEarly !== false) {
            const formattedError = formatError(item.error, index);

            return {
              success: false,
              error: formattedError,
              errors: [formattedError],
            };
          }

          propagateNestedErrors(item, errors, index);
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: errors[0], // First error as the main error
          errors,
        };
      }

      return { success: true, data: acc } as {
        success: true;
        data: Array<ReturnType<T['parse']>>;
      };
    });

    return schema as ArraySchemaInterface<T>;
  },
  /**
   * Creates a schema that accepts any value without validation.
   *
   * @returns Schema interface that accepts any value
   *
   * @example
   * ```typescript
   * const anySchema = s.any();
   * const result = anySchema.parse({ anything: true }); // { anything: true }
   * ```
   */
  any() {
    return createSchemaInterface(() => true);
  },
  /**
   * Preprocesses a value before passing it to a schema for validation.
   *
   * @param callback - Function to transform the value before validation
   * @param schema - Schema to validate the transformed value
   * @returns Modified schema with preprocessing
   *
   * @example
   * ```typescript
   * const schema = s.preprocess(
   *   (val) => String(val).trim(),
   *   s.string().min(3)
   * );
   * const result = schema.parse('  hello  '); // 'hello'
   * ```
   */
  preprocess<T extends SchemaType>(callback: Function, schema: T) {
    hookOriginal(schema, '_parse', (originalParse, value) => {
      value = callback(value);

      return originalParse(value);
    });

    return schema as T;
  },
  /**
   * Creates a union schema that validates against multiple schemas.
   * The value must match at least one of the provided schemas.
   *
   * @param definitions - Array of schemas to validate against
   * @param options - Optional configuration (name, message)
   * @returns Union schema interface
   *
   * @example
   * ```typescript
   * const idSchema = s.union([s.string(), s.number()]);
   * const result1 = idSchema.parse('abc'); // 'abc'
   * const result2 = idSchema.parse(123); // 123
   * ```
   */
  union<T extends Array<SchemaType>>(
    definitions: T,
    options?: SchemaInterfaceOptions,
  ): UnionSchemaInterface<T> {
    const message = (value) =>
      `Invalid union value. Expected the value to match one of the schemas:${definitions
        .map(
          (definition, idx) => ` ${idx + 1}. ${definition._getDescription()}`,
        )
        .join(',')} but received "${typeof value}" with value: ${
        objectValidation(value) ? JSON.stringify(value) : `"${value}"`
      }`;

    const validation = (value) => {
      for (let index = 0; index < definitions.length; index++) {
        const result = (
          definitions[index]._parse as (
            value: unknown,
          ) => InternalParseOutput<ReturnType<T[number]['parse']>>
        )(value);
        if (result.success) {
          return result as InternalParseOutput<ReturnType<T[number]['parse']>>;
        }
      }
      return false;
    };

    const schema = createSchemaInterface<
      ReturnType<T[number]['parse']>,
      ReturnType<T[number]['parse']>
    >(validation, {
      message,
      ...options,
      type: 'union',
    });

    return schema as UnionSchemaInterface<T>;
  },
};

function errorMessageFactory(type) {
  return (value) =>
    `The value "${value}" must be type of ${type} but is type of "${typeof value}".`;
}

export function hookOriginal<Input, Output>(
  object: SchemaInterface<Input, Output> | SchemaType,
  method: string,
  action: (
    original: Function,
    ...args: unknown[]
  ) => InternalParseOutput<Output>,
) {
  const original = object[method];

  object[method] = (...args) => {
    return action(original, ...args);
  };
}

function createSchemaInterface<Input, Output>(
  validation: ValidationMethod<Input, Output>,
  { type = 'any', name, message } = {} as CreateSchemaInterfaceOptions,
) {
  message = message || errorMessageFactory(type);

  const createdOptions = {
    name,
    message,
    type,
  };

  const defaultInterface: SchemaInterface<Input, Output> = {
    /**
     * Gets the name of the schema if provided during creation.
     * @returns The schema name or undefined
     * @internal
     */
    _getName() {
      return name;
    },
    /**
     * Gets the type of the schema (e.g., 'string', 'number', 'object').
     * @returns The schema type
     * @internal
     */
    _getType() {
      return type;
    },
    /**
     * Gets a description of the schema for error messages.
     * @returns The schema description
     * @internal
     */
    _getDescription() {
      return this._getName() ?? this._getType();
    },
    /**
     * Internal parsing method that validates a value and returns a result object.
     * @param value - The value to validate
     * @param parseOptions - Optional parsing options
     * @returns Parse result with success flag
     * @internal
     */
    _parse(value, parseOptions) {
      const result = validation(value);

      if (result === true) {
        return { success: true, data: value as unknown as Output };
      }

      if (typeof result === 'object' && result?.success === true) {
        return result;
      }

      const error = {
        message: typeof message === 'function' ? message(value) : message,
      };

      return {
        success: false,
        error,
        errors: [error],
      };
    },
    /**
     * Parses and validates a value, throwing an error if validation fails.
     *
     * @param value - The value to parse and validate
     * @param parseOptions - Optional parsing options (e.g., abortEarly)
     * @returns The parsed and validated value
     * @throws {Error} If validation fails
     *
     * @example
     * ```typescript
     * const schema = s.string();
     * const result = schema.parse('hello'); // 'hello'
     * schema.parse(123); // throws Error
     * ```
     */
    parse(value, parseOptions) {
      let item = defaultInterface._parse(value, parseOptions);

      if (!item.success) {
        item = item as Invalid;

        throw new Error(item.error.message, { cause: item.error.cause });
      }

      return item.data as Output;
    },
    /**
     * Safely parses and validates a value without throwing errors.
     * Returns a result object with either success and data, or error information.
     *
     * @param value - The value to parse and validate
     * @param parseOptions - Optional parsing options (e.g., abortEarly)
     * @returns Result object with success flag, data, or error
     *
     * @example
     * ```typescript
     * const schema = s.string();
     * const result = schema.safeParse('hello');
     * if (result.success) {
     *   console.log(result.data); // 'hello'
     * } else {
     *   console.error(result.error.message);
     * }
     * ```
     */
    safeParse(value, parseOptions) {
      return defaultInterface._parse(value, parseOptions);
    },
    /**
     * Transforms the validated value using a callback function.
     *
     * @param callback - Function to transform the validated value
     * @returns The schema with transformation applied
     *
     * @example
     * ```typescript
     * const schema = s.string().transform(val => val.toUpperCase());
     * const result = schema.parse('hello'); // 'HELLO'
     * ```
     */
    transform(callback) {
      hookOriginal(this, '_parse', (originalParse, value, parseOptions) => {
        const item = originalParse(value, parseOptions);

        if (!item.success) {
          return item;
        }

        item.data = callback(item.data);

        return item;
      });

      return this;
    },
    /**
     * Makes the schema optional, allowing undefined values.
     * Failed validations will be converted to undefined instead of errors.
     *
     * @returns The schema accepting the original type or undefined
     *
     * @example
     * ```typescript
     * const schema = s.string().optional();
     * schema.parse('hello'); // 'hello'
     * schema.parse(undefined); // undefined
     * ```
     */
    optional() {
      hookOriginal(this, '_parse', (originalParse, value, parseOptions) => {
        const item = originalParse(value, parseOptions);

        if (!item.success && value === undefined) {
          item.data = undefined;
          item.success = true; // Mark as success since we are allowing undefined
        }

        return item;
      });

      return this;
    },
    /**
     * Makes the schema nullable, allowing null values.
     * Failed validations will be converted to null instead of errors.
     *
     * @returns The schema accepting the original type or null
     *
     * @example
     * ```typescript
     * const schema = s.string().nullable();
     * schema.parse('hello'); // 'hello'
     * schema.parse(null); // null
     * ```
     */
    nullable() {
      hookOriginal(this, '_parse', (originalParse, value, parseOptions) => {
        const item = originalParse(value, parseOptions);

        if (!item.success && value === null) {
          item.data = null;
          item.success = true;
          return item;
        }

        return item;
      });

      return this;
    },
    /**
     * Makes the schema nullish, allowing both null and undefined values.
     *
     * @returns The schema accepting the original type, null, or undefined
     *
     * @example
     * ```typescript
     * const schema = s.string().nullish();
     * schema.parse('hello'); // 'hello'
     * schema.parse(null); // null
     * schema.parse(undefined); // undefined
     * ```
     */
    nullish() {
      hookOriginal(this, '_parse', (originalParse, value, parseOptions) => {
        const item = originalParse(value, parseOptions);

        if (!item.success && (value === undefined || value === null)) {
          item.success = true; // Mark as success since we are allowing undefined or null
          item.data = value;
        }

        return item;
      });

      return this;
    },
    /**
     * Provides a default value for undefined inputs.
     *
     * @param defaultValue - The default value or a function that returns the default value
     * @returns The schema with default value applied
     *
     * @example
     * ```typescript
     * const schema = s.string().default('unknown');
     * schema.parse(undefined); // 'unknown'
     * schema.parse('hello'); // 'hello'
     *
     * // With function
     * const timestampSchema = s.number().default(() => Date.now());
     * ```
     */
    default(defaultValue) {
      hookOriginal(this, '_parse', (originalParse, value, parseOptions) => {
        if (value === undefined) {
          value = defaultValue;
          value =
            typeof defaultValue === 'function' ? defaultValue() : defaultValue;
        }

        return originalParse(value, parseOptions) as InternalParseOutput<
          Partial<typeof value>
        >;
      });

      return this;
    },
    /**
     * Pipes the output of this schema into another schema for further validation.
     * Useful for chaining transformations and validations.
     *
     * @param schema - The schema to pipe the validated value into
     * @returns The piped schema
     *
     * @example
     * ```typescript
     * const schema = s.string()
     *   .transform(val => parseInt(val))
     *   .pipe(s.number().positive());
     *
     * schema.parse('42'); // 42
     * schema.parse('-5'); // throws error (not positive)
     * ```
     */
    pipe(schema) {
      hookOriginal(this, '_parse', (originalParse, value, parseOptions) => {
        const item = originalParse(value, parseOptions);
        if (!item.success) {
          return item;
        }

        return schema._parse(
          item.data,
          parseOptions as ParseOptions | undefined,
        );
      });

      return this;
    },
    /**
     * Adds custom validation logic to the schema.
     *
     * @param validation - Function that returns true if value is valid
     * @param options - Optional configuration with custom error message and type
     * @returns The schema with custom validation applied
     *
     * @example
     * ```typescript
     * const schema = s.string().refine(
     *   val => val.startsWith('hello'),
     *   { message: 'Must start with "hello"' }
     * );
     *
     * schema.parse('hello world'); // 'hello world'
     * schema.parse('goodbye'); // throws error
     * ```
     */
    refine(validation, { message, type: newType } = {}) {
      if (newType) {
        message = message || errorMessageFactory(newType);
        type = newType;
      }

      hookOriginal(this, '_parse', (originalParse, value, parseOptions) => {
        const parsedValue = originalParse(value, parseOptions);
        const { abortEarly } = resolveParseOptions(
          parseOptions as ParseOptions | undefined,
        );

        if (!parsedValue.success) {
          return parsedValue;
        }

        const refinementResult = validation(parsedValue.data);

        if (
          refinementResult === true ||
          (typeof refinementResult === 'object' &&
            refinementResult?.success === true)
        ) {
          return parsedValue;
        }

        const messageText =
          typeof message === 'function' ? message(value) : message;
        const error = {
          message: messageText,
        };

        return {
          success: false,
          error,
          errors: [error],
        };
      });

      return this;
    },
  };

  return extenders.length > 0
    ? extenders.reduce(
        (acc, extend) => extend(acc, validation, createdOptions) ?? acc,
        defaultInterface,
      )
    : defaultInterface;
}

const extenders: Function[] = [];

/**
 * Extends the schema system with custom validation methods.
 * Used to add new methods to schema interfaces like StringSchemaInterface, NumberSchemaInterface, etc.
 *
 * @param callback - Function that receives schema, validation, and options, and can add new methods
 *
 * @example
 * ```typescript
 * import { extend, type StringSchemaInterface } from '@esmj/schema';
 *
 * // Extend StringSchemaInterface with email validation
 * declare module '@esmj/schema' {
 *   interface StringSchemaInterface {
 *     email(): StringSchemaInterface;
 *   }
 * }
 *
 * extend((schema, _, options) => {
 *   if (options?.type === 'string') {
 *     schema.email = function() {
 *       return this.refine(
 *         (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
 *         { message: 'Invalid email address' }
 *       );
 *     };
 *   }
 *   return schema;
 * });
 *
 * // Now you can use the email() method
 * const emailSchema = s.string().email();
 * ```
 */
export function extend(callback: ExtenderType) {
  extenders.push(callback);
}

/**
 * Type helper to infer the output type of a schema.
 * Extracts the TypeScript type that a schema will produce after parsing.
 *
 * @template T - The schema type to infer from
 *
 * @example
 * ```typescript
 * const userSchema = s.object({
 *   name: s.string(),
 *   age: s.number(),
 *   email: s.string().optional()
 * });
 *
 * type User = Infer<typeof userSchema>;
 * // type User = {
 * //   name: string;
 * //   age: number;
 * //   email?: string;
 * // }
 * ```
 */
export type Infer<T> = T extends SchemaType ? ReturnType<T['parse']> : unknown;
