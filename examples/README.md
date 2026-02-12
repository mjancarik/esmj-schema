# Examples

This directory contains practical examples of using `@esmj/schema` for various validation scenarios.

## Running Examples

### During Development (from workspace root)

You can run examples directly using Node.js with the experimental TypeScript support:

```bash
# Run individual examples
node --experimental-strip-types examples/basic-usage.ts
node --experimental-strip-types examples/custom-validation.ts
node --experimental-strip-types examples/advanced-forms.ts
node --experimental-strip-types examples/custom-extensions.ts
node --experimental-strip-types examples/registration-form.ts
```

### Using npm scripts (from examples folder)

```bash
cd examples
npm install
npm run basic           # Basic validation features
npm run custom          # Custom validation with refine
npm run advanced        # Real-world form schemas
npm run extensions      # Custom method extensions
npm run registration    # Registration form with email/phone
npm run all             # Run all examples
```

### After Installing the Package

If you've installed `@esmj/schema` in your project:

```bash
npm install @esmj/schema
```

You can copy and adapt these examples for your own use. The examples use the package name in imports so they work after installation:

```typescript
import { s } from '@esmj/schema/full';
```

If you want to run the examples during development (before building/publishing), they will use the built distribution files from the parent package via the `"@esmj/schema": "file:.."` dependency in the examples `package.json`.

## Examples Overview

### [`basic-usage.ts`](./basic-usage.ts)
Introduction to core validation features including:
- Basic types (string, number, boolean, date)
- Object and array schemas
- Optional and nullable fields
- Default values
- Error handling with `parse()` and `safeParse()`

### [`custom-validation.ts`](./custom-validation.ts)
Advanced validation techniques:
- Custom validation with `refine()`
- Multiple validation rules
- Password strength validation
- Cross-field validation
- Collecting all errors with `abortEarly: false`

### [`advanced-forms.ts`](./advanced-forms.ts)
Real-world form validation scenarios:
- User profile forms
- Address forms with conditional fields
- Product forms with enums
- Search filters with transformations
- Nested object validation

### [`custom-extensions.ts`](./custom-extensions.ts)
Creating reusable custom validation methods:
- Email validation extension
- URL validation extension
- UUID validation extension
- Module augmentation for type safety
- Composing extended validators

### [`registration-form.ts`](./registration-form.ts)
Complete user registration form validation:
- Username with pattern validation
- Email validation with custom extension
- Phone number validation (international format)
- Password strength requirements
- Password confirmation matching
- Age verification
- Terms acceptance
- Collecting all validation errors

## TypeScript Support

All examples use TypeScript with `.ts` extension. To run them:

**Node.js 22+** (Recommended):
```bash
node --experimental-strip-types example.ts
```

**Using tsx** (Alternative):
```bash
npm install -g tsx
tsx examples/basic-usage.ts
```

**Using ts-node** (Alternative):
```bash
npm install -g ts-node
ts-node examples/basic-usage.ts
```

## Type Inference

`@esmj/schema` provides full TypeScript type inference:

```typescript
import { s, type Infer } from '@esmj/schema';

const userSchema = s.object({
  name: s.string(),
  age: s.number()
});

// Infer TypeScript type from schema
type User = Infer<typeof userSchema>;
// type User = { name: string; age: number; }

const user: User = userSchema.parse({ name: 'John', age: 30 });
```

## Testing Your Schemas

Here's how to test your validation schemas:

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { s } from '@esmj/schema/full';

describe('User Schema', () => {
  const userSchema = s.object({
    email: s.string().trim().toLowerCase(),
    age: s.number().int().positive().min(18)
  });

  it('should validate correct user data', () => {
    const result = userSchema.safeParse({
      email: '  USER@EXAMPLE.COM  ',
      age: 25
    });
    
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.email, 'user@example.com');
  });

  it('should reject invalid age', () => {
    const result = userSchema.safeParse({
      email: 'user@example.com',
      age: 15
    });
    
    assert.strictEqual(result.success, false);
    assert.ok(result.error.message.includes('18'));
  });

  it('should collect all errors with abortEarly: false', () => {
    const result = userSchema.safeParse({
      email: 'invalid',
      age: -5
    }, { abortEarly: false });
    
    assert.strictEqual(result.success, false);
    assert.ok(result.errors && result.errors.length >= 2);
  });
});
```

## Performance Tips

### 1. Reuse Schema Instances

```typescript
// ✗ Bad: Creating schema on every validation
function validateUser(data: unknown) {
  return s.object({
    name: s.string(),
    age: s.number()
  }).parse(data);
}

// ✓ Good: Create schema once
const userSchema = s.object({
  name: s.string(),
  age: s.number()
});

function validateUser(data: unknown) {
  return userSchema.parse(data);
}
```

### 2. Use Appropriate Import Strategy

```typescript
// ✓ Best: Import only what you need (tree-shakeable)
import { s } from '@esmj/schema';
import '@esmj/schema/string';
import '@esmj/schema/number';

// ✓ Good: If you use all extensions
import { s } from '@esmj/schema/full';

// ✗ Avoid: Importing full when only using core
import { s } from '@esmj/schema/full'; // +4KB
const schema = s.string(); // Only using core features
```

### 3. Use Built-in Methods Over Refinements

```typescript
// ✗ Less efficient: Custom refinements
const schema = s.string()
  .refine(v => v.length >= 3, { message: 'Too short' })
  .refine(v => v.length <= 10, { message: 'Too long' });

// ✓ More efficient: Built-in methods
import '@esmj/schema/string';
const schema = s.string()
  .min(3, { message: 'Too short' })
  .max(10, { message: 'Too long' });
```

### 4. Use `abortEarly: true` for Better Performance

```typescript
// ✓ Faster: Stops at first error (default)
schema.parse(data);
// or explicitly: schema.parse(data, { abortEarly: true });

// ✗ Slower: Validates everything (use only when you need all errors)
schema.parse(data, { abortEarly: false });
```

## Common Patterns

### Form Validation with Error Collection

```typescript
import { s } from '@esmj/schema/full';

const formSchema = s.object({
  username: s.string().min(3).max(20),
  email: s.string().trim().toLowerCase(),
  age: s.number().int().min(18)
});

function handleFormSubmit(formData: unknown) {
  const result = formSchema.safeParse(formData, { abortEarly: false });
  
  if (!result.success) {
    // Show all errors to user
    return { errors: result.errors?.map(e => e.message) };
  }
  
  // Process valid data
  return { data: result.data };
}
```

### API Request Validation

```typescript
import { s } from '@esmj/schema';

const apiRequestSchema = s.object({
  body: s.object({
    name: s.string(),
    email: s.string()
  }),
  headers: s.object({
    'authorization': s.string()
  })
});

function handleRequest(req: unknown) {
  try {
    const validated = apiRequestSchema.parse(req);
    // Request is valid, proceed
    return processRequest(validated);
  } catch (error) {
    // Invalid request
    return { status: 400, error: error.message };
  }
}
```

### Database Model with Defaults

```typescript
import { s, type Infer } from '@esmj/schema';

const userModel = s.object({
  id: s.string(),
  email: s.string().trim().toLowerCase(),
  isActive: s.boolean().default(true),
  createdAt: s.date().default(() => new Date()),
  lastLogin: s.date().nullable().default(null)
});

type User = Infer<typeof userModel>;

function createUser(input: Partial<User>): User {
  return userModel.parse(input);
}
```

## Need Help?

- Check the main [README](../README.md) for full API documentation
- Browse these examples for common use cases
- See the [tests](../src/__tests__) for more advanced scenarios

## Contributing

If you have additional example use cases that would be helpful, please open an issue or pull request!
