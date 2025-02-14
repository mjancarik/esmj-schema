// simple-schema
export interface SchemaInterface<Input, Output> {
  parse(value: Input | Partial<Input> | unknown): Output;
  safeParse(
    value: Input | Partial<Input> | unknown,
  ): { success: true; data: Output } | { success: false; error: Error };
  optional(): SchemaInterface<Input, Partial<Output> | undefined>;
  nullable(): SchemaInterface<Input, Output | null>;
  nullish(): SchemaInterface<Input, Output | undefined | null>;
  default(
    defaultValue: Partial<Input> | (() => Partial<Input>) | Partial<Output>,
  ): SchemaInterface<Input, Output>;
}

export type SchemaType =
  | SchemaInterface<string, string>
  | SchemaInterface<string, string | undefined>
  | SchemaInterface<string, string | null>
  | SchemaInterface<string, string | undefined | null>
  | SchemaInterface<object, object>
  | SchemaInterface<object, object | undefined>
  | SchemaInterface<object, object | null>
  | SchemaInterface<object, object | undefined | null>
  | SchemaInterface<number, number>
  | SchemaInterface<number, number | undefined>
  | SchemaInterface<number, number | null>
  | SchemaInterface<number, number | undefined | null>
  | SchemaInterface<boolean, boolean>
  | SchemaInterface<boolean, boolean | undefined>
  | SchemaInterface<boolean, boolean | null>
  | SchemaInterface<boolean, boolean | undefined | null>
  | SchemaInterface<Array<unknown>, Array<unknown>>
  | SchemaInterface<Array<unknown>, Array<unknown> | undefined>
  | SchemaInterface<Array<unknown>, Array<unknown> | null>
  | SchemaInterface<Array<unknown>, Array<unknown> | undefined | null>;

export const s = {
  object<T extends Record<string, SchemaType>>(
    definition: {
      [Property in keyof T]: T[Property];
    },
  ): SchemaInterface<
    { [Property in keyof T]: T[Property] },
    { [Property in keyof T]: ReturnType<T[Property]['parse']> }
  > {
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
  string(): SchemaInterface<string, string> {
    const validation = (value) => typeof value === 'string';

    return createSchemaInterface<string, string>(validation, {
      type: 'string',
    });
  },
  number(): SchemaInterface<number, number> {
    const validation = (value) => typeof value === 'number';

    return createSchemaInterface<number, number>(validation, {
      type: 'number',
    });
  },
  boolean(): SchemaInterface<boolean, boolean> {
    const validation = (value) => value === true || value === false;

    return createSchemaInterface<boolean, boolean>(validation, {
      type: 'boolean',
    });
  },
  array<T extends SchemaType>(
    definition: T,
  ): SchemaInterface<Array<T>, Array<ReturnType<T['parse']>>> {
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

    return schema;
  },
  any() {
    return createSchemaInterface(() => true);
  },
};

function errorMessageFactory(type) {
  return (value) =>
    `The value "${value}" must be type of ${type} but is type of "${typeof value}".`;
}

function hookOriginal<Input, Output>(
  object: SchemaInterface<Input, Output>,
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
  { type = 'any' } = {},
) {
  const message = errorMessageFactory(type);

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
  };

  return extenders.reduce(
    (acc, extend) => extend(acc, validation, options) ?? acc,
    defaultInterface,
  );
}

const extenders: Function[] = [];

export function extend(callback: Function) {
  extenders.push(callback);
}
