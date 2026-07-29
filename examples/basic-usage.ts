import { s } from '@esmj/schema/full';

// Basic types: string, number, boolean, date
console.log('=== Basic Types ===');
console.log('String:', s.string().safeParse('hello'));
console.log('Number:', s.number().safeParse(42));
console.log('Boolean:', s.boolean().safeParse(true));
console.log('Date:', s.date().safeParse(new Date('2024-01-01')));

console.log('\n=== Basic String Validation ===');
console.log(
  'trim + startsWith + endsWith:',
  s
    .string()
    .trim()
    .startsWith('Hello')
    .endsWith('World')
    .safeParse(' Hello, World '),
);
console.log(
  'startsWith + endsWith (without trim):',
  s.string().startsWith('Hello').endsWith('World').safeParse(' Hello, World '),
);

// Array validations
console.log('\n=== Array Validations ===');
console.log(
  'Array with min/max:',
  s.array(s.string()).min(2).max(5).safeParse(['Hello', 'World']),
);

// Number validations
console.log('\n=== Number Validations ===');
console.log('Integer + positive:', s.number().int().positive().safeParse(42));
console.log('Float validation:', s.number().float().safeParse(3.14));

// Object schemas (including nested objects)
console.log('\n=== Object Schemas ===');
const userSchema = s.object({
  name: s.string(),
  age: s.number(),
  address: s.object({
    city: s.string(),
  }),
});
console.log(
  'Valid user:',
  userSchema.safeParse({ name: 'John', age: 30, address: { city: 'NYC' } }),
);
console.log(
  'Invalid user (missing field):',
  userSchema.safeParse({ name: 'John', address: { city: 'NYC' } }),
);

// Optional and nullable fields
console.log('\n=== Optional and Nullable Fields ===');
console.log('Optional (undefined):', s.string().optional().safeParse(undefined));
console.log('Nullable (null):', s.string().nullable().safeParse(null));
console.log('Nullish (null or undefined):', s.string().nullish().safeParse(null));

// Default values
console.log('\n=== Default Values ===');
console.log(
  'Default applied to undefined:',
  s.string().default('anonymous').safeParse(undefined),
);
console.log(
  'Default ignored when value is present:',
  s.string().default('anonymous').safeParse('john'),
);

// Union with extended methods
console.log('\n=== Union Validations ===');
console.log(
  'Union with string validation:',
  s
    .union([
      s.string({ message: 'stringSchema' }).startsWith('Hello'),
      s.number(),
    ])
    .safeParse('World'),
);

// Error handling: parse() throws, safeParse() returns a result object
console.log('\n=== Error Handling ===');
try {
  s.number().parse('not a number');
} catch (error) {
  console.log('parse() threw:', (error as Error).message);
}

const safeResult = s.number().safeParse('not a number');
if (!safeResult.success) {
  console.log('safeParse() returned error:', safeResult.error.message);
}

