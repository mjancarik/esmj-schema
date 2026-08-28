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

type RefinementMethod<Output> = (
  value: Output,
) => boolean | InternalParseOutput<Output>;

interface ParseOptions {
  abortEarly?: boolean;
  /**
   * Arbitrary caller-supplied data made available to schemas during parsing
   * without needing to be part of the parsed value itself — e.g. the index
   * of the current element in a batch registration, or ambient data like the
   * current user/tenant. Read inside a schema via `contextRef()` or the
   * second argument of `object().derive()`.
   *
   * `array()` automatically merges `{ index }` into `context` for each
   * element it parses (innermost index wins for nested arrays).
   */
  context?: Record<string, unknown>;
}

// @TODO Partial<Input> should be used only for optional schema keys
export interface SchemaInterface<Input, Output> {
  _getName(): undefined | string;
  _getType(): string;
  _getDescription(): string;
  /**
   * Exposes the internal definition of composite schemas (the field map for
   * `object()`, the item schema for `array()`, the branch schemas for
   * `union()`, the allowed values for `enumSchema()`, or the literal value
   * for `literal()`). Returns `undefined` for leaf schemas (string, number,
   * etc.) that have no internal definition to expose.
   * @internal
   */
  _getDefinition?(): unknown;
  /**
   * Returns the JSON Schema keyword fragments accumulated by `refine()`
   * calls that passed a `jsonSchema` option, in call order. Returns
   * `undefined` if none were provided. Consumed by `@esmj/schema/standard`
   * to describe constraints (e.g. `min()`/`max()`) without that module
   * needing to know about every individual constraint method by name.
   * @internal
   */
  _getJsonSchemaHints?(): ReadonlyArray<Record<string, unknown>>;
  _parse(
    value: Input | Partial<Input>,
    options?: ParseOptions,
  ): InternalParseOutput<Output>;
  parse(value: Input | Partial<Input>, options?: ParseOptions): Output;
  safeParse(
    value: Input | Partial<Input>,
    options?: ParseOptions,
  ): InternalParseOutput<Output>;
  optional(): SchemaInterface<Input, Output | undefined>;
  /**
   * @param options.jsonSchema Describes the JSON Schema impact of this
   * transform for `@esmj/schema/standard`, ignored if that module isn't
   * imported: a fragment object explicitly declares the new output shape;
   * `null` declares the transform as shape-preserving (e.g. `string.trim()`,
   * `array.sort()` still produce a string/array with the same constraints);
   * omitting the option marks the output shape as unexplained, which causes
   * `~standard.jsonSchema.output()` to throw unless a later `.pipe()`/
   * `.transform()` call supplies an explicit hint.
   */
  transform<NewOutput>(
    callback: (value: Output) => NewOutput,
    options?: { jsonSchema?: Record<string, unknown> | null },
  ): SchemaInterface<Input, NewOutput>;
  nullable(): SchemaInterface<Input, Output | null>;
  nullish(): SchemaInterface<Input, Output | undefined | null>;
  default(
    defaultValue:
      | Partial<Input>
      | Partial<Output>
      | ((options: {
          context?: Record<string, unknown>;
        }) => Partial<Input> | Partial<Output>),
  ): SchemaInterface<Input, Output>;
  catch(
    catchValue:
      | Output
      | ((ctx: { input: unknown; error: ErrorStructure }) => Output),
  ): SchemaInterface<Input, Output>;
  pipe<NewOutput>(
    schema: SchemaInterface<Output, NewOutput>,
  ): SchemaInterface<Input, NewOutput>;
  refine(
    validation: RefinementMethod<Output>,
    options?: CreateSchemaInterfaceOptions,
  ): SchemaInterface<Input, Output>;
  /**
   * Creates an independent copy of the schema.
   *
   * Modifier methods (`optional`, `nullable`, `nullish`, `transform`,
   * `default`, `catch`, `pipe`, `refine`) mutate the schema instance in
   * place and return `this`. If a schema instance is reused in multiple
   * places (e.g. passed into `s.object({...})` and also kept in a
   * variable), calling a modifier on that shared reference later
   * retroactively affects every place it's used. Call `clone()` first to
   * get an independent instance that can be modified safely without
   * affecting the original (or vice versa).
   *
   * Note: this is a shallow clone — for `object()`/`array()` schemas, the
   * nested field schemas passed in the definition remain shared references.
   */
  clone(): SchemaInterface<Input, Output>;
}

export interface LiteralSchemaInterface<T extends string | number | boolean>
  extends SchemaInterface<T, T> {}
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
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export interface FunctionSchemaInterface
  extends SchemaInterface<Function, Function> {}
export interface ArraySchemaInterface<T extends SchemaType>
  extends SchemaInterface<
    Array<ReturnType<T['parse']>>,
    Array<ReturnType<T['parse']>>
  > {}
// biome-ignore lint/suspicious/noEmptyInterface: extended by coerce module
export interface CoerceInterface {}
export interface ObjectSchemaInterface<T extends Record<string, SchemaType>>
  extends SchemaInterface<
    { [Property in keyof T]: ReturnType<T[Property]['parse']> },
    { [Property in keyof T]: ReturnType<T[Property]['parse']> }
  > {
  /**
   * Derives computed values for one or more fields from the rest of the
   * already-parsed row (cross-field derivation) and/or from
   * `parseOptions.context`, without needing a separate `.transform()` step.
   *
   * Runs after the object's own field-by-field parsing succeeds — unlike
   * `default()` (per-field, only fires when that field's own input is
   * `undefined`, sees only `{ context }`), `derive()` runs once for the
   * whole object after every field has already been parsed, and its
   * `callback` receives the full parsed row plus `{ context }` (from
   * `parseOptions.context`), returning a partial object whose keys are
   * merged over the row.
   *
   * @param options.when `'always'` (default) — returned keys always
   * override the parsed row's values. `'missing'` — returned keys are only
   * applied where the parsed row's value is `undefined`.
   *
   * @example
   * ```typescript
   * const schema = s.object({
   *   id: s.string().optional(),
   *   label: s.string().optional(),
   *   order: s.number().optional(),
   * }).derive((row, { context }) => ({
   *   id: row.id ?? `action:${context?.index ?? 0}`,
   *   order: row.order ?? context?.index ?? 0,
   * }));
   *
   * schema.parse({ label: 'Save' }, { context: { index: 2 } });
   * // { label: 'Save', id: 'action:2', order: 2 }
   * ```
   */
  derive(
    callback: (
      value: { [Property in keyof T]: ReturnType<T[Property]['parse']> },
      context: { context?: Record<string, unknown> },
    ) => Partial<{ [Property in keyof T]: ReturnType<T[Property]['parse']> }>,
    options?: { when?: 'always' | 'missing' },
  ): ObjectSchemaInterface<T>;
}

export type SchemaType =
  | LiteralSchemaInterface<string>
  | LiteralSchemaInterface<number>
  | LiteralSchemaInterface<boolean>
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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  | FunctionSchemaInterface
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
  /**
   * Optional JSON Schema keyword fragment describing the constraint being
   * added by this `refine()` call (e.g. `{ minLength: 3 }`). Collected via
   * `_getJsonSchemaHints()` and consumed by `@esmj/schema/standard`; ignored
   * if that module isn't imported.
   *
   * Note: this option is only meaningful when calling `refine()` directly
   * (e.g. from a custom `extend()`-added method). Because
   * `SchemaInterfaceOptions` (the options type accepted by built-in
   * constraint methods like `min()`/`max()`/`startsWith()`/etc.) is derived
   * from this same interface, TypeScript will also allow `jsonSchema` to be
   * passed to those calls (e.g. `s.string().min(3, { jsonSchema: {...} })`)
   * — but it has no effect there: each built-in constraint method always
   * supplies its own fixed `jsonSchema` fragment to its internal `refine()`
   * call and ignores whatever the caller passed under this key.
   */
  jsonSchema?: Record<string, unknown>;
}
export type SchemaInterfaceOptions = Omit<CreateSchemaInterfaceOptions, 'type'>;

const defaultParseOptions: ParseOptions = {
  abortEarly: true,
};

function formatError(
  error: ErrorStructure,
  parentKey?: string | number,
): ErrorStructure {
  if (parentKey === undefined) return error;

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
  if (!item.errors?.length) return;

  for (let i = 0; i < item.errors.length; i++) {
    errors.push(formatError(item.errors[i], key));
  }
}

// Shared failure-path handling for object()/array() item validation: returns
// an early-return Invalid result when abortEarly is enabled, otherwise
// accumulates nested errors into `errors` and returns undefined so the caller
// continues iterating.
function handleItemFailure(
  item: Invalid,
  key: string | number,
  abortEarly: boolean | undefined,
  errors: ErrorStructure[],
): Invalid | undefined {
  if (abortEarly !== false) {
    const formattedError = formatError(item.error, key);
    return {
      success: false,
      error: formattedError,
      errors: [formattedError],
    };
  }

  propagateNestedErrors(item, errors, key);

  return undefined;
}

function resolveParseOptions(parseOptions?: ParseOptions): ParseOptions {
  return parseOptions?.abortEarly !== undefined
    ? parseOptions
    : defaultParseOptions;
}

// Shared by optional()/nullable()/nullish(): converts a failed parse into a
// successful one carrying `value` when `predicate(value)` matches.
function applyNullishModifier<Output>(
  schema: SchemaInterface<unknown, Output>,
  predicate: (value: unknown) => boolean,
): void {
  hookOriginal(schema, '_parse', (originalParse, value, parseOptions) => {
    const item = originalParse(value, parseOptions);

    if (!item.success && predicate(value)) {
      // Return a clean Valid<Output> instead of mutating `item` in place —
      // mutating would leave the stale `error`/`errors` keys from the failed
      // parse attached to a result whose `success` is `true`.
      return { success: true, data: value as Output };
    }

    return item;
  });
}

// Better type for validation methods
const stringValidation = (value: unknown): value is string =>
  typeof value === 'string' || value instanceof String;

const numberValidation = (value: unknown): value is number =>
  (typeof value === 'number' || value instanceof Number) &&
  !Number.isNaN(value);

const booleanValidation = (value: unknown): value is boolean =>
  value === true || value === false;

const dateValidation = (value: unknown): value is Date =>
  value instanceof Date && !Number.isNaN(value.getTime());

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
const functionValidation = (value: unknown): value is Function =>
  typeof value === 'function';

const arrayValidation = (value: unknown): value is unknown[] =>
  Array.isArray(value);

const objectValidation = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function object<T extends Record<string, SchemaType>>(
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

  // Exposes the field schema map (used by e.g. the standard.ts extender).
  schema._getDefinition = () => definition;

  const objectSchema = schema as unknown as ObjectSchemaInterface<T>;

  // Derives cross-field computed values from the already-parsed row and/or
  // `parseOptions.context`. Hooked in AFTER the field-loop's own
  // hookOriginal below is set up, so the callback (invoked lazily, once the
  // caller calls `.derive(...)`) wraps the field-loop's `_parse` and
  // therefore always receives the already-parsed row, not the raw input.
  //
  // Uses a regular `function` (not an arrow function) so `this` is bound to
  // whichever instance the method is actually called on — including a
  // `.clone()` — instead of always closing over the original `objectSchema`
  // captured here. This matches every other modifier (optional/default/
  // transform/etc.), which all use `hookOriginal(this, ...)` for the same
  // clone-safety reason.
  objectSchema.derive = function (callback, { when = 'always' } = {}) {
    hookOriginal(this, '_parse', (originalParse, data, parseOptions) => {
      const result = originalParse(data, parseOptions) as InternalParseOutput<{
        [Property in keyof T]: ReturnType<T[Property]['parse']>;
      }>;

      if (!result.success) {
        return result;
      }

      const overrides = callback(result.data, {
        context: (parseOptions as ParseOptions | undefined)?.context,
      });

      if (!objectValidation(overrides)) {
        const error = {
          message: `derive() callback must return a plain object of overrides, got ${overrides === null ? 'null' : typeof overrides}`,
        };

        return { success: false, error, errors: [error] };
      }

      if (when === 'missing') {
        const merged = { ...result.data } as Record<string, unknown>;

        for (const key in overrides) {
          if (merged[key] === undefined) {
            merged[key] = overrides[key];
          }
        }

        return { success: true, data: merged } as InternalParseOutput<{
          [Property in keyof T]: ReturnType<T[Property]['parse']>;
        }>;
      }

      return {
        success: true,
        data: { ...result.data, ...overrides },
      } as InternalParseOutput<{
        [Property in keyof T]: ReturnType<T[Property]['parse']>;
      }>;
    });

    return this;
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

    // Note: Using for...in is actually faster than Object.keys() in V8
    // despite common belief. Benchmarks show 15% better performance.
    for (const key in definition) {
      const item = (
        definition[key]._parse as (
          value: unknown,
          parseOptions?: ParseOptions,
        ) => InternalParseOutput<unknown>
      )(value.data[key], parseOptions as ParseOptions | undefined);

      if (item.success) {
        acc[key] = item.data;
      } else {
        const failure = handleItemFailure(
          item as Invalid,
          key,
          abortEarly,
          errors,
        );

        if (failure) {
          return failure;
        }
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

  return objectSchema;
}

export function string(
  options?: SchemaInterfaceOptions,
): StringSchemaInterface {
  return createSchemaInterface<string, string>(stringValidation, {
    ...options,
    type: 'string',
  }) as StringSchemaInterface;
}

export function number(
  options?: SchemaInterfaceOptions,
): NumberSchemaInterface {
  return createSchemaInterface<number, number>(numberValidation, {
    ...options,
    type: 'number',
  }) as NumberSchemaInterface;
}

export function boolean(
  options?: SchemaInterfaceOptions,
): BooleanSchemaInterface {
  return createSchemaInterface<boolean, boolean>(booleanValidation, {
    ...options,
    type: 'boolean',
  }) as BooleanSchemaInterface;
}

export function date(options?: SchemaInterfaceOptions): DateSchemaInterface {
  return createSchemaInterface<Date, Date>(dateValidation, {
    ...options,
    type: 'date',
  }) as DateSchemaInterface;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function functionSchema(
  options?: SchemaInterfaceOptions,
): FunctionSchemaInterface {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  return createSchemaInterface<Function, Function>(functionValidation, {
    ...options,
    type: 'function',
  }) as FunctionSchemaInterface;
}

export function enumSchema<const T extends Readonly<Array<string>>>(
  definition: T,
  options?: SchemaInterfaceOptions,
): EnumSchemaInterface<T[number]> {
  const validation = (value: unknown) => definition.includes(value as string);

  const message = (value: unknown) =>
    `Invalid ${type} value. Expected ${definition.map((value) => `"${value}"`).join(' | ')}, received "${value}".`;
  const type = 'enum';

  const schema = createSchemaInterface<string, T[number]>(validation, {
    message,
    ...options,
    type,
  }) as EnumSchemaInterface<T[number]>;

  // Add a more detailed description for enum schemas
  schema._getDescription = () => {
    return `enum(${definition.map((value) => `"${value}"`).join(' | ')})`;
  };

  // Exposes the allowed values (used by e.g. the standard.ts extender).
  schema._getDefinition = () => definition;

  return schema as EnumSchemaInterface<T[number]>;
}

export function array<T extends SchemaType>(
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

  // Exposes the item schema (used by e.g. the standard.ts extender).
  schema._getDefinition = () => definition;

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

    const baseParseOptions = parseOptions as ParseOptions | undefined;

    // Note: Not caching length in variable as V8 optimizes array.length access
    for (let index = 0; index < value.data.length; index++) {
      // Auto-inject the element's index into `context` so item schemas (and
      // any `object().derive()`/`contextRef()` they use) can read it
      // without the caller manually looping and passing `{ context }` per
      // element. For nested arrays the innermost index wins (current
      // limitation, no per-level path tracking).
      const elementParseOptions: ParseOptions = {
        ...baseParseOptions,
        context: { ...baseParseOptions?.context, index },
      };
      const item = (
        definition._parse as (
          value: unknown,
          parseOptions?: ParseOptions,
        ) => InternalParseOutput<unknown>
      )(value.data[index], elementParseOptions);

      if (item.success) {
        acc.push(item.data as ReturnType<T['parse']>);
      } else {
        const failure = handleItemFailure(
          item as Invalid,
          index,
          abortEarly,
          errors,
        );

        if (failure) {
          return failure;
        }
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
}

export function any() {
  return createSchemaInterface(() => true);
}

export function preprocess<T extends SchemaType>(
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  callback: Function,
  schema: T,
): T {
  hookOriginal(schema, '_parse', (originalParse, value, parseOptions) => {
    value = callback(value);

    return originalParse(value, parseOptions);
  });

  return schema as T;
}

export function union<T extends Array<SchemaType>>(
  definitions: T,
  options?: SchemaInterfaceOptions,
): UnionSchemaInterface<T> {
  const message = (value: unknown) =>
    `Invalid union value. Expected the value to match one of the schemas:${definitions
      .map((definition, idx) => ` ${idx + 1}. ${definition._getDescription()}`)
      .join(',')} but received "${typeof value}" with value: ${
      objectValidation(value) ? JSON.stringify(value) : `"${value}"`
    }`;

  const schema = createSchemaInterface<
    ReturnType<T[number]['parse']>,
    ReturnType<T[number]['parse']>
  >(() => false, {
    message,
    ...options,
    type: 'union',
  });

  // Exposes the branch schemas (used by e.g. the standard.ts extender).
  schema._getDefinition = () => definitions;

  hookOriginal(schema, '_parse', (_originalParse, data, parseOptions) => {
    const resolvedOptions = parseOptions as ParseOptions | undefined;
    const branchResults: Invalid[] = [];

    for (let index = 0; index < definitions.length; index++) {
      const result = (
        definitions[index]._parse as (
          value: unknown,
          parseOptions?: ParseOptions,
        ) => InternalParseOutput<ReturnType<T[number]['parse']>>
      )(data, resolvedOptions);

      if (result.success) {
        return result;
      }

      branchResults.push(result as Invalid);
    }

    const { abortEarly } = resolveParseOptions(resolvedOptions);
    const genericError = {
      message: typeof message === 'function' ? message(data) : message,
    };

    if (abortEarly !== false) {
      return { success: false, error: genericError, errors: [genericError] };
    }

    // Only surface field-level branch errors (i.e. errors that carry a
    // `cause.key`, meaning they originate from a nested object/array
    // schema). Plain type-mismatch errors from leaf schemas (string,
    // number, ...) don't add information beyond the generic union
    // message, so they're skipped to avoid noisy duplicate errors.
    const errors: ErrorStructure[] = [];

    for (let index = 0; index < branchResults.length; index++) {
      const branchErrors = branchResults[index].errors;

      if (!branchErrors?.length) continue;

      for (let i = 0; i < branchErrors.length; i++) {
        if (branchErrors[i].cause?.key) {
          errors.push(formatError(branchErrors[i], `branch ${index}`));
        }
      }
    }

    if (errors.length === 0) {
      errors.push(genericError);
    }

    return { success: false, error: errors[0], errors };
  });

  return schema as UnionSchemaInterface<T>;
}

export function literal<T extends string | number | boolean>(
  value: T,
  options?: SchemaInterfaceOptions,
): LiteralSchemaInterface<T> {
  const validation = (val: unknown) => val === value;

  const message = (val: unknown) =>
    options?.message
      ? typeof options.message === 'function'
        ? options.message(val)
        : options.message
      : `Expected literal value "${value}", received "${val}"`;

  const schema = createSchemaInterface<T, T>(validation, {
    message,
    name: options?.name,
    type: 'literal',
  });

  schema._getDescription = () => `literal("${value}")`;

  // Exposes the literal value (used by e.g. the standard.ts extender).
  schema._getDefinition = () => value;

  return schema as LiteralSchemaInterface<T>;
}

/**
 * A leaf schema that ignores its input value and instead resolves to
 * `parseOptions.context[key]` — the parse-time equivalent of a "default from
 * context" reference (similar in spirit to Yup's `ref('$key')`, but reads
 * context only, never sibling fields).
 *
 * Never fails on its own: if `context` (or the key) is missing, it resolves
 * to `undefined` — pair with `.pipe()`/`.default()`/`.refine()` to enforce a
 * type or fallback.
 *
 * @param key - The key to read from `parseOptions.context`
 *
 * @example
 * ```typescript
 * const schema = s.object({
 *   order: s.contextRef('index').pipe(s.number()),
 * });
 *
 * schema.parse({}, { context: { index: 2 } }); // { order: 2 }
 * ```
 */
export function contextRef<T = unknown>(
  key: string,
): SchemaInterface<unknown, T | undefined> {
  const schema = createSchemaInterface<unknown, T | undefined>(() => true, {
    type: 'contextRef',
  });

  schema._getDescription = () => `contextRef("${key}")`;

  hookOriginal(schema, '_parse', (_originalParse, _value, parseOptions) => ({
    success: true,
    data: (parseOptions as ParseOptions | undefined)?.context?.[key] as
      | T
      | undefined,
  }));

  return schema;
}

/**
 * Validates/defaults `parseOptions.context` through `contextSchema` before
 * building the real schema via `factory(context)`.
 *
 * Unlike `contextRef()` (which only reads a value out of context),
 * `withContext()` lets the schema's *shape* depend on context (e.g. select a
 * different sub-schema, or make a field required only in certain contexts),
 * and guarantees `factory` always receives a valid, defaulted context object
 * instead of an untyped pass-through.
 *
 * Returns a lean `{ parse, safeParse }` object rather than a full
 * `SchemaInterface` — the underlying schema can differ per call (it's
 * rebuilt from `factory(context)` every time), so it can't support the
 * modifier methods (`optional()`, `pipe()`, etc.) a single fixed schema can.
 *
 * @example
 * ```typescript
 * const schema = s.withContext(
 *   s.object({ index: s.number().default(0) }),
 *   (context) => s.object({
 *     order: s.number().default(context.index),
 *   }),
 * );
 *
 * schema.parse({}, { context: { index: 2 } }); // { order: 2 }
 * schema.parse({});                              // { order: 0 }
 * ```
 */
export function withContext<C, Output>(
  contextSchema: SchemaInterface<unknown, C>,
  factory: (context: C) => SchemaInterface<unknown, Output>,
): {
  parse(value: unknown, parseOptions?: ParseOptions): Output;
  safeParse(
    value: unknown,
    parseOptions?: ParseOptions,
  ): InternalParseOutput<Output>;
} {
  return {
    parse(value, parseOptions) {
      const context = contextSchema.parse(
        parseOptions?.context ?? {},
        parseOptions,
      );

      return factory(context).parse(value, parseOptions);
    },
    safeParse(value, parseOptions) {
      const contextResult = contextSchema.safeParse(
        parseOptions?.context ?? {},
        parseOptions,
      );

      if (!contextResult.success) {
        return contextResult as InternalParseOutput<Output>;
      }

      return factory(contextResult.data).safeParse(value, parseOptions);
    },
  };
}

export const cast = {
  boolean(options?: SchemaInterfaceOptions): BooleanSchemaInterface {
    const message =
      options?.message ??
      ((value: unknown) =>
        `Cannot cast "${value}" to boolean. Accepted: true/false, 1/0, yes/no, on/off.`);
    return preprocess(
      (value: unknown) => {
        let lower: string | undefined;

        if (stringValidation(value)) {
          lower = value.toLowerCase();
        }

        if (
          lower === 'true' ||
          lower === 'yes' ||
          lower === 'on' ||
          lower === '1' ||
          value === 1
        ) {
          return true;
        }

        if (
          lower === 'false' ||
          lower === 'no' ||
          lower === 'off' ||
          lower === '0' ||
          value === 0
        ) {
          return false;
        }

        return value; // will fail booleanValidation → emits custom message
      },
      boolean({ ...options, message }),
    );
  },
  number(options?: SchemaInterfaceOptions): NumberSchemaInterface {
    const message =
      options?.message ??
      ((value: unknown) =>
        `Cannot cast "${value}" to a number. Expected a numeric string or number.`);
    return preprocess(
      (value: unknown) => {
        if (booleanValidation(value)) {
          return Number(value);
        }

        if (stringValidation(value)) {
          const trimmed = value.trim();

          if (trimmed === '') {
            return value; // will fail numberValidation → emits custom message
          }

          const n = Number(trimmed);
          if (Number.isFinite(n)) {
            return n;
          }
        }

        return value;
      },
      number({ ...options, message }),
    );
  },
  string(options?: SchemaInterfaceOptions): StringSchemaInterface {
    const message =
      options?.message ??
      ((value: unknown) =>
        `Cannot cast "${value}" to string. Expected a string, number, or boolean.`);
    return preprocess(
      (value: unknown) => {
        if (
          booleanValidation(value) ||
          (numberValidation(value) && Number.isFinite(value))
        ) {
          return String(value);
        }

        return value;
      },
      string({ ...options, message }),
    );
  },
  date(options?: SchemaInterfaceOptions): DateSchemaInterface {
    const message =
      options?.message ??
      ((value: unknown) => `Cannot cast "${value}" to a valid date.`);
    return preprocess(
      (value: unknown) => {
        let str: string | undefined;

        if (stringValidation(value)) {
          str = value.trim();
        }

        if ((numberValidation(value) && Number.isFinite(value)) || str) {
          return new Date((str ?? value) as string | number);
        }

        return value;
      },
      date({ ...options, message }),
    );
  },
  json<T extends SchemaType>(schema: T, options?: SchemaInterfaceOptions): T {
    const message =
      options?.message ??
      ((value: unknown) => `Cannot parse "${value}" as JSON.`);
    hookOriginal(
      schema,
      '_parse',
      (originalParse: Function, value: unknown, parseOptions) => {
        if (stringValidation(value)) {
          try {
            value = JSON.parse(value);
          } catch {
            const error = {
              message: typeof message === 'function' ? message(value) : message,
            };
            return { success: false, error, errors: [error] };
          }
        }
        return originalParse(value, parseOptions);
      },
    );
    return schema;
  },
};

export const coerce = {} as CoerceInterface;

export const s = {
  object,
  string,
  number,
  boolean,
  date,
  function: functionSchema,
  enum: enumSchema,
  array,
  any,
  preprocess,
  union,
  literal,
  contextRef,
  withContext,
  coerce,
  cast,
};

function errorMessageFactory(type: string): (value: unknown) => string {
  return (value: unknown) =>
    `The value "${value}" must be type of ${type} but is type of "${typeof value}".`;
}

export function hookOriginal<Input, Output>(
  object: SchemaInterface<Input, Output> | SchemaType,
  method: keyof (SchemaInterface<Input, Output> | SchemaType),
  action: (
    original: Function,
    ...args: unknown[]
  ) => InternalParseOutput<Output>,
) {
  const original = object[method] as Function;

  // @ts-expect-error - Dynamic method replacement
  object[method] = (...args: unknown[]) => {
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
      let item = this._parse(value, parseOptions);

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
      return this._parse(value, parseOptions);
    },
    /**
     * Transforms the validated value using a callback function.
     *
     * The callback receives the schema's *current* output type at the point
     * `transform()` is called in the chain. If `transform()` is applied after
     * `optional()`, `nullable()`, or `nullish()`, the value can be `undefined`
     * and/or `null`, and the callback still runs for those values (it is not
     * skipped) — guard against them yourself (e.g. `value?.toUpperCase()`).
     *
     * @param callback - Function to transform the validated value
     * @returns The schema with transformation applied
     *
     * @example
     * ```typescript
     * const schema = s.string().transform(val => val.toUpperCase());
     * const result = schema.parse('hello'); // 'HELLO'
     *
     * // After optional()/nullable()/nullish(), guard against null/undefined
     * const optionalSchema = s.string().optional().transform(val => val?.toUpperCase());
     * optionalSchema.parse(undefined); // undefined
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

      return this as unknown as SchemaInterface<
        Input,
        ReturnType<typeof callback>
      >;
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
      applyNullishModifier(this, (value) => value === undefined);

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
      applyNullishModifier(this, (value) => value === null);

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
      applyNullishModifier(
        this,
        (value) => value === undefined || value === null,
      );

      return this;
    },
    /**
     * Provides a default value for undefined inputs.
     *
     * @param defaultValue - The default value, or a function that returns
     * the default value. The function receives `{ context }` (from
     * `parseOptions.context`), enabling `value ?? context ?? literal`
     * fallback chains for a single field without a separate primitive:
     * `s.number().default(({ context }) => context?.index ?? 0)` reads the
     * field's context value with a literal fallback, and only runs at all
     * when the field's own input was `undefined`.
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
     *
     * // Reading from parse context, with a literal fallback
     * const orderSchema = s.number().default(({ context }) => context?.index ?? 0);
     * orderSchema.parse(undefined, { context: { index: 2 } }); // 2
     * orderSchema.parse(undefined);                             // 0
     * orderSchema.parse(5, { context: { index: 2 } });          // 5 — input wins
     * ```
     */
    default(defaultValue) {
      hookOriginal(this, '_parse', (originalParse, value, parseOptions) => {
        if (value === undefined) {
          value =
            typeof defaultValue === 'function'
              ? defaultValue({
                  context: (parseOptions as ParseOptions | undefined)?.context,
                })
              : defaultValue;
        }

        return originalParse(
          value,
          parseOptions,
        ) as InternalParseOutput<Output>;
      });

      return this;
    },
    /**
     * Provides a fallback value when parsing fails for any reason.
     * Unlike `default()` which only fires for `undefined` inputs, `catch()` fires
     * on any validation failure and returns the fallback as a successful result.
     *
     * @param catchValue - The fallback value, or a function receiving `{ input, error }` that returns the fallback
     * @returns The schema with catch fallback applied
     *
     * @example
     * ```typescript
     * const schema = s.string().catch('fallback');
     * schema.parse(123);       // 'fallback'
     * schema.parse('hello');   // 'hello'
     *
     * // With function receiving context
     * const schema2 = s.number().catch((ctx) => {
     *   console.warn('Parse failed:', ctx.error.message, 'for input:', ctx.input);
     *   return 0;
     * });
     * ```
     */
    catch(catchValue) {
      hookOriginal(this, '_parse', (originalParse, value, parseOptions) => {
        const item = originalParse(value, parseOptions);

        if (!item.success) {
          return {
            success: true,
            data:
              typeof catchValue === 'function'
                ? (
                    catchValue as (ctx: {
                      input: unknown;
                      error: ErrorStructure;
                    }) => Output
                  )({ input: value, error: (item as Invalid).error })
                : catchValue,
          };
        }

        return item;
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

      return this as unknown as SchemaInterface<
        Input,
        ReturnType<typeof schema.parse>
      >;
    },
    /**
     * Adds custom validation logic to the schema.
     *
     * The validation callback receives the schema's *current* output type at
     * the point `refine()` is called in the chain. If `refine()` is applied
     * after `optional()`, `nullable()`, or `nullish()`, the value can be
     * `undefined` and/or `null` — guard against them in the callback if needed.
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
    refine(validation, { message, type: newType, jsonSchema } = {}) {
      if (newType) {
        message = message || errorMessageFactory(newType);
        type = newType;
      }

      if (jsonSchema) {
        // Reassigned as an own property on `this` (like hookOriginal does
        // for `_parse`) rather than captured in a closure variable, so a
        // clone that diverges from its original (`base.clone().min(3)`)
        // never leaks hints into — or receives them from — its sibling.
        const hints = [...(this._getJsonSchemaHints?.() ?? []), jsonSchema];
        this._getJsonSchemaHints = () => hints;
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
    /**
     * Creates an independent shallow copy of this schema instance.
     *
     * @returns A new schema instance with the same behavior as this one
     *
     * @example
     * ```typescript
     * const base = s.string();
     * const requiredUser = s.object({ name: base.clone() });
     *
     * base.optional();
     * requiredUser.safeParse({}); // { success: false, ... } — unaffected by base's mutation
     * ```
     */
    clone() {
      return { ...this };
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
  if (typeof callback !== 'function') {
    throw new TypeError('extend() requires a function argument');
  }
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

export { s as schema };
