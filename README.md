# Schema

This small library provides a simple schema validation system for JavaScript/TypeScript. The library has basic types with opportunities for extending. 

## Installation

```sh
npm install @esmj/schema
```

## Why Use `@esmj/schema`?

`@esmj/schema` is a lightweight and flexible schema validation library designed for developers who need a simple yet powerful way to validate and transform data. Here are some reasons to choose this package:

1. **TypeScript First**: Built with TypeScript in mind, it provides strong type inference and ensures type safety throughout your codebase.
2. **Extensibility**: Easily extend the library with custom logic using the `extend` function.
3. **Rich Features**: Includes advanced features like preprocessing, transformations, piping, and refinements, which are not always available in similar libraries.
4. **Lightweight**: None dependencies and a small footprint make it ideal for projects where performance and simplicity are key.
5. **Customizable**: Offers fine-grained control over validation and error handling.
6. **Performance**: `@esmj/schema` is optimized for speed, making it one of the fastest schema validation libraries available. Whether you're creating schemas, parsing data, or handling errors, `@esmj/schema` consistently outperforms many popular alternatives. Its minimalistic design ensures low overhead, even in high-performance applications.

### Performance Highlights

- **Schema Creation**: Create schemas at up to 4 370 618 ops/s (0.23 μs latency) with @sinclair/typebox, or 736 810 ops/s (1.36 μs latency) with @esmj/schema. Superstruct and @esmj/schema are also among the fastest for schema creation.
- **Parsing**: Parse data at up to 4 627 714 ops/s (0.22 μs latency) with @zod/mini (note: @zod/mini was observed to consume 200% CPU, while other libraries used only 100% CPU), or 3 142 587 ops/s (0.32 μs latency) with @esmj/schema. ArkType and effect/Schema also show strong parsing throughput.
- **Error Handling**: Efficiently manage errors at up to 2 428 049 ops/s (0.41 μs latency) with @esmj/schema, or 1 386 616 ops/s (0.72 μs latency) with @zod/mini.

These performance metrics make `@esmj/schema` an excellent choice for both frontend and backend applications where speed and efficiency are critical.

## Comparison with Similar Libraries

When choosing a schema validation library, bundle size can be an important factor, especially for frontend applications where minimizing JavaScript size is critical. Here's how `@esmj/schema` compares to other popular libraries:

| Library           | Bundle Size (minified + gzipped) |
|-------------------|---------------------------------|
| `@esmj/schema`    | `~1,2 KB`                       |
| Superstruct       | ~3.2 KB                         |
| @sinclair/typebox | ~11.7 KB                        |
| Yup               | ~12.2 KB                        |
| Zod@3             | ~13 KB                          |
| @zod/mini         | ~20,5 KB                        |
| Joi               | ~40,4 KB                        |
| Zod@4             | ~40,8 KB                        |
| ArkType           | ~41,8 KB                        |
| Effect/Schema     | ~115.5 KB                       |

### Performance Comparison

*All benchmarks were measured on Node.js v24.1.0.*

#### Schema Creation Performance

| Library           | Throughput average (ops/s)      | Latency average (μs)      |
|-------------------|-------------------------------:|-------------------------:|
| @esmj/schema      | 736 810.12 ± 3.03%            | 1.36 ± 3.24%            |
| Zod@3             | 112 575.50 ± 0.86%            | 8.88 ± 0.87%            |
| @zod/mini         | 23 456.07 ± 1.26%             | 42.64 ± 1.28%           |
| Yup               | 75 051.06 ± 4.38%             | 13.36 ± 4.41%           |
| Superstruct       | 509 401.06 ± 0.80%            | 1.96 ± 0.80%            |
| Joi               | 42 455.28 ± 1.27%             | 23.56 ± 1.30%           |
| `@sinclair/typebox` | `4 370 618.49 ± 1.23%`      | `0.23 ± 1.23%`          |
| ArkType           | 16 282.69 ± 4.14%             | 61.61 ± 4.38%           |
| effect/Schema     | 24 919.15 ± 4.31%             | 40.31 ± 4.78%           |

#### Parsing Performance

| Library           | Throughput average (ops/s)      | Latency average (μs)      |
|-------------------|-------------------------------:|-------------------------:|
| @esmj/schema      | 3 142 587.31 ± 0.97%          | 0.32 ± 0.99%            |
| zod@3             | 1 018 777.24 ± 0.64%          | 0.98 ± 0.65%            |
| `@zod/mini`       | `4 627 714.90 ± 2.23%`        | `0.22 ± 2.36%`          |
| Yup               | 108 361.49 ± 0.50%            | 9.23 ± 0.51%            |
| Superstruct       | 252 904.42 ± 2.20%            | 3.96 ± 2.44%            |
| Joi               | 346 094.49 ± 0.65%            | 2.89 ± 0.65%            |
| @sinclair/typebox | 228 711.62 ± 2.03%            | 4.38 ± 2.23%            |
| ArkType           | 1 677 066.00 ± 0.58%          | 0.60 ± 0.59%            |
| effect/Schema     | 1 060 056.14 ± 0.61%          | 0.94 ± 0.61%            |

#### Error Handling Performance

| Library           | Throughput average (ops/s)      | Latency average (μs)      |
|-------------------|-------------------------------:|-------------------------:|
| `@esmj/schema`    | `2 428 049.34 ± 0.54%`        | `0.41 ± 0.53%`          |
| zod@3             | 641 504.22 ± 3.67%            | 1.57 ± 4.38%            |
| @zod/mini         | 1 386 616.61 ± 0.60%          | 0.72 ± 0.60%            |
| Yup               | 98 904.30 ± 0.61%             | 10.11 ± 0.61%           |
| Superstruct       | 122 782.09 ± 1.03%            | 8.15 ± 1.03%            |
| Joi               | 271 301.11 ± 1.58%            | 3.69 ± 1.59%            |
| @sinclair/typebox | 228 734.49 ± 0.55%            | 4.37 ± 0.56%            |
| ArkType           | 258 685.33 ± 1.23%            | 3.87 ± 1.23%            |
| effect/Schema     | 165 753.69 ± 0.99%            | 6.03 ± 1.00%            |

**Note:** During the performance tests, `@zod/mini` was observed to consume 200% CPU, while other libraries used only 100% CPU. This may affect the interpretation of the results, especially in multi-threaded environments.

## Usage

### Basic Usage

```typescript
import { s, type Infer} from '@esmj/schema';

const schema = s.object({
  username: s.string().optional().refine((val) => val.length <= 255, {
    message: "Username can't be more than 255 characters",
  }),
  password: s.string().default('unknown'),
  birthday: s.preprocess((value) => new Date(value), s.date()),
  account: s.string().default('0').transform((value) => Number.parseInt(value)).pipe(s.number()),
  money: s.number(),
  address: s.object({
    street: s.string(),
    city: s.string().optional(),
  }).default({ street: 'unknown' }),
  records: s.array(s.object({ name: s.string() })).default([]),
});

type schemaType = Infer<typeof schema>;

const result = schema.parse({
  username: 'john_doe',
  birthday: '2000-01-01T23:59:59.000Z',
  address: { city: 'New York' },
  money: 100,
});

console.log(result);
// {
//   username: 'john_doe',
//   password: 'unknown',
//   birthday: Date('2000-01-01T23:59:59.000Z'),
//   account: 0,
//   money: 100,
//   address: {
//     street: 'unknown',
//     city: 'New York',
//   },
//   records: [],
// }
```

### Schema Types

#### `s.string(options?)`

Creates a string schema. You can optionally pass `options` to customize error messages.

- **`message`**: Can be either a constant string or a function `(value) => string`.

```typescript
const stringSchema = s.string({
  message: 'This is a constant error message.',
});

const stringSchemaFunc = s.string({
  message: (value) => `Custom error: "${value}" is not a valid string.`,
});
```

#### `s.number(options?)`

Creates a number schema. You can optionally pass `options` to customize error messages.

- **`message`**: Can be either a constant string or a function `(value) => string`.

```typescript
const numberSchema = s.number({
  message: 'This is a constant error message.',
});

const numberSchemaFunc = s.number({
  message: (value) => `Custom error: "${value}" is not a valid number.`,
});
```

#### `s.boolean(options?)`

Creates a boolean schema. You can optionally pass `options` to customize error messages.

- **`message`**: Can be either a constant string or a function `(value) => string`.

```typescript
const booleanSchema = s.boolean({
  message: 'This is a constant error message.',
});

const booleanSchemaFunc = s.boolean({
  message: (value) => `Custom error: "${value}" is not a valid boolean.`,
});
```

#### `s.date(options?)`

Creates a date schema. You can optionally pass `options` to customize error messages.

- **`message`**: Can be either a constant string or a function `(value) => string`.

```typescript
const dateSchema = s.date({
  message: 'This is a constant error message.',
});

const dateSchemaFunc = s.date({
  message: (value) => `Custom error: "${value}" is not a valid date.`,
});
```

#### `s.object(definition, options?)`

Creates an object schema with the given definition. You can optionally pass `options` to customize error messages.

- **`message`**: Can be either a constant string or a function `(value) => string`.

```typescript
const objectSchema = s.object(
  {
    key: s.string(),
    value: s.number(),
  },
  {
    message: 'This is a constant error message.',
  },
);

const objectSchemaFunc = s.object(
  {
    key: s.string(),
    value: s.number(),
  },
  {
    message: (value) => `Custom error: "${JSON.stringify(value)}" is not a valid object.`,
  },
);
```

#### `s.array(definition, options?)`

Creates an array schema with the given item definition. You can optionally pass `options` to customize error messages.

- **`message`**: Can be either a constant string or a function `(value) => string`.

```typescript
const arraySchema = s.array(s.string(), {
  message: 'This is a constant error message.',
});

const arraySchemaFunc = s.array(s.string(), {
  message: (value) => `Custom error: "${JSON.stringify(value)}" is not a valid array.`,
});
```

#### `s.enum(values, options?)`

Creates an enum schema that validates against a predefined set of string values. You can optionally pass `options` to customize error messages.

- **`message`**: Can be either a constant string or a function `(value) => string`.

```typescript
const enumSchema = s.enum(['admin', 'user', 'guest'], {
  message: 'This is a constant error message.',
});

const enumSchemaFunc = s.enum(['admin', 'user', 'guest'], {
  message: (value) => `Custom error: "${value}" is not a valid enum value.`,
});
```

#### `s.union(definitions, options?)`

Creates a schema that validates against multiple schemas (a union of schemas). The value must match at least one of the provided schemas. You can optionally pass `options` to customize error messages.

- **`message`**: Can be either a constant string or a function `(value) => string`.

```typescript
const schema = s.union([
  s.string(),
  s.number(),
  s.boolean(),
], {
  message: 'This is a constant error message.',
});

const schemaFunc = s.union([
  s.string(),
  s.number(),
  s.boolean(),
], {
  message: (value) => `Custom error: "${value}" does not match any of the union schemas.`,
});
```

#### `s.any()`

Creates a schema that accepts any value.

```typescript
const anySchema = s.any();
```

#### `s.preprocess(callback, schema)`

Creates a schema that preprocesses the input value using the provided callback before validating it with the given schema.

```typescript
const preprocessSchema = s.preprocess((value) => new Date(value), s.date());
```

### Schema Methods

#### `parse(value)`

Parses the given value according to the schema.

```typescript
const result = stringSchema.parse('hello');
```

#### `safeParse(value)`

Safely parses the given value according to the schema, returning a success or error result.

```typescript
const result = stringSchema.safeParse('hello'); 
// { success: true, data: 'hello' }

const errorResult = stringSchema.safeParse(123); 
// { success: false, error: { message: 'The value "123" must be type of string but is type of "number".' } }
```

**Note:** The `error` returned by `safeParse` is not a native `Error` instance. Instead, it is a plain object with the following structure:

```typescript
type ErrorStructure = {
  message: string;
  cause?: {
    key?: string;
  };
};
```

This allows for easier serialization and debugging but may require additional handling if you expect a native `Error` instance.

#### `optional()`

Makes the schema optional.

```typescript
const optionalSchema = stringSchema.optional();
```

#### `nullable()`

Makes the schema nullable.

```typescript
const nullableSchema = stringSchema.nullable();
```

#### `nullish()`

Makes the schema nullish (nullable and optional).

```typescript
const nullishSchema = stringSchema.nullish();
```

#### `default(defaultValue)`

Sets a default value for the schema.

```typescript
const defaultSchema = stringSchema.default('default value');
```

#### `transform(callback)`

Transforms the parsed value using the provided callback.

```typescript
const transformedSchema = s.string().transform((value) => value.toUpperCase());
```

#### `pipe(schema)`

Pipes the output of one schema into another schema for further validation or transformation.

```typescript
const pipedSchema = s.string().pipe(s.number());
```

#### `refine(validation, { message })`

Adds a refinement to the schema with a custom validation function and error message.

```typescript
const refinedSchema = s.string().refine((val) => val.length <= 255, {
  message: "String can't be more than 255 characters",
});
```

### Extending Schemas

You can extend the schema system with custom logic.

```typescript
import { extend, type StringSchemaInterface } from '@esmj/schema';

interface StringSchemaInterface {
  customMethod(value: string): string {}
}

extend((schema, validation, options) => {
  schema.customMethod = (value) => {
    // Custom logic

    return value;
  };

  return schema;
});
```

### More Examples

#### Nested Objects

You can define schemas for deeply nested objects.

```typescript
const nestedSchema = s.object({
  user: s.object({
    id: s.number(),
    profile: s.object({
      name: s.string(),
      age: s.number().optional(),
    }),
  }),
});

const result = nestedSchema.parse({
  user: {
    id: 1,
    profile: {
      name: 'John Doe',
    },
  },
});

console.log(result);
// {
//   user: {
//     id: 1,
//     profile: {
//       name: 'John Doe',
//     },
//   },
// }
```

#### Arrays with Validation

You can validate arrays with specific item schemas.

```typescript
const arraySchema = s.array(s.object({ id: s.number(), name: s.string() }));

const result = arraySchema.parse([
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' },
]);

console.log(result);
// [
//   { id: 1, name: 'Item 1' },
//   { id: 2, name: 'Item 2' },
// ]
```

#### Preprocessing Values

Use `s.preprocess` to transform input values before validation.

```typescript
const preprocessSchema = s.preprocess(
  (value) => value.trim(),
  s.string().refine((val) => val.length > 0, { message: 'String cannot be empty' }),
);

const result = preprocessSchema.parse('   hello   ');

console.log(result);
// 'hello'
```

#### Transforming Values

Use `transform` to modify the parsed value.

```typescript
const transformSchema = s.string().transform((value) => value.toUpperCase());

const result = transformSchema.parse('hello');

console.log(result);
// 'HELLO'
```

#### Piping Schemas

Pipe the output of one schema into another for further validation or transformation.

```typescript
const pipedSchema = s.string()
  .transform((value) => Number.parseInt(value))
  .pipe(s.number().refine((val) => val > 0, { message: 'Number must be positive' }));

const result = pipedSchema.parse('42');

console.log(result);
// 42
```

#### Refining Values

Add custom validation logic with `refine`.

```typescript
const refinedSchema = s.string().refine((val) => val.startsWith('A'), {
  message: 'String must start with "A"',
});

const result = refinedSchema.parse('Apple');

console.log(result);
// 'Apple'
```

#### Default Values

Set default values for optional fields.

```typescript
const defaultSchema = s.object({
  name: s.string().default('Anonymous'),
  age: s.number().optional().default(18),
});

const result = defaultSchema.parse({});

console.log(result);
// { name: 'Anonymous', age: 18 }
```

#### Safe Parsing

Use `safeParse` to handle errors gracefully.

```typescript
const safeSchema = s.number();

const result = safeSchema.safeParse('not a number');

if (!result.success) {
  console.error(result.error.message);
} else {
  console.log(result.data);
}
// Error: The value "not a number" must be type of number but is type of "string".
```

#### Combining Multiple Features

Combine multiple features like preprocessing, transformations, and refinements.

```typescript
const combinedSchema = s.preprocess(
  (value) => value.trim(),
  s.string()
    .transform((value) => value.toUpperCase())
    .refine((val) => val.length <= 10, { message: 'String must be at most 10 characters' }),
);

const result = combinedSchema.parse('   hello   ');

console.log(result);
// 'HELLO'
```

## License

MIT

