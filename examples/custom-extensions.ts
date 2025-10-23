import { s, extend, type StringSchemaInterface } from '../src/full.ts';

// Extend StringSchemaInterface to add custom methods
declare module '../src/full.ts' {
  interface StringSchemaInterface {
    email(options?: { message?: string }): StringSchemaInterface;
    url(options?: { message?: string }): StringSchemaInterface;
    uuid(options?: { message?: string }): StringSchemaInterface;
  }
}

// Implement the extensions
extend((schema, _, options) => {
  if (options?.type === 'string') {
    const stringSchema = schema as StringSchemaInterface;

    // Email validation
    stringSchema.email = function ({ message } = {}) {
      return this.refine(
        (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        {
          message: message || ((value: string) => `"${value}" is not a valid email address`),
        },
      );
    };

    // URL validation
    stringSchema.url = function ({ message } = {}) {
      return this.refine(
        (value) => {
          try {
            new URL(value);
            return true;
          } catch {
            return false;
          }
        },
        {
          message: message || ((value: string) => `"${value}" is not a valid URL`),
        },
      );
    };

    // UUID validation
    stringSchema.uuid = function ({ message } = {}) {
      return this.refine(
        (value) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            value,
          ),
        {
          message: message || ((value: string) => `"${value}" is not a valid UUID`),
        },
      );
    };
  }

  return schema;
});

// Now use the extended schema
console.log('=== Email Validation ===');
const emailSchema = s.string().email();
console.log('Valid email:', emailSchema.safeParse('user@example.com'));
console.log('Invalid email:', emailSchema.safeParse('not-an-email'));
console.log('Empty string:', emailSchema.safeParse(''));

console.log('\n=== URL Validation ===');
const urlSchema = s.string().url();
console.log('Valid URL:', urlSchema.safeParse('https://example.com'));
console.log('Valid URL with path:', urlSchema.safeParse('https://example.com/path'));
console.log('Invalid URL:', urlSchema.safeParse('not a url'));

console.log('\n=== UUID Validation ===');
const uuidSchema = s.string().uuid();
console.log(
  'Valid UUID:',
  uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000'),
);
console.log('Invalid UUID:', uuidSchema.safeParse('not-a-uuid'));
console.log(
  'Invalid UUID format:',
  uuidSchema.safeParse('550e8400-e29b-41d4-a716'),
);

// Combine extensions in a schema
console.log('\n=== Combined Schema ===');
const userSchema = s.object({
  id: s.string().uuid(),
  email: s.string().trim().toLowerCase().email(),
  website: s.string().url().optional(),
});

console.log(
  'Valid user:',
  userSchema.parse({
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: '  USER@EXAMPLE.COM  ',
    website: 'https://example.com',
  }),
);

console.log(
  '\nInvalid user (bad email):',
  userSchema.safeParse({
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'not-an-email',
  }),
);

// Custom error messages
console.log('\n=== Custom Error Messages ===');
const customEmailSchema = s
  .string()
  .email({ message: 'Please enter a valid email address' });

console.log(
  'Custom error:',
  customEmailSchema.safeParse('invalid'),
);
