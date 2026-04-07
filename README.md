# Schema

This small library provides a simple schema validation system for JavaScript/TypeScript. The library has basic types with opportunities for extending.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Why Use @esmj/schema?](#why-use-esmjschema)
- [Comparison with Similar Libraries](#comparison-with-similar-libraries)
- [Usage](#usage)
  - [Basic Usage](#basic-usage)
- [Modular Extensions](#modular-extensions)
  - [String Extensions](#string-extensions-esmjschemastring)
  - [Number Extensions](#number-extensions-esmjschemanumber)
  - [Array Extensions](#array-extensions-esmjschemaarray)
  - [Full Extensions](#full-extensions-esmjschemafull)
  - [Named Exports & Tree-Shaking](#named-exports--tree-shaking)
- [API Reference Summary](#api-reference-summary)
- [Schema Types](#schema-types)
  - [s.coerce](#scoerce)
  - [s.cast](#scast)
- [Schema Methods](#schema-methods)
  - [parse](#parsevalue-parseoptions)
  - [safeParse](#safeparsevalue-parseoptions)
  - [Error Collection with abortEarly](#error-collection-with-abortearly-option)
- [Extending Schemas](#extending-schemas)
- [More Examples](#more-examples)
- [Examples Folder](#examples-folder)
- [Migration Guide](#migration-guide)
  - [From Zod](#from-zod)
  - [From Yup](#from-yup)
- [License](#license)

## Installation

```sh
npm install @esmj/schema
```

## Quick Start

Get started with `@esmj/schema` in seconds:

```typescript
import { s } from '@esmj/schema';

// Define a schema
const userSchema = s.object({
  name: s.string(),
  age: s.number(),
  email: s.string().optional()
});

// Parse data
const user = userSchema.parse({
  name: 'John Doe',
  age: 30
});

console.log(user);
// { name: 'John Doe', age: 30 }

// Safe parse with error handling
const result = userSchema.safeParse({
  name: 'Jane',
  age: 'invalid'
});

if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error.message);
}
```

**With Extensions:**

```typescript
import { s } from '@esmj/schema/full';

const schema = s.object({
  username: s.string().trim().toLowerCase().min(3).max(20),
  age: s.number().int().positive().min(18),
  tags: s.array(s.string()).min(1).unique()
});

const result = schema.parse({
  username: '  JohnDoe  ',
  age: 25,
  tags: ['developer', 'typescript']
});
// { username: 'johndoe', age: 25, tags: ['developer', 'typescript'] }
```

## Why Use `@esmj/schema`?

`@esmj/schema` is a lightweight and flexible schema validation library designed for developers who need a simple yet powerful way to validate and transform data. Here are some reasons to choose this package:

1. **TypeScript First**: Built with TypeScript in mind, it provides strong type inference—even for deeply nested and complex schemas.
2. **Extensibility**: Easily extend the library with custom logic, refinements, and preprocessors using the `extend` function.
3. **Rich Features**: Includes advanced features like preprocessing, transformations, piping, refinements, and robust error collection (`abortEarly`), which are not always available in similar libraries.
4. **Actionable Error Handling**: Collect all validation errors at once for better debugging and user experience, with clear and consistent error structures.
5. **Lightweight**: No dependencies and a small footprint make it ideal for projects where performance and simplicity are key.
6. **Customizable**: Offers fine-grained control over validation, error handling, and schema composition.
7. **Performance**: Optimized for speed, making it one of the fastest schema validation libraries available.
8. **Modular**: Import only what you need with separate string, number, and array extension modules to minimize bundle size.

### Performance Highlights

- **Schema Creation**: Create schemas at up to 4,370,618 ops/s (0.23 μs latency) with @sinclair/typebox, or 736,810 ops/s (1.36 μs latency) with @esmj/schema. Superstruct is also competitive for schema creation performance.
- **Parsing**: Parse data at up to **33,620,146 ops/s** (**0.03 μs** latency) with **AJV** (best result in this benchmark). For comparison, `@zod/mini` reached **4,627,714 ops/s** (**0.22 μs**, observed at 200% CPU), and `@esmj/schema` reached **3,142,587 ops/s** (**0.32 μs**), with ArkType and effect/Schema also performing strongly.
- **Error Handling**: Handle validation errors at up to **19,693,821 ops/s** (**0.05 μs** latency) with **AJV** (best result in this benchmark), while `@esmj/schema` delivered **2,428,049 ops/s** (**0.41 μs**) with a developer-friendly API.

Across the benchmark tables, `@esmj/schema` shows strong all-around results: fast schema creation, very competitive parsing and error-handling throughput, and a very small bundle size (`~1.6 KB` core).

For most TypeScript applications, it offers a practical balance of performance, size, and developer ergonomics. If absolute peak throughput in a single category is the only goal, some specialized options (for example, AJV or TypeBox in specific tests) can be faster.

## Comparison with Similar Libraries

When choosing a schema validation library, bundle size can be an important factor, especially for frontend applications where minimizing JavaScript size is critical. Here's how `@esmj/schema` compares to other popular libraries:

| Library           | Bundle Size (minified + gzipped) |
|-------------------|---------------------------------|
| `@esmj/schema`    | `~1.6 KB`                       |
| Superstruct       | ~3.2 KB                         |
| @sinclair/typebox | ~11.7 KB                        |
| Yup               | ~12.2 KB                        |
| Zod@3             | ~13 KB                          |
| @zod/mini         | ~20.5 KB                        |
| AJV               | ~31.4 KB                        |
| Joi               | ~40.4 KB                        |
| Zod@4             | ~40.8 KB                        |
| ArkType           | ~41.8 KB                        |
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
| AJV               | 240.32 ± 4.67%                | 4 164.31 ± 2.04%        |

#### Parsing Performance

| Library           | Throughput average (ops/s)      | Latency average (μs)      |
|-------------------|-------------------------------:|-------------------------:|
| @esmj/schema      | 3 142 587.31 ± 0.97%          | 0.32 ± 0.99%            |
| zod@3             | 1 018 777.24 ± 0.64%          | 0.98 ± 0.65%            |
| @zod/mini.        | 4 627 714.90 ± 2.23%          | 0.22 ± 2.36%            |
| Yup               | 108 361.49 ± 0.50%            | 9.23 ± 0.51%            |
| Superstruct       | 252 904.42 ± 2.20%            | 3.96 ± 2.44%            |
| Joi               | 346 094.49 ± 0.65%            | 2.89 ± 0.65%            |
| @sinclair/typebox | 228 711.62 ± 2.03%            | 4.38 ± 2.23%            |
| ArkType           | 1 677 066.00 ± 0.58%          | 0.60 ± 0.59%            |
| effect/Schema     | 1 060 056.14 ± 0.61%          | 0.94 ± 0.61%            |
| `AJV`             | `33 620 146.24 ± 1.19%`       | `0.03 ± 1.26%`          |

#### Error Handling Performance

| Library           | Throughput average (ops/s)      | Latency average (μs)      |
|-------------------|-------------------------------:|-------------------------:|
| @esmj/schema      | 2 428 049.34 ± 0.54%          | 0.41 ± 0.53%            |
| zod@3             | 641 504.22 ± 3.67%            | 1.57 ± 4.38%            |
| @zod/mini         | 1 386 616.61 ± 0.60%          | 0.72 ± 0.60%            |
| Yup               | 98 904.30 ± 0.61%             | 10.11 ± 0.61%           |
| Superstruct       | 122 782.09 ± 1.03%            | 8.15 ± 1.03%            |
| Joi               | 271 301.11 ± 1.58%            | 3.69 ± 1.59%            |
| @sinclair/typebox | 228 734.49 ± 0.55%            | 4.37 ± 0.56%            |
| ArkType           | 258 685.33 ± 1.23%            | 3.87 ± 1.23%            |
| effect/Schema     | 165 753.69 ± 0.99%            | 6.03 ± 1.00%            |
| `AJV`             | `19 693 821.79 ± 1.81%`       | `0.05 ± 1.83%`          |

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

## Modular Extensions

`@esmj/schema` provides modular extensions that can be imported individually or all together, allowing you to include only the validation helpers you need.

### Import Options

```typescript
// Minimal version (core only, ~1.5 KB)
import { s } from '@esmj/schema';

// Full version (all extensions included, ~4 KB)
import { s } from '@esmj/schema/full';

// String extensions only
import { s } from '@esmj/schema/string';

// Number extensions only
import { s } from '@esmj/schema/number';

// Array extensions only
import { s } from '@esmj/schema/array';

// Mix and match (side-effect imports)
import '@esmj/schema/string';
import '@esmj/schema/number';
import { s } from '@esmj/schema';

// Tree-shakeable named exports — bundle only what you use
import { string, number, object, array } from '@esmj/schema';
import { coerce, cast } from '@esmj/schema';

// Named exports for reserved-word factories
import { functionSchema, enumSchema } from '@esmj/schema';
```

### Bundle Size Impact

- **Core only** (`@esmj/schema`): ~1.5 KB gzipped
- **String extensions** (`@esmj/schema/string`): +~0.8 KB
- **Number extensions** (`@esmj/schema/number`): +~0.6 KB
- **Array extensions** (`@esmj/schema/array`): +~0.5 KB
- **Full** (`@esmj/schema/full`): ~4 KB gzipped (all extensions)

**Recommendation:** Import only the extensions you need to minimize bundle size.

### Named Exports & Tree-Shaking

Every factory in the core module is exported both as a named function **and** as a property on `s`. The two references are identical — no extra wrapper, no overhead.

```typescript
import { s } from '@esmj/schema';
import { string, number } from '@esmj/schema';

s.string === string; // true
```

When you import individual factories, bundlers (webpack, Rollup, Vite, esbuild) tree-shake everything else out:

```typescript
// Only `string` and `number` end up in the final bundle — object, array, coerce, cast, etc. are excluded
import { string, number } from '@esmj/schema';

const nameSchema = string().optional();
const ageSchema = number();
```

The `coerce` and `cast` namespaces are also individually exported:

```typescript
import { coerce } from '@esmj/schema';

const schema = coerce.number();
schema.parse('42'); // 42
```

Because `function` and `enum` are reserved words in JavaScript, their standalone names are `functionSchema` and `enumSchema`:

```typescript
import { functionSchema, enumSchema } from '@esmj/schema';

const cb = functionSchema();
const role = enumSchema(['admin', 'user', 'guest']);
```

They are still accessible as `s.function()` and `s.enum()` for full API compatibility.



String extensions provide common validation and transformation methods for string schemas.

```typescript
import { s } from '@esmj/schema/string';

const userSchema = s.object({
  username: s.string()
    .trim()              // Remove whitespace
    .toLowerCase()        // Convert to lowercase
    .min(3)              // Minimum 3 characters
    .max(20)             // Maximum 20 characters
    .startsWith('user_'), // Must start with 'user_'
  
  email: s.string()
    .trim()
    .toLowerCase()
    .includes('@')        // Must contain '@'
});

userSchema.parse({
  username: '  USER_John  ',
  email: '  John@Example.com  '
});
// ✓ { username: 'user_john', email: 'john@example.com' }
```

**Available String Methods:**

- **Length validations**: `min(length)`, `max(length)`, `length(exact)`, `nonEmpty()`
- **Pattern validations**: `startsWith(prefix)`, `endsWith(suffix)`, `includes(substring)`
- **Transformations**: `trim()`, `toLowerCase()`, `toUpperCase()`, `padStart(length, char)`, `padEnd(length, char)`, `replace(search, replace)`

### Number Extensions (`@esmj/schema/number`)

Number extensions provide validation methods for number schemas including range checks and type validations.

```typescript
import { s } from '@esmj/schema/number';

const productSchema = s.object({
  price: s.number()
    .positive()           // Must be positive
    .min(0.01)           // Minimum value
    .max(999999.99),     // Maximum value
  
  quantity: s.number()
    .int()               // Must be integer
    .positive()
    .min(1)
    .max(1000),
  
  discount: s.number()
    .min(0)
    .max(100)
    .multipleOf(5)       // Must be multiple of 5
});

productSchema.parse({
  price: 29.99,
  quantity: 5,
  discount: 10
});
// ✓ { price: 29.99, quantity: 5, discount: 10 }
```

**Available Number Methods:**

- **Range validations**: `min(value)`, `max(value)`, `positive()`, `negative()`
- **Type validations**: `int()`, `float()`, `multipleOf(value)`, `finite()`

### Array Extensions (`@esmj/schema/array`)

Array extensions provide validation and transformation methods for array schemas.

```typescript
import { s } from '@esmj/schema/array';

const tagsSchema = s.object({
  tags: s.array(s.string())
    .min(1)              // At least 1 item
    .max(5)              // At most 5 items
    .unique()            // All items must be unique
});

tagsSchema.parse({
  tags: ['javascript', 'typescript', 'node']
});
// ✓ { tags: ['javascript', 'typescript', 'node'] }
```

**Available Array Methods:**

- **Size validations**: `min(length)`, `max(length)`, `length(exact)`, `nonEmpty()`
- **Content validations**: `unique()`
- **Transformations**: `sort()`, `reverse()`

### Full Extensions (`@esmj/schema/full`)

The full version includes all string, number, and array extensions in a single import.

```typescript
import { s } from '@esmj/schema/full';

const productSchema = s.object({
  // String extensions
  name: s.string()
    .trim()
    .min(3)
    .max(100),
  
  sku: s.string()
    .toUpperCase()
    .length(8)
    .startsWith('PROD'),
  
  // Number extensions
  price: s.number()
    .positive()
    .min(0.01)
    .max(999999.99),
  
  stock: s.number()
    .int()
    .min(0),
  
  // Array extensions
  categories: s.array(s.string())
    .min(1)
    .max(5)
    .unique(),
  
  dimensions: s.array(s.number().positive())
    .length(3) // [length, width, height]
});
```

**Custom Error Messages:**

All extension methods support custom error messages:

```typescript
const schema = s.object({
  username: s.string().min(3, {
    message: 'Username is too short! Please use at least 3 characters.'
  }),
  age: s.number().positive({
    message: 'Age must be a positive number.'
  }),
  tags: s.array(s.string()).unique({
    message: 'Duplicate tags are not allowed.'
  })
});
```

## API Reference Summary

### Core Types

All factory functions below are available both as methods on `s` **and** as individual named exports for tree-shaking:

- `s.string()` / `import { string }` - String validation
- `s.number()` / `import { number }` - Number validation
- `s.boolean()` / `import { boolean }` - Boolean validation
- `s.date()` / `import { date }` - Date validation
- `s.function()` / `import { functionSchema }` - Function validation
- `s.object(def)` / `import { object }` - Object validation
- `s.array(def)` / `import { array }` - Array validation
- `s.literal(value)` / `import { literal }` - Literal value validation
- `s.enum(values)` / `import { enumSchema }` - Enum validation
- `s.union(schemas)` / `import { union }` - Union validation
- `s.any()` / `import { any }` - Any type
- `s.preprocess(fn, schema)` / `import { preprocess }` - Preprocess before validation
- `s.coerce` / `import { coerce }` - Coerce namespace
- `s.cast` / `import { cast }` - Cast namespace

### Modifiers

- `.optional()` - Makes field optional
- `.nullable()` - Makes field nullable
- `.nullish()` - Makes field optional and nullable
- `.default(value)` - Sets default value
- `.catch(value)` - Returns fallback value on any parse failure

### Coerce

- `s.coerce.string()` - Coerce any value to string, then validate
- `s.coerce.number()` - Coerce any value to number, then validate (fails for NaN)
- `s.coerce.boolean()` - Coerce any value to boolean, then validate
- `s.coerce.date()` - Coerce any value to Date, then validate (fails for invalid dates)

### Cast

Semantic casting that understands common string representations and rejects ambiguous inputs:

- `s.cast.boolean()` - Cast to boolean; understands `'true'/'false'`, `'yes'/'no'`, `'on'/'off'`, `'1'/'0'` (case-insensitive); rejects `null`/`undefined`/unrecognised strings
- `s.cast.number()` - Cast to number; trims whitespace from strings, accepts booleans (`true`→1, `false`→0); rejects `null`/`undefined`/empty strings
- `s.cast.string()` - Cast to string; accepts strings, finite numbers, and booleans; rejects `null`/`undefined`/objects/`NaN`/`Infinity`
- `s.cast.date()` - Cast to Date; accepts ISO strings, finite timestamps, and existing Dates; rejects `null`/`undefined`/booleans/empty strings
- `s.cast.json(schema)` - Parse a JSON string and validate the result against a schema; non-string inputs pass through directly; malformed JSON returns a proper validation failure

### Transformations

- `.transform(fn)` - Transform value
- `s.preprocess(fn, schema)` - Preprocess before validation
- `.pipe(schema)` - Pipe to another schema
- `.refine(fn, opts)` - Custom validation

### String Extensions

Available when importing from `@esmj/schema/string` or `@esmj/schema/full`:

**Length Validations:**
- `.min(n)` - Minimum length
- `.max(n)` - Maximum length
- `.length(n)` - Exact length
- `.nonEmpty()` - Non-empty string

**Pattern Validations:**
- `.startsWith(prefix)` - Must start with prefix
- `.endsWith(suffix)` - Must end with suffix
- `.includes(substring)` - Must contain substring

**Transformations:**
- `.trim()` - Remove whitespace
- `.toLowerCase()` - Convert to lowercase
- `.toUpperCase()` - Convert to uppercase
- `.padStart(length, char)` - Pad start
- `.padEnd(length, char)` - Pad end
- `.replace(search, replace)` - Replace text

### Number Extensions

Available when importing from `@esmj/schema/number` or `@esmj/schema/full`:

**Range Validations:**
- `.min(n)` - Minimum value
- `.max(n)` - Maximum value
- `.positive()` - Must be positive
- `.negative()` - Must be negative

**Type Validations:**
- `.int()` - Must be integer
- `.float()` - Must be float (non-integer)
- `.multipleOf(n)` - Must be multiple of n
- `.finite()` - Must be finite

### Array Extensions

Available when importing from `@esmj/schema/array` or `@esmj/schema/full`:

**Size Validations:**
- `.min(n)` - Minimum length
- `.max(n)` - Maximum length
- `.length(n)` - Exact length
- `.nonEmpty()` - Non-empty array

**Content Validations:**
- `.unique()` - All items must be unique

**Transformations:**
- `.sort()` - Sort array
- `.reverse()` - Reverse array

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

#### `s.function(options?)`

Creates a function schema that validates the value is callable.

- **`message`**: Can be either a constant string or a function `(value) => string`.

```typescript
const callbackSchema = s.function();
callbackSchema.parse(() => {});        // () => {}
callbackSchema.parse(async () => {});  // async () => {}
callbackSchema.parse('hello');         // throws

const callbackSchemaMsg = s.function({
  message: 'Expected a callback function.',
});

const callbackSchemaFunc = s.function({
  message: (value) => `Custom error: "${value}" is not a function.`,
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

#### `s.literal(value, options?)`

Creates a literal schema that validates against an exact value. The value can be a string, number, or boolean. This is useful for discriminated unions, API response types, and strict value validation. You can optionally pass `options` to customize error messages.

- **`message`**: Can be either a constant string or a function `(value) => string`.

```typescript
// String literal
const adminSchema = s.literal('admin');
adminSchema.parse('admin'); // ✅ 'admin'
adminSchema.parse('user');  // ❌ throws error

// Number literal
const statusCode = s.literal(200);
statusCode.parse(200); // ✅ 200
statusCode.parse(404); // ❌ throws error

// Boolean literal
const enabled = s.literal(true);
enabled.parse(true);  // ✅ true
enabled.parse(false); // ❌ throws error

// Custom error message
const typeSchema = s.literal('success', {
  message: 'Response type must be "success"',
});

// Custom error function
const versionSchema = s.literal(1, {
  message: (value) => `API version must be 1, received ${value}`,
});

// Discriminated unions with literal
const responseSchema = s.union([
  s.object({
    type: s.literal('success'),
    data: s.string(),
  }),
  s.object({
    type: s.literal('error'),
    error: s.string(),
  }),
]);

// Using multiple literals in union (similar to enum but with type inference)
const roleSchema = s.union([
  s.literal('admin'),
  s.literal('user'),
  s.literal('guest'),
]);
```

**Common Use Cases:**

- **Discriminated Unions**: Use literal types to distinguish between different object shapes
- **API Response Types**: Validate exact status codes or response types
- **Configuration Flags**: Validate boolean flags or specific string values
- **Type Guards**: Create strict type validation for specific values

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

#### `s.coerce`

The `coerce` namespace applies a native JS constructor to the input **before** validation.
Unlike `s.preprocess`, you don't need to write the conversion yourself, and coerce methods
provide clear, specific error messages when coercion produces an invalid result.

| Method | Coercion applied | Fails when |
|---|---|---|
| `s.coerce.string(options?)` | `String(v)` | Never — `String()` always succeeds |
| `s.coerce.number(options?)` | `Number(v)` | Result is `NaN` (e.g. `'bad'`, `undefined`) |
| `s.coerce.boolean(options?)` | `Boolean(v)` | Never — `Boolean()` always succeeds |
| `s.coerce.date(options?)` | `new Date(v)` | Result is an invalid Date (e.g. `'garbage'`) |

> **Note:** `Boolean('false')` is `true` because `'false'` is a non-empty string. This matches JavaScript semantics.

```typescript
s.coerce.number().parse('42');         // 42
s.coerce.number().parse(true);         // 1
s.coerce.number().parse('bad');        // throws: Cannot coerce "NaN" to a valid number.

s.coerce.string().parse(123);          // '123'
s.coerce.string().parse(null);         // 'null'

s.coerce.boolean().parse(0);           // false
s.coerce.boolean().parse('false');     // true — non-empty string!

s.coerce.date().parse('2024-01-01');   // Date object
s.coerce.date().parse('garbage');      // throws: Cannot coerce "Invalid Date" to a valid date.

// All schema methods chain normally after coerce:
s.coerce.number().refine((v) => v > 0, { message: 'Must be positive' }).parse('5'); // 5

// Custom error message:
s.coerce.number({ message: 'Expected a numeric value' }).parse('bad'); // throws: Expected a numeric value
```

#### `s.cast`

Programmer-friendly semantic casting. Unlike `s.coerce` (raw JS constructors), `s.cast` understands
common string representations and rejects ambiguous inputs like `null`, `undefined`, and empty strings.

| Method | Accepted inputs | Rejects |
|---|---|---|
| `s.cast.string(options?)` | strings, finite numbers, booleans | `null`, `undefined`, objects, `NaN`, `Infinity` |
| `s.cast.number(options?)` | numbers (incl. booleans `true`/`false`→1/0), trimmed numeric strings | `null`, `undefined`, empty strings, non-numeric strings |
| `s.cast.boolean(options?)` | booleans, `1`/`0`, `'true'/'false'`, `'yes'/'no'`, `'on'/'off'`, `'1'/'0'` | `null`, `undefined`, unrecognised strings, other numbers |
| `s.cast.date(options?)` | `Date` objects, ISO strings, finite integer timestamps | `null`, `undefined`, booleans, empty strings, invalid date strings |
| `s.cast.json(schema, options?)` | JSON strings (parsed), any non-string value (pass-through) | malformed JSON strings |

**Key differences from `s.coerce`:**

| Input | `s.coerce.boolean()` | `s.cast.boolean()` |
|---|---|---|
| `'false'` | `true` (non-empty string!) | `false` |
| `'yes'` / `'no'` | `true` / `true` | `true` / `false` |
| `null` | `false` | throws |

| Input | `s.coerce.number()` | `s.cast.number()` |
|---|---|---|
| `null` | `0` | throws |
| `''` | `0` | throws |

| Input | `s.coerce.string()` | `s.cast.string()` |
|---|---|---|
| `null` | `'null'` | throws |
| `undefined` | `'undefined'` | throws |

```typescript
// boolean
s.cast.boolean().parse('false');     // false — unlike coerce!
s.cast.boolean().parse('yes');       // true
s.cast.boolean().parse('on');        // true
s.cast.boolean().parse('OFF');       // false (case-insensitive)
s.cast.boolean().parse(1);           // true
s.cast.boolean().parse(0);           // false
s.cast.boolean().parse('hello');     // throws: Cannot cast "hello" to boolean...
s.cast.boolean().parse(null);        // throws

// number
s.cast.number().parse('42');         // 42
s.cast.number().parse(' 3.14 ');     // 3.14 — trims whitespace
s.cast.number().parse(true);         // 1
s.cast.number().parse(false);        // 0
s.cast.number().parse(null);         // throws: Cannot cast "null" to a number...
s.cast.number().parse('');           // throws

// string
s.cast.string().parse(123);          // '123'
s.cast.string().parse(true);         // 'true'
s.cast.string().parse(false);        // 'false'
s.cast.string().parse(null);         // throws: Cannot cast "null" to string...
s.cast.string().parse(NaN);          // throws

// date
s.cast.date().parse('2024-01-01');   // Date object
s.cast.date().parse(1704067200000);  // Date object
s.cast.date().parse(null);           // throws: Cannot cast "null" to a valid date.
s.cast.date().parse(true);           // throws

// All schema methods chain normally:
s.cast.number().refine((v) => v > 0, { message: 'Must be positive' }).parse('5'); // 5

// Custom error message:
s.cast.boolean({ message: 'Must be a boolean flag' }).parse('maybe'); // throws: Must be a boolean flag

// json
s.cast.json(s.object({ name: s.string() })).parse('{"name":"Alice"}'); // { name: 'Alice' }
s.cast.json(s.array(s.number())).parse('[1,2,3]');                     // [1, 2, 3]
s.cast.json(s.object({ name: s.string() })).parse({ name: 'Alice' }); // { name: 'Alice' } — pass-through
s.cast.json(s.number()).safeParse('not json');                         // { success: false, error: ... }
s.cast.json(s.number(), { message: 'Invalid JSON' }).parse('bad');     // throws: Invalid JSON
```

### Schema Methods

#### `parse(value, parseOptions?)`

Parses the given value according to the schema.

```typescript
const result = stringSchema.parse('hello');
```

#### `safeParse(value, parseOptions?)`

Safely parses the given value according to the schema, returning a success or error result.

```typescript
const result = stringSchema.safeParse('hello'); 
// { success: true, data: 'hello' }

const errorResult = stringSchema.safeParse(123); 
// { success: false, error: { message: 'The value "123" must be type of string but is type of "number".' } }

// Collect all errors (not just the first)
const allErrorsResult = stringSchema.safeParse(123, { abortEarly: false });
console.log(allErrorsResult.errors); // Array of all errors
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

#### `catch(catchValue)`

Returns a fallback value whenever parsing fails, instead of throwing or returning an error.
Unlike `default()` which only fires when the input is `undefined`, `catch()` fires on **any** validation failure.

The fallback can be a static value or a function that receives a context object `{ input, error }`:
- `input` — the original raw input value
- `error` — the `ErrorStructure` with the failure message

**Note:** The fallback value is returned as-is without re-validation. `catch()` only intercepts failures from schemas and refinements placed **before** it in the chain.

```typescript
// Static fallback
const schema = s.string().catch('unknown');
schema.parse(123);       // 'unknown'
schema.parse('hello');   // 'hello'

// Function fallback with context
const schema2 = s.number().catch((ctx) => {
  console.warn(`Invalid input: ${ctx.input} — ${ctx.error.message}`);
  return 0;
});
schema2.parse('bad');    // 0

// Distinction from default()
s.string().catch('fallback').parse(null);    // 'fallback' — catch fires for null
s.string().default('fallback').parse(null);  // throws — default does not fire for null
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

#### Error Collection with `abortEarly` Option

Both `parse` and `safeParse` accept an optional second argument:
`parseOptions: { abortEarly?: boolean }`

- **`abortEarly`** (default: `true`):
  If `true`, validation stops at the first error (previous behavior).
  If `false`, all validation errors are collected and returned in the `errors` array.

**Example:**

```typescript
const schema = s.object({
  name: s.string(),
  age: s.number(),
  email: s.string()
});

// Default behavior (abortEarly: true)
const result1 = schema.safeParse({
  name: 123,
  age: 'not a number',
  email: 42
});
console.log(result1.success); // false
console.log(result1.errors.length); // 1

// Collect all errors (abortEarly: false)
const result2 = schema.safeParse({
  name: 123,
  age: 'not a number',
  email: 42
}, { abortEarly: false });
console.log(result2.success); // false
console.log(result2.errors.length); // 3
```

**Error Result Structure:**

- `error`: The first error encountered (for compatibility)
- `errors`: Array of all errors (when `abortEarly: false`)

**Note:**  
The `abortEarly` option is propagated through nested schemas, arrays, unions, and refinements.  
This means you get all errors from deeply nested structures when using `{ abortEarly: false }`.

**Example Output:**

```json
{
  "success": false,
  "error": {
    "message": "Error parsing key \"name\": The value \"123\" must be type of string but is type of \"number\".",
    "cause": { "key": "name" }
  },
  "errors": [
    { "message": "Error parsing key \"name\": ...", "cause": { "key": "name" } },
    { "message": "Error parsing key \"age\": ...", "cause": { "key": "age" } },
    { "message": "Error parsing key \"email\": ...", "cause": { "key": "email" } }
  ]
}
```

### Extending Schemas

You can extend the schema system with custom validation methods. This is useful for adding domain-specific validations like email or URL formats.

#### Basic Extension Example

```typescript
import { extend, type SchemaType, type StringSchemaInterface } from '@esmj/schema';

// First, declare the new methods you want to add
declare module '@esmj/schema' {
  interface StringSchemaInterface {
    email(): StringSchemaInterface;
    url(): StringSchemaInterface;
    trim(): StringSchemaInterface;
  }
}

// Define validation patterns
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^(https?:\/\/[^\s$.?#].[^\s]*)$/;

// Extend the schema system
extend((schema: SchemaType, _, options) => {
  // Only add methods to string schemas
  if (options?.type === 'string') {
    const stringSchema = schema as StringSchemaInterface;
    
    // Add email validation
    stringSchema.email = function() {
      return this.refine((value) => EMAIL_REGEX.test(value), {
        message: 'Invalid email format'
      });
    };
    
    // Add URL validation
    stringSchema.url = function() {
      return this.refine((value) => URL_REGEX.test(value), {
        message: 'Invalid URL format'
      });
    };
    
    // Add string trimming
    stringSchema.trim = function() {
      return this.transform((value) => value.trim());
    };
  }

  return schema;
});
```

#### Usage of Extended Schemas

Once extended, you can use your custom methods in schema definitions:

```typescript
const userSchema = s.object({
  name: s.string().trim(),
  email: s.string().email(),
  website: s.string().url().optional()
});

// Valid data
userSchema.parse({
  name: '  John Doe  ', // Will be trimmed
  email: 'john@example.com'
});

// Invalid data
try {
  userSchema.parse({
    name: 'John Doe',
    email: 'not-an-email'
  });
} catch (error) {
  console.error(error); // "Invalid email format"
}
```

#### Advanced Extensions

You can extend any schema type and add complex validations:

```typescript
declare module '@esmj/schema' {
  interface NumberSchemaInterface {
    positive(): NumberSchemaInterface;
    range(min: number, max: number): NumberSchemaInterface;
  }
  
  interface ArraySchemaInterface<T> {
    minLength(length: number): ArraySchemaInterface<T>;
    unique(): ArraySchemaInterface<T>;
  }
}

extend((schema: SchemaType, _, options) => {
  if (options?.type === 'number') {
    const numberSchema = schema as NumberSchemaInterface;
    
    numberSchema.positive = function() {
      return this.refine((value) => value > 0, {
        message: 'Number must be positive'
      });
    };
    
    numberSchema.range = function(min, max) {
      return this.refine((value) => value >= min && value <= max, {
        message: `Number must be between ${min} and ${max}`
      });
    };
  }
  
  if (options?.type === 'array') {
    const arraySchema = schema as ArraySchemaInterface<unknown>;
    
    arraySchema.minLength = function(length) {
      return this.refine((value) => value.length >= length, {
        message: `Array must contain at least ${length} items`
      });
    };
    
    arraySchema.unique = function() {
      return this.refine((value) => {
        const seen = new Set();
        return value.every(item => {
          const serialized = JSON.stringify(item);
          if (seen.has(serialized)) return false;
          seen.add(serialized);
          return true;
        });
      }, { message: 'Array items must be unique' });
    };
  }
  
  return schema;
});
```

This extension system gives you the flexibility to create domain-specific validation rules while maintaining type safety and the fluent API style.

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

## Examples Folder

The `examples/` folder contains comprehensive, runnable examples demonstrating various use cases. See the [examples README](examples/README.md) for detailed documentation.

### Basic Usage (`examples/basic-usage.ts`)

Demonstrates the core validation features with strings, numbers, arrays, and unions:

```bash
node --experimental-strip-types examples/basic-usage.ts
```

### Custom Validation (`examples/custom-validation.ts`)

Shows how to create custom validators for common use cases:
- Email validation with regex
- URL validation
- Age range validation
- Password strength validation
- Cross-field validation (e.g., password confirmation)

```bash
node --experimental-strip-types examples/custom-validation.ts
```

### Advanced Forms (`examples/advanced-forms.ts`)

Real-world form validation examples:
- User profile schema with nested objects
- Address validation with postal codes
- Phone number formatting and validation
- API response validation
- Complex nested structures

```bash
node --experimental-strip-types examples/advanced-forms.ts
```

### Custom Extensions (`examples/custom-extensions.ts`)

Demonstrates how to extend the library with custom methods:
- Email validation extension
- URL validation extension
- UUID validation extension
- Combining custom extensions with built-in validators

```bash
node --experimental-strip-types examples/custom-extensions.ts
```

### Registration Form (`examples/registration-form.ts`)

Complete user registration form validation with email and phone number validation:
- Username validation with pattern matching
- Email validation using custom extension
- International phone number validation
- Password strength requirements
- Password confirmation matching
- Age verification (18+)
- Terms acceptance validation
- Error collection with `abortEarly: false`

```bash
node --experimental-strip-types examples/registration-form.ts
```

**To run all examples:**

```bash
# Using Node.js with experimental type stripping (built-in, no dependencies)
node --experimental-strip-types examples/basic-usage.ts
node --experimental-strip-types examples/custom-validation.ts
node --experimental-strip-types examples/advanced-forms.ts
node --experimental-strip-types examples/custom-extensions.ts
node --experimental-strip-types examples/registration-form.ts

# OR using npm scripts from examples folder
cd examples
npm install
npm run basic
npm run custom
npm run advanced
npm run extensions
npm run registration
npm run all  # Run all examples

# OR using tsx (requires installation)
npm install -g tsx  # If not already installed
npx tsx examples/basic-usage.ts
npx tsx examples/custom-validation.ts
npx tsx examples/advanced-forms.ts
npx tsx examples/custom-extensions.ts
npx tsx examples/registration-form.ts
```
## Migration Guide

### From Zod

`@esmj/schema` has a similar API to Zod, making migration straightforward:

```typescript
// Zod
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(3).max(50),
  email: z.string().email(),
  age: z.number().positive().int(),
  role: z.enum(['admin', 'user']),
  tags: z.array(z.string()).optional()
});

// @esmj/schema (with extensions)
import { s } from '@esmj/schema/full';

const userSchema = s.object({
  name: s.string().min(3).max(50),
  email: s.string(), // Note: email() validation requires custom extension
  age: s.number().positive().int(),
  role: s.enum(['admin', 'user']),
  tags: s.array(s.string()).optional()
});
```

**Key Differences:**

| Feature | Zod | @esmj/schema |
|---------|-----|--------------|
| Import | `import { z } from 'zod'` | `import { s } from '@esmj/schema'` |
| Extensions | Built-in | Modular (`/string`, `/number`, `/array`, `/full`) |
| Bundle size | ~13 KB | ~1.4 KB (core), ~4 KB (full) |
| Email validation | `.email()` built-in | Custom extension (see [Extending Schemas](#extending-schemas)) |
| Error format | Native Error | Plain object `{ success, error, errors }` |
| Coerce | `z.coerce.number()` | `s.coerce.number()` |
| Smart cast | No direct equivalent | `s.cast.number()` — rejects nulls, understands `'yes'/'no'`, etc. |

**Migration Tips:**

1. Replace `z` with `s` in your imports
2. For string methods like `.min()`, `.trim()`, import from `@esmj/schema/full` or `@esmj/schema/string`
3. Add custom extensions for email, URL validation (see examples below)
4. Update error handling to use the plain object structure

### From Yup

Migrating from Yup requires a few adjustments in syntax:

```typescript
// Yup
import * as yup from 'yup';

const userSchema = yup.object({
  name: yup.string().required().min(3).max(50),
  email: yup.string().required().email(),
  age: yup.number().required().positive().integer(),
  website: yup.string().url().nullable(),
  tags: yup.array().of(yup.string()).min(1)
});

// @esmj/schema (with extensions)
import { s } from '@esmj/schema/full';

const userSchema = s.object({
  name: s.string().min(3).max(50), // Fields are required by default
  email: s.string(), // Note: email() validation requires custom extension
  age: s.number().positive().int(),
  website: s.string().nullable(),
  tags: s.array(s.string()).min(1)
});
```

**Key Differences:**

| Feature | Yup | @esmj/schema |
|---------|-----|--------------|
| Required fields | `.required()` explicit | Required by default |
| Optional fields | Default behavior | `.optional()` explicit |
| Array of type | `.array().of(type)` | `.array(type)` |
| Integer | `.integer()` | `.int()` |
| Email validation | `.email()` built-in | Custom extension needed |
| Async validation | Supported | Not currently supported |

**Migration Tips:**

1. Remove `.required()` calls (fields are required by default)
2. Add `.optional()` for optional fields
3. Change `.array().of(type)` to `.array(type)`
4. Change `.integer()` to `.int()`
5. Add custom extensions for email, URL validation

## License

MIT
