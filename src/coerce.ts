import {
  type BooleanSchemaInterface,
  type CoerceInterface,
  type DateSchemaInterface,
  type NumberSchemaInterface,
  type SchemaInterfaceOptions,
  type StringSchemaInterface,
  boolean,
  date,
  number,
  preprocess,
  s,
  string,
} from './index.ts';

export * from './index.ts';

declare module './index.ts' {
  interface CoerceInterface {
    /**
     * Creates a string schema that coerces input using `String(value)`.
     * Always succeeds — `String()` never produces an invalid string.
     */
    string(options?: SchemaInterfaceOptions): StringSchemaInterface;
    /**
     * Creates a number schema that coerces input using `Number(value)`.
     * Fails when the result is `NaN` (e.g. `'bad'`, `undefined`, plain objects).
     */
    number(options?: SchemaInterfaceOptions): NumberSchemaInterface;
    /**
     * Creates a boolean schema that coerces input using `Boolean(value)`.
     * Always succeeds — `Boolean()` always produces `true` or `false`.
     * Note: `Boolean('false')` is `true` because `'false'` is a non-empty string.
     */
    boolean(options?: SchemaInterfaceOptions): BooleanSchemaInterface;
    /**
     * Creates a date schema that coerces input using `new Date(value)`.
     * Fails when the result is an invalid Date (e.g. `'garbage'`).
     */
    date(options?: SchemaInterfaceOptions): DateSchemaInterface;
  }
}

Object.assign(s.coerce, {
  string(options?: SchemaInterfaceOptions): StringSchemaInterface {
    return preprocess((value: unknown) => String(value), string(options));
  },
  number(options?: SchemaInterfaceOptions): NumberSchemaInterface {
    const message =
      options?.message ??
      ((value: unknown) => `Cannot coerce "${value}" to a valid number.`);
    return preprocess(
      (value: unknown) => Number(value),
      number({ ...options, message }),
    );
  },
  boolean(options?: SchemaInterfaceOptions): BooleanSchemaInterface {
    return preprocess((value: unknown) => Boolean(value), boolean(options));
  },
  date(options?: SchemaInterfaceOptions): DateSchemaInterface {
    const message =
      options?.message ??
      ((value: unknown) => `Cannot coerce "${value}" to a valid date.`);
    return preprocess(
      (value: unknown) => new Date(value as string | number | Date),
      date({ ...options, message }),
    );
  },
} satisfies CoerceInterface);
