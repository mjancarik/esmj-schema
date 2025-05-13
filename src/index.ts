export interface SchemaInterface<Input, Output> {
  parse(value: Input | Partial<Input> | unknown): Output;
  safeParse(
    value: Input | Partial<Input> | unknown,
  ): { success: true; data: Output } | { success: false; error: Error };
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
    { message }: { message: string },
  ): SchemaInterface<Input, Output>;
}

type ToObject<T> = T extends readonly [infer Key, infer Func]
  ? Key extends PropertyKey
    ? { [P in Key]: Func }
    : never
  : never;

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
    { [Property in keyof T]: T[Property] },
    { [Property in keyof T]: ReturnType<T[Property]['parse']> }
  > {}

export type SchemaType =
  | StringSchemaInterface
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

export type ExtenderType = (
  inter: SchemaType,
  validation: Function,
  options: { message: string; type: string },
) => SchemaType;

interface CraeateSchemaInterfaceOptions {
  type?: string;
  message?: (value: unknown) => string;
}

export const s = {
  object<T extends Record<string, SchemaType>>(
    definition: {
      [Property in keyof T]: T[Property];
    },
  ): ObjectSchemaInterface<T> {
    const validation = (value) =>
      typeof value === 'object' && value !== null && !Array.isArray(value);

    const schema = createSchemaInterface<
      { [Property in keyof T]: T[Property] },
      { [Property in keyof T]: ReturnType<T[Property]['parse']> }
    >(validation, {
      type: 'object',
    });

    hookOriginal(schema, 'parse', (originalParse, ...args) => {
      const value = originalParse(...args);

      if (definition && typeof value === 'object') {
        return (Object.keys(definition) as string[]).reduce(
          (acc, key) => {
            if (typeof definition[key]?.parse === 'function') {
              try {
                acc[key] = definition[key].parse(value[key]);
              } catch (error) {
                key = error.cause?.key ? `${key}.${error.cause.key}` : key;

                throw new Error(
                  `Error parsing key "${key}": ${error.message}`,
                  {
                    cause: { key },
                  },
                );
              }
            }

            return acc;
          },
          {} as Record<string, unknown>,
        ) as {
          [Property in keyof T]: ReturnType<T[Property]['parse']>;
        };
      }

      return value;
    });

    return schema;
  },
  string(): StringSchemaInterface {
    const validation = (value) => typeof value === 'string';

    return createSchemaInterface<string, string>(validation, {
      type: 'string',
    }) as StringSchemaInterface;
  },
  number(): NumberSchemaInterface {
    const validation = (value) => typeof value === 'number';

    return createSchemaInterface<number, number>(validation, {
      type: 'number',
    }) as NumberSchemaInterface;
  },
  boolean(): BooleanSchemaInterface {
    const validation = (value) => value === true || value === false;

    return createSchemaInterface<boolean, boolean>(validation, {
      type: 'boolean',
    }) as BooleanSchemaInterface;
  },
  date(): DateSchemaInterface {
    const validation = (value) =>
      value instanceof Date && !Number.isNaN(value.getTime());

    return createSchemaInterface<Date, Date>(validation, {
      type: 'date',
    }) as DateSchemaInterface;
  },
  enum(
    definition: Readonly<Array<string>>,
  ): EnumSchemaInterface<(typeof definition)[number]> {
    const validation = (value) => definition.includes(value);

    const message = (value) =>
      `Invalid ${type} value. Expected ${definition.map((value) => `"${value}"`).join(' | ')}, received "${value}".`;
    const type = 'enum';

    const schema = createSchemaInterface<string, (typeof definition)[number]>(
      validation,
      {
        type,
        message,
      },
    ) as EnumSchemaInterface<(typeof definition)[number]>;

    return schema as EnumSchemaInterface<(typeof definition)[number]>;
  },
  array<T extends SchemaType>(definition: T): ArraySchemaInterface<T> {
    const validation = (value) => Array.isArray(value);

    const schema = createSchemaInterface<
      Array<T>,
      Array<ReturnType<T['parse']>>
    >(validation, {
      type: 'array',
    });

    hookOriginal(schema, 'parse', (originalParse, value) => {
      value = originalParse(value);

      if (definition && Array.isArray(value)) {
        return value.map((item, index) => {
          try {
            return definition.parse(item);
          } catch (error) {
            const key = error.cause?.key
              ? `${index}.${error.cause.key}`
              : index;

            throw new Error(
              `Error parsing index "${index}": ${error.message}`,
              {
                cause: { key },
              },
            );
          }
        }) as Array<ReturnType<T['parse']>>;
      }

      return value;
    });

    return schema as ArraySchemaInterface<T>;
  },
  any() {
    return createSchemaInterface(() => true);
  },
  preprocess<T extends SchemaType>(callback: Function, schema: T) {
    hookOriginal(schema, 'parse', (originalParse, value) => {
      value = callback(value);

      return originalParse(value);
    });

    return schema as T;
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
  { type = 'any', message } = {} as CraeateSchemaInterfaceOptions,
) {
  message = message || errorMessageFactory(type);

  const options = {
    message,
    type,
  };

  const defaultInterface: SchemaInterface<Input, Output> = {
    parse(value) {
      if (!validation(value)) {
        throw new Error(message(value));
      }

      return value as Output;
    },
    safeParse(value) {
      try {
        const data = this.parse(value);

        return { success: true, data };
      } catch (error) {
        return { success: false, error };
      }
    },
    transform(callback) {
      hookOriginal(this, 'parse', (originalParse, value) => {
        return callback(originalParse(value));
      });

      return this;
    },
    optional() {
      hookOriginal(this, 'parse', (originalParse, value) => {
        try {
          return originalParse(value);
        } catch (error) {
          // eslint-disable-line
          return undefined;
        }
      });

      return this;
    },
    nullable() {
      hookOriginal(this, 'parse', (originalParse, value) => {
        try {
          return originalParse(value);
        } catch (error) {
          // eslint-disable-line
          return null;
        }
      });

      return this;
    },
    nullish() {
      hookOriginal(this, 'parse', (originalParse, value) => {
        try {
          return originalParse(value);
        } catch (error) {
          // eslint-disable-line
          if (value === undefined || value === null) {
            return value;
          }

          return null;
        }
      });

      return this;
    },
    default(defaultValue) {
      hookOriginal(this, 'parse', (originalParse, value) => {
        if (value === undefined) {
          value = defaultValue;
          value =
            typeof defaultValue === 'function' ? defaultValue() : defaultValue;
        }
        value = originalParse(value);

        return value as Partial<Output>;
      });

      return this;
    },
    pipe(schema) {
      hookOriginal(this, 'parse', (originalParse, value) => {
        return schema.parse(originalParse(value));
      });

      return this;
    },
    refine(validation, { message }) {
      hookOriginal(this, 'parse', (originalParse, value) => {
        const parsedValue = originalParse(value);

        if (!validation(parsedValue)) {
          throw new Error(message);
        }

        return parsedValue;
      });

      return this;
    },
  };

  return extenders.reduce(
    (acc, extend) => extend(acc, validation, options) ?? acc,
    defaultInterface,
  );
}

const extenders: Function[] = [];

export function extend(callback: ExtenderType) {
  extenders.push(callback);
}

export type Infer<T> = T extends SchemaType ? ReturnType<T['parse']> : unknown;
