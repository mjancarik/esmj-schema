# Schema

This small library provides a simple schema validation system for JavaScript/TypeScript. The library has basic types with opportunity for extending. 

## Installation

```sh
npm install @esmj/schema
```

## Usage

### Basic Usage

```typescript
import { s } from '@esmj/schema';

const schema = s.object({
  username: s.string().optional(),
  password: s.string().default('unknown'),
  account: s.number().default(0),
  address: s.object({
    street: s.string(),
    city: s.string().optional(),
  }).default({ street: 'unknown' }),
  records: s.array(s.object({ name: s.string() })).default([]),
});

const result = schema.parse({
  username: 'john_doe',
  address: { city: 'New York' },
});

console.log(result);
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

### Schema Methods

#### `parse(value)`

Parses the given value according to the schema.

```typescript
const result = stringSchema.parse('hello');
```

#### `safeParse(value)`

Safely parses the given value according to the schema, returning a success or error result.

```typescript
// correct
const result = stringSchema.safeParse('hello'); // { success: true, data: 'hello' };
// bad
const result = stringSchema.safeParse('hello'); // { success: false, error: new Error() };
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

### Extending Schemas

You can extend the schema system with custom logic.

```typescript
import { extend } from '@esmj/schema';

extend((schema, validation, options) => {
  schema.customMethod = () => {
    // Custom logic
  };

  return schema;
});
```

## License

MIT

