import { s } from '../src/full.ts';

// Custom email validation using refine
const emailSchema = s
  .string()
  .trim()
  .toLowerCase()
  .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
    message: 'Invalid email address format',
  });

console.log('=== Custom Email Validation ===');
console.log('Valid email:', emailSchema.safeParse('user@example.com'));
console.log('Invalid email:', emailSchema.safeParse('not-an-email'));
console.log(
  'Email with whitespace:',
  emailSchema.safeParse('  User@Example.COM  '),
);

// Custom URL validation
const urlSchema = s.string().refine(
  (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  {
    message: (value) => `"${value}" is not a valid URL`,
  },
);

console.log('\n=== Custom URL Validation ===');
console.log('Valid URL:', urlSchema.safeParse('https://example.com'));
console.log('Invalid URL:', urlSchema.safeParse('not a url'));

// Custom age validation
const ageSchema = s
  .number()
  .int()
  .positive()
  .refine((value) => value >= 18, {
    message: (value) =>
      `Age must be at least 18 (received ${value} years old)`,
  })
  .refine((value) => value <= 120, {
    message: (value) => `Age seems unrealistic (received ${value} years old)`,
  });

console.log('\n=== Custom Age Validation ===');
console.log('Valid age:', ageSchema.safeParse(25));
console.log('Too young:', ageSchema.safeParse(15));
console.log('Too old:', ageSchema.safeParse(150));

// Custom password validation
const passwordSchema = s
  .string()
  .min(8, { message: 'Password must be at least 8 characters' })
  .refine((value) => /[A-Z]/.test(value), {
    message: 'Password must contain at least one uppercase letter',
  })
  .refine((value) => /[a-z]/.test(value), {
    message: 'Password must contain at least one lowercase letter',
  })
  .refine((value) => /[0-9]/.test(value), {
    message: 'Password must contain at least one number',
  })
  .refine((value) => /[^A-Za-z0-9]/.test(value), {
    message: 'Password must contain at least one special character',
  });

console.log('\n=== Custom Password Validation ===');
console.log('Valid password:', passwordSchema.safeParse('MyP@ssw0rd'));
console.log('Too short:', passwordSchema.safeParse('Pass1!'));
console.log('No uppercase:', passwordSchema.safeParse('myp@ssw0rd'));
console.log('No special char:', passwordSchema.safeParse('MyPassw0rd'));

// Custom object validation with cross-field checks
const registrationSchema = s
  .object({
    password: s.string().min(8),
    confirmPassword: s.string(),
    email: emailSchema,
    age: ageSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
  });

console.log('\n=== Cross-Field Validation ===');
console.log(
  'Valid registration:',
  registrationSchema.safeParse({
    password: 'MyP@ssw0rd',
    confirmPassword: 'MyP@ssw0rd',
    email: 'user@example.com',
    age: 25,
  }),
);
console.log(
  'Password mismatch:',
  registrationSchema.safeParse({
    password: 'MyP@ssw0rd',
    confirmPassword: 'Different123!',
    email: 'user@example.com',
    age: 25,
  }),
);
