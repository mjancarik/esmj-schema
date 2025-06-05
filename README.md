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

## Comparison with Similar Libraries

When choosing a schema validation library, bundle size can be an important factor, especially for frontend applications where minimizing JavaScript size is critical. Here's how `@esmj/schema` compares to other popular libraries:

| Library         | Bundle Size (minified + gzipped) |
|------------------|---------------------------------|
| `@esmj/schema`   | `~1 KB`                         |
| Superstruct      | ~3.2 KB                         |
| Yup              | ~12.2 KB                        |
| Zod@3            | ~13 KB                          |
| @zod/mini        | ~20,5 KB                        |
| Joi              | ~40,4 KB                        |
| Zod@4            | ~40,8 KB                        |
| Arktype          | ~41,8 KB                        |

### Performance Comparison

#### Schema Creation Performance

| Library         | 1 Schema    | 1,000 Schema     | 1,000,000 Schema     |
|-----------------|-------------|------------------|----------------------|
| `@esmj/schema`  | `0.02 ms`   | 4.93 ms          | `1.13 s`             |
| zod@3           | 0.08 ms     | 9.68 ms          | 8.53 s               |
| @zod/mini       | 0.22 ms     | 39.77 ms         | 34.51 s              |
| Yup             | 0.54 ms     | 14.03 ms         | 12.34 s              |
| Superstruct     | 0.13 ms     | `3.67 ms`        | 1.74 s               |
| Joi             | 0.62 ms     | 31.60 ms         | 23.06 s              |
| ArkType         | 0.37 ms     | 54.60 ms         | Infinity             |

#### Parsing Performance

| Library         | 1 Iteration | 1,000 Iterations | 1,000,000 Iterations |
|-----------------|-------------|------------------|----------------------|
| `@esmj/schema`  | `0.05 ms`   | 0.46 ms          | 267.93 ms            |
| zod@3           | 0.14 ms     | 1.44 ms          | 897.89 ms            |
| @zod/mini       | 0.23 ms     | `0.42 ms`        | `199.08 ms`          |
| Yup             | 0.30 ms     | 9.49 ms          | 8.69 s               |
| Superstruct     | 0.08 ms     | 4.18 ms          | 3.71 s               |
| Joi             | 0.33 ms     | 3.35 ms          | 2.69 s               |
| ArkType         | 0.08 ms     | 0.70 ms          | 576,80 ms            |

#### Error Handling Performance

| Library         | 1 Iteration | 1,000 Iterations | 1,000,000 Iterations |
|-----------------|-------------|------------------|----------------------|
| `@esmj/schema`  | `0.03 ms`   | `0.59 ms`        | `365.32 ms`          |
| zod3            | 0.05 ms     | 2.09 ms          | 1.26 s               |
| @zod/mini       | 0.07 ms     | 0.99 ms          | 545.12 ms            |
| Yup             | 0.27 ms     | 19.28 ms         | 18.87 s              |
| Superstruct     | 0.04 ms     | 8.62 ms          | 6.24 s               |
| Joi             | 0.15 ms     | 4.13 ms          | 2.57 s               |
| ArkType         | 0.07 ms     | 3.78 ms          | 2.87 s               |

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

#### `s.string()`

Creates a string schema.

```typescript
const stringSchema = s.string();
```

#### `s.number()`

Creates a number schema.

```typescript
const numberSchema = s.number();
```

#### `s.boolean()`

Creates a boolean schema.

```typescript
const booleanSchema = s.boolean();
```

#### `s.date()`

Creates a date schema.

```typescript
const dateSchema = s.date();
```

#### `s.object(definition)`

Creates an object schema with the given definition.

```typescript
const objectSchema = s.object({
  key: s.string(),
  value: s.number(),
});
```

#### `s.array(definition)`

Creates an array schema with the given item definition.

```typescript
const arraySchema = s.array(s.string());
```

#### `s.any()`

Creates a schema that accepts any value.

```typescript
const anySchema = s.any();
```

#### `s.enum(values)`

Creates an enum schema that validates against a predefined set of string values.

- **`values`**: An array of strings representing the allowed values for the enum. Each value must be a string.

```typescript
const enumSchema = s.enum(['admin', 'user', 'guest']);

const validResult = enumSchema.parse('admin');
console.log(validResult);
// 'admin'

const invalidResult = enumSchema.safeParse('invalidRole');
console.log(invalidResult.success);
// false
console.log(invalidResult.error.message);
// Error: Invalid enum value. Expected "admin" | "user" | "guest", received "invalidRole".
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

