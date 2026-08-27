import { type SchemaType, extend } from './index.ts';

export * from './index.ts';

/**
 * JSON Schema draft targets supported by this module.
 *
 * Both drafts produce structurally identical output for this library's
 * keyword set (only the `$schema` URI differs), but "draft-2020-12" and
 * "draft-07" are the two targets strongly recommended by the Standard JSON
 * Schema spec (https://standardschema.dev/json-schema).
 */
export type JsonSchemaTarget = 'draft-07' | 'draft-2020-12';

export interface JsonSchemaOptions {
  readonly target: JsonSchemaTarget | ({} & string);
  readonly libraryOptions?: Record<string, unknown> | undefined;
}

export interface StandardIssue {
  readonly message: string;
  readonly path?: ReadonlyArray<PropertyKey> | undefined;
}

export type StandardResult<Output> =
  | { readonly value: Output; readonly issues?: undefined }
  | { readonly issues: ReadonlyArray<StandardIssue> };

export interface StandardProps<Input = unknown, Output = Input> {
  readonly version: 1;
  readonly vendor: 'esmj-schema';
  readonly types?: { readonly input: Input; readonly output: Output };
  readonly validate: (
    value: unknown,
    options?: { readonly libraryOptions?: Record<string, unknown> },
  ) => StandardResult<Output>;
  readonly jsonSchema: {
    readonly input: (options: JsonSchemaOptions) => Record<string, unknown>;
    readonly output: (options: JsonSchemaOptions) => Record<string, unknown>;
  };
}

declare module './index.ts' {
  interface SchemaInterface<Input, Output> {
    /**
     * Standard Schema (https://standardschema.dev) + Standard JSON Schema
     * (https://standardschema.dev/json-schema) compatible properties.
     * Only present when `@esmj/schema/standard` (or `@esmj/schema/full`) has
     * been imported.
     */
    readonly '~standard'?: StandardProps<Input, Output>;
  }
}

// ---------------------------------------------------------------------------
// Internal per-instance fragment accumulated by wrapping modifier methods
// below (optional/nullable/nullish/default/pipe/transform — the handful of
// core methods that aren't per-type constraints). Stored as a plain own
// property so it naturally survives `clone()`'s shallow `{ ...this }` copy,
// and is always *reassigned* (never mutated in place) so two clones that
// diverge (`base.clone().min(3)` vs. `base.clone().max(1)`) never leak state
// into each other.
//
// Type-specific constraint keywords (minLength, minimum, pattern, etc.) are
// NOT tracked here — they're contributed generically by any `refine()` call
// that passes a `jsonSchema` option (see `_getJsonSchemaHints()` in
// index.ts) and merged in by `mergeHints()` below, so this module never
// needs to know the name of any individual constraint method.
// ---------------------------------------------------------------------------
interface JsonSchemaFragment {
  optional?: boolean;
  nullable?: boolean;
  hasDefault?: boolean;
  defaultValue?: unknown;
  pipeTarget?: SchemaType;
  unexplainedTransform?: boolean;
  outputHint?: Record<string, unknown>;
}

type MutableSchema = {
  _jsonSchemaFragment?: JsonSchemaFragment;
  '~standard'?: StandardProps;
} & Record<string, unknown>;

const DRAFT_SCHEMA_URI: Record<string, string> = {
  'draft-07': 'http://json-schema.org/draft-07/schema#',
  'draft-2020-12': 'https://json-schema.org/draft/2020-12/schema',
};

// Keys that accumulate to the tightest (largest) lower bound across repeated
// constraint calls (e.g. `.min(3).min(5)` should keep 5).
const LOWER_BOUND_KEYS = new Set([
  'minLength',
  'minimum',
  'minItems',
  'exclusiveMinimum',
]);
// Keys that accumulate to the tightest (smallest) upper bound across
// repeated constraint calls (e.g. `.max(10).max(5)` should keep 5).
const UPPER_BOUND_KEYS = new Set([
  'maxLength',
  'maximum',
  'maxItems',
  'exclusiveMaximum',
]);

function getFragment(schema: SchemaType): JsonSchemaFragment {
  return (schema as unknown as MutableSchema)._jsonSchemaFragment ?? {};
}

function buildStandard(schema: SchemaType): StandardProps {
  return {
    version: 1,
    vendor: 'esmj-schema',
    validate(value: unknown): StandardResult<unknown> {
      const result = schema.safeParse(value as never);

      if (result.success) {
        return { value: result.data };
      }

      const errors = result.errors?.length ? result.errors : [result.error];

      return {
        issues: errors.map((error) => ({
          message: error.message,
          path: error.cause?.key ? error.cause.key.split('.') : undefined,
        })),
      };
    },
    jsonSchema: {
      input: (options: JsonSchemaOptions) =>
        buildJsonSchema(schema, options, 'input'),
      output: (options: JsonSchemaOptions) =>
        buildJsonSchema(schema, options, 'output'),
    },
  };
}

function setFragment(
  schema: SchemaType,
  updater: (fragment: JsonSchemaFragment) => JsonSchemaFragment,
): void {
  const target = schema as unknown as MutableSchema;
  target._jsonSchemaFragment = updater(target._jsonSchemaFragment ?? {});
  target['~standard'] = buildStandard(schema);
}

function initStandard(schema: SchemaType): void {
  const target = schema as unknown as MutableSchema;
  target._jsonSchemaFragment = {};
  target['~standard'] = buildStandard(schema);
}

function wrapMethod(
  schema: SchemaType,
  method: string,
  updater: (
    fragment: JsonSchemaFragment,
    args: unknown[],
  ) => JsonSchemaFragment,
): void {
  const target = schema as unknown as MutableSchema;
  const original = target[method];

  if (typeof original !== 'function') return;

  target[method] = function (this: SchemaType, ...args: unknown[]) {
    const result = (original as (...a: unknown[]) => unknown).apply(this, args);
    setFragment(this, (fragment) => updater(fragment, args));
    return result;
  };
}

function wrapTransform(schema: SchemaType): void {
  const target = schema as unknown as MutableSchema;
  const original = target.transform;

  if (typeof original !== 'function') return;

  target.transform = function (this: SchemaType, ...args: unknown[]) {
    const result = (original as (...a: unknown[]) => unknown).apply(this, args);
    const options = args[1] as
      | { jsonSchema?: Record<string, unknown> | null }
      | undefined;
    // Normalizes both "no options passed" and "options passed but
    // `jsonSchema` explicitly `undefined`" (e.g. from a wrapper computing
    // the hint dynamically) to the same "unknown shape" outcome, so neither
    // case is silently mistaken for `{ jsonSchema: null }`'s
    // shape-preserving meaning.
    const hint = options?.jsonSchema;

    setFragment(this, (fragment) => {
      // Shape impact is unknown: no options, or `jsonSchema` omitted/undefined.
      if (hint === undefined) {
        return { ...fragment, unexplainedTransform: true };
      }

      // `{ jsonSchema: null }`: explicitly declared shape-preserving (used
      // internally by helpers like string's `trim()`/array's `sort()`) — no
      // change to the accumulated shape/hint.
      if (hint === null) {
        return fragment;
      }

      // `{ jsonSchema: {...} }`: explicit replacement for the output shape.
      return {
        ...fragment,
        unexplainedTransform: false,
        outputHint: hint,
      };
    });

    return result;
  };
}

// `refine()` is where `_getJsonSchemaHints()` gets (re)assigned (by core, for
// any constraint method — built-in like min()/max() or added via a
// third-party extend()). Wrapping this single generic method — instead of
// every constraint method by name — refreshes `~standard` so it's bound to
// `this` (the actual clone the hint was just recorded on) rather than
// whatever instance `~standard` was inherited from via `clone()`'s shallow
// copy. The updater is a no-op (the fragment itself doesn't change here);
// only the `setFragment()` side effect of rebuilding `~standard` matters.
function wrapRefine(schema: SchemaType): void {
  wrapMethod(schema, 'refine', (fragment) => fragment);
}

// Generically merges the JSON Schema keyword fragments accumulated by
// `refine()` calls (via `_getJsonSchemaHints()`) into a base shape, without
// needing to know which constraint method produced each fragment:
//  - `pattern`: a single hint sets it directly; multiple hints (e.g.
//    `startsWith()` + `endsWith()`) combine via `allOf`.
//  - lower/upper bound keywords (`minLength`/`minimum`/`minItems` and
//    `maxLength`/`maximum`/`maxItems`): repeated hints keep the strictest
//    (largest lower bound / smallest upper bound).
//  - everything else: the most recently accumulated hint wins.
function mergeHints(
  base: Record<string, unknown>,
  hints: ReadonlyArray<Record<string, unknown>>,
): Record<string, unknown> {
  const result = { ...base };
  const patterns: string[] = [];

  for (const hint of hints) {
    for (const key in hint) {
      const value = hint[key];

      if (key === 'pattern') {
        patterns.push(value as string);
        continue;
      }

      if (LOWER_BOUND_KEYS.has(key)) {
        const current = result[key] as number | undefined;
        result[key] =
          current === undefined
            ? (value as number)
            : Math.max(current, value as number);
        continue;
      }

      if (UPPER_BOUND_KEYS.has(key)) {
        const current = result[key] as number | undefined;
        result[key] =
          current === undefined
            ? (value as number)
            : Math.min(current, value as number);
        continue;
      }

      result[key] = value;
    }
  }

  if (patterns.length === 1) {
    result.pattern = patterns[0];
  } else if (patterns.length > 1) {
    result.allOf = patterns.map((pattern) => ({ pattern }));
  }

  return result;
}

// ---------------------------------------------------------------------------
// JSON Schema conversion
// ---------------------------------------------------------------------------

function baseKeywords(
  schema: SchemaType,
  options: JsonSchemaOptions,
  mode: 'input' | 'output',
): Record<string, unknown> {
  const type = schema._getType();

  switch (type) {
    case 'string':
      return { type: 'string' };
    case 'number':
      return { type: 'number' };
    case 'boolean':
      return { type: 'boolean' };
    case 'date':
      return { type: 'string', format: 'date-time' };
    case 'any':
      return {};
    case 'literal':
      return { const: schema._getDefinition?.() };
    case 'enum':
      return {
        type: 'string',
        enum: [...(schema._getDefinition?.() as ReadonlyArray<string>)],
      };
    case 'union':
      return {
        anyOf: (schema._getDefinition?.() as SchemaType[]).map((branch) =>
          convert(branch, options, mode),
        ),
      };
    case 'array':
      return {
        type: 'array',
        items: convert(schema._getDefinition?.() as SchemaType, options, mode),
      };
    case 'object': {
      const definition = schema._getDefinition?.() as Record<
        string,
        SchemaType
      >;
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const key in definition) {
        const fieldSchema = definition[key];
        properties[key] = convert(fieldSchema, options, mode);

        if (!getFragment(fieldSchema).optional) {
          required.push(key);
        }
      }

      const result: Record<string, unknown> = {
        type: 'object',
        properties,
        additionalProperties: false,
      };

      if (required.length > 0) {
        result.required = required;
      }

      return result;
    }
    default:
      throw new Error(
        `Cannot convert schema of type "${type}" to JSON Schema.`,
      );
  }
}

function applyModifiers(
  base: Record<string, unknown>,
  fragment: JsonSchemaFragment,
): Record<string, unknown> {
  let result = base;

  if (fragment.nullable) {
    if (typeof result.type === 'string') {
      result = { ...result, type: [result.type, 'null'] };
    } else if (Array.isArray(result.type)) {
      result = { ...result, type: [...result.type, 'null'] };
    } else {
      result = { anyOf: [result, { type: 'null' }] };
    }
  }

  if (fragment.hasDefault) {
    result = { ...result, default: fragment.defaultValue };
  }

  return result;
}

function convert(
  schema: SchemaType,
  options: JsonSchemaOptions,
  mode: 'input' | 'output',
): Record<string, unknown> {
  const fragment = getFragment(schema);

  if (mode === 'output' && fragment.pipeTarget) {
    return applyModifiers(
      convert(fragment.pipeTarget, options, 'output'),
      fragment,
    );
  }

  if (
    mode === 'output' &&
    fragment.unexplainedTransform &&
    !fragment.outputHint
  ) {
    throw new Error(
      `Cannot convert to JSON Schema: schema uses transform() with a \
callback whose output shape this library cannot infer automatically. \
Pass an explicit hint via \`.transform(fn, { jsonSchema: {...} })\`, mark \
it as shape-preserving via \`.transform(fn, { jsonSchema: null })\` (like \
string's built-in trim()/toLowerCase() or array's sort()/reverse() do), \
pipe() into another schema describing the final shape, or call \
\`.jsonSchema.input()\` instead (unaffected by transform()).`,
    );
  }

  const shape =
    mode === 'output' && fragment.outputHint
      ? fragment.outputHint
      : mergeHints(
          baseKeywords(schema, options, mode),
          schema._getJsonSchemaHints?.() ?? [],
        );

  return applyModifiers(shape, fragment);
}

function buildJsonSchema(
  schema: SchemaType,
  options: JsonSchemaOptions,
  mode: 'input' | 'output',
): Record<string, unknown> {
  const schemaUri = DRAFT_SCHEMA_URI[options.target];

  if (!schemaUri) {
    throw new Error(
      `Unsupported JSON Schema target "${options.target}". Supported targets: "draft-07", "draft-2020-12".`,
    );
  }

  return { $schema: schemaUri, ...convert(schema, options, mode) };
}

extend((schema: SchemaType) => {
  initStandard(schema);

  wrapMethod(schema, 'optional', (fragment) => ({
    ...fragment,
    optional: true,
  }));
  wrapMethod(schema, 'nullable', (fragment) => ({
    ...fragment,
    nullable: true,
  }));
  wrapMethod(schema, 'nullish', (fragment) => ({
    ...fragment,
    optional: true,
    nullable: true,
  }));
  wrapMethod(schema, 'default', (fragment, args) => {
    const value = args[0];

    return typeof value === 'function'
      ? fragment
      : { ...fragment, hasDefault: true, defaultValue: value };
  });
  wrapMethod(schema, 'pipe', (fragment, args) => ({
    ...fragment,
    pipeTarget: args[0] as SchemaType,
  }));
  wrapTransform(schema);
  wrapRefine(schema);

  return schema;
});
