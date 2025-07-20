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
};

type InternalParseOutput<Output> = Valid<Output> | Invalid;

// @TODO Partial<Input> should be used only for optional schema keys
export interface SchemaInterface<Input, Output> {
  _getType(): string;
  _parse(value: Input | Partial<Input>): InternalParseOutput<Output>;
  parse(value: Input | Partial<Input>): Output;
  safeParse(value: Input | Partial<Input>): InternalParseOutput<Output>;
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
    { message }: { message: ErrorMessage },
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
  message?: (value: unknown) => string;
}
export type SchemaInterfaceOptions = Omit<CreateSchemaInterfaceOptions, 'type'>;

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

    hookOriginal(schema, '_parse', (originalParse, ...args) => {
      const value = originalParse(...args);

      if (value.success === false) {
        return value;
      }

      const acc = {} as Record<string, unknown>;
      for (const key in definition) {
        let item = (
          definition[key]._parse as (
            value: unknown,
          ) => InternalParseOutput<unknown>
        )(value.data[key]);

        if (item.success) {
          acc[key] = item.data;
        } else {
          item = item as Invalid;
          const errorKey = item?.error?.cause?.key
            ? `${key}.${item?.error?.cause?.key}`
            : key;

          item.error.message = `Error parsing key "${errorKey}": ${item.error.message}`;
          item.error.cause = { key: errorKey };

          return item;
        }
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

    hookOriginal(schema, '_parse', (originalParse, ...args) => {
      const value = originalParse(...args);

      if (value.success === false) {
        return value;
      }

      const acc = [] as Array<ReturnType<T['parse']>>;
      for (let index = 0; index < value.data.length; index++) {
        let item = (
          definition._parse as (value: unknown) => InternalParseOutput<unknown>
        )(value.data[index]);

        if (item.success) {
          acc.push(item.data as ReturnType<T['parse']>);
        } else {
          item = item as Invalid;
          const errorKey = item.error?.cause?.key
            ? `${index}.${item.error.cause.key}`
            : `${index}`;

          item.error.message = `Error parsing index "${index}": ${item.error.message}`;
          item.error.cause = { key: errorKey };

          return item;
        }
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
    const message = (value) =>
      `Invalid union value. Expected the value to match one of the schemas: ${definitions.map((definition) => `"${definition._getType()}"`).join(' | ')}, but received "${typeof value}" with value "${value}".`;

    const schema = createSchemaInterface<
      ReturnType<T[number]['parse']>,
      ReturnType<T[number]['parse']>
    >(validation, {
      message,
      ...options,
      type: 'union',
    });

    return schema;
  },
};

function errorMessageFactory(type) {
  return (value) =>
    `The value "${value}" must be type of ${type} but is type of "${typeof value}".`;
}

function hookOriginal<Input, Output>(
  object: SchemaInterface<Input, Output> | SchemaType,
  method: string,
  action: (original: Function, ...args: unknown[]) => Output,
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
    _parse(value) {
      const isValid = validation(value);

      if (isValid) {
        return { success: true, data: value as unknown as Output };
      }

      return { success: false, error: { message: message(value) } };
    },
    parse(value) {
      let item = defaultInterface._parse(value);

      if (!item.success) {
        item = item as Invalid;

        throw new Error(item.error.message, { cause: item.error.cause });
      }

      return item.data as Output;
    },
    safeParse(value) {
      return defaultInterface._parse(value);
    },
    transform(callback) {
      hookOriginal(this, '_parse', (originalParse, value) => {
        const item = originalParse(value);

        if (!item.success) {
          return item;
        }

        item.data = callback(item.data);

        return item;
      });

      return this;
    },
    optional() {
      hookOriginal(this, '_parse', (originalParse, value) => {
        const item = originalParse(value);

        if (!item.success) {
          item.data = undefined;
          item.success = true; // Mark as success since we are allowing undefined
        }

        return item;
      });

      return this;
    },
    nullable() {
      hookOriginal(this, '_parse', (originalParse, value) => {
        const item = originalParse(value);

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
      hookOriginal(this, '_parse', (originalParse, value) => {
        const item = originalParse(value);

        if (!item.success && (value === undefined || value === null)) {
          item.success = true; // Mark as success since we are allowing undefined or null
          item.data = value;
        }

        return item;
      });

      return this;
    },
    default(defaultValue) {
      hookOriginal(this, '_parse', (originalParse, value) => {
        if (value === undefined) {
          value = defaultValue;
          value =
            typeof defaultValue === 'function' ? defaultValue() : defaultValue;
        }

        return originalParse(value) as Partial<typeof value>;
      });

      return this;
    },
    pipe(schema) {
      hookOriginal(this, '_parse', (originalParse, value) => {
        const item = originalParse(value);
        if (!item.success) {
          return item;
        }

        return schema._parse(item.data);
      });

      return this;
    },
    refine(validation, { message }) {
      hookOriginal(this, '_parse', (originalParse, value) => {
        const parsedValue = originalParse(value);

        if (!validation(parsedValue.data)) {
          return { success: false, error: { message } };
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
