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
const result = stringSchema.safeParse('hello'); // { success: true, data: 'hello' }
```

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

