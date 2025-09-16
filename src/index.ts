import { resolve } from 'node:path';

type ErrorStructure = {
  message: string;
  cause?: {
    key?: string;
  };
};

type Valid<Output> = {
  success: true;
  data: Output;
};

type Invalid = {
  success: false;
  error: ErrorStructure;
  errors?: ErrorStructure[];
};

type InternalParseOutput<Output> = Valid<Output> | Invalid;

interface ParseOptions {
  abortEarly?: boolean;
}

// @TODO Partial<Input> should be used only for optional schema keys
export interface SchemaInterface<Input, Output> {
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
    validation: (value: Output) => boolean,
    options?: SchemaInterfaceOptions,
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
  extends SchemaInterface<Array<T>, Array<ReturnType<T['parse']>>> {}
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
  string(options?: SchemaInterfaceOptions): StringSchemaInterface {
    return createSchemaInterface<string, string>(stringValidation, {
      ...options,
      type: 'string',
    }) as StringSchemaInterface;
  },
  number(options?: SchemaInterfaceOptions): NumberSchemaInterface {
    return createSchemaInterface<number, number>(numberValidation, {
      ...options,
      type: 'number',
    }) as NumberSchemaInterface;
  },
  boolean(options?: SchemaInterfaceOptions): BooleanSchemaInterface {
    return createSchemaInterface<boolean, boolean>(booleanValidation, {
      ...options,
      type: 'boolean',
    }) as BooleanSchemaInterface;
  },
  date(options?: SchemaInterfaceOptions): DateSchemaInterface {
    return createSchemaInterface<Date, Date>(dateValidation, {
      ...options,
      type: 'date',
    }) as DateSchemaInterface;
  },
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
  array<T extends SchemaType>(
    definition: T,
    options?: SchemaInterfaceOptions,
  ): ArraySchemaInterface<T> {
    const schema = createSchemaInterface<
      Array<T>,
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
  any() {
    return createSchemaInterface(() => true);
  },
  preprocess<T extends SchemaType>(callback: Function, schema: T) {
    hookOriginal(schema, '_parse', (originalParse, value) => {
      value = callback(value);

      return originalParse(value);
    });

    return schema as T;
  },
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
          ) => InternalParseOutput<unknown>
        )(value);
        if (result.success) {
          return true;
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

    //   hookOriginal(schema, '_parse', (originalParse, data, parseOptions) => {
    //     const value = originalParse(data, parseOptions);
    //     const { abortEarly } = resolveParseOptions(
    //       parseOptions as ParseOptions | undefined,
    //     );

    //     const errors: ErrorStructure[] = [];

    //     for (let index = 0; index < definitions.length; index++) {
    //       const result = (
    //         definitions[index]._parse as (
    //           value: unknown,
    //           parseOptions?: ParseOptions
    //         ) => InternalParseOutput<unknown>
    //       )(value.data, parseOptions as ParseOptions | undefined);

    //       if (result.success) {
    //         return result;
    //       }

    //       if (result.success === false) {
    //         propagateNestedErrors(result, errors, index);
    //       }
    //     }

    //     const formattedError = {
    //       message: message(value.data),
    //       cause: { key: 'union' },
    //     };

    //     return {
    //       success: false,
    //       error: formattedError,
    //       errors: [formattedError, ...errors],
    //     };
    //   });

    return schema as UnionSchemaInterface<T>;
  },
};

function errorMessageFactory(type) {
  return (value) =>
    `The value "${value}" must be type of ${type} but is type of "${typeof value}".`;
}

function hookOriginal<Input, Output>(
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
  validation,
  { type = 'any', message } = {} as CreateSchemaInterfaceOptions,
) {
  message = message || errorMessageFactory(type);

  const options = {
    message,
    type,
  };

  const defaultInterface: SchemaInterface<Input, Output> = {
    _getType() {
      return type;
    },
    _getDescription() {
      return this._getType();
    },
    _parse(value, parseOptions) {
      const isValid = validation(value);

      if (isValid) {
        return { success: true, data: value as unknown as Output };
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
    parse(value, parseOptions) {
      let item = defaultInterface._parse(value, parseOptions);

      if (!item.success) {
        item = item as Invalid;

        throw new Error(item.error.message, { cause: item.error.cause });
      }

      return item.data as Output;
    },
    safeParse(value, parseOptions) {
      return defaultInterface._parse(value, parseOptions);
    },
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
    optional() {
      hookOriginal(this, '_parse', (originalParse, value, parseOptions) => {
        const item = originalParse(value, parseOptions);

        if (!item.success) {
          item.data = undefined;
          item.success = true; // Mark as success since we are allowing undefined
        }

        return item;
      });

      return this;
    },
    nullable() {
      hookOriginal(this, '_parse', (originalParse, value, parseOptions) => {
        const item = originalParse(value, parseOptions);

        if (!item.success) {
          item.data = null;
          item.success = true;
          return item;
        }

        return item;
      });

      return this;
    },
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
    refine(validation, { message } = {}) {
      hookOriginal(this, '_parse', (originalParse, value, parseOptions) => {
        const parsedValue = originalParse(value, parseOptions);

        if (!parsedValue.success) {
          return parsedValue;
        }

        if (!validation(parsedValue.data)) {
          const messageText =
            typeof message === 'function' ? message(value) : message;

          return {
            success: false,
            error: {
              message: messageText,
            },
            errors: [
              {
                message: messageText,
              },
            ],
          };
        }

        return parsedValue;
      });

      return this;
    },
  };

  return extenders.length > 0
    ? extenders.reduce(
        (acc, extend) => extend(acc, validation, options) ?? acc,
        defaultInterface,
      )
    : defaultInterface;
}

const extenders: Function[] = [];

export function extend(callback: ExtenderType) {
  extenders.push(callback);
}

export type Infer<T> = T extends SchemaType ? ReturnType<T['parse']> : unknown;
