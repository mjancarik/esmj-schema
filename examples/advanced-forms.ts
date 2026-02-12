import { s } from '@esmj/schema/full';

// Advanced form validation example
const addressSchema = s.object({
  street: s.string().min(3).max(100),
  city: s.string().min(2).max(50),
  zipCode: s.string().length(5).refine((val) => /^\d{5}$/.test(val), {
    message: 'ZIP code must be 5 digits',
  }),
  country: s.enum(['US', 'CA', 'MX', 'UK']),
});

const userProfileSchema = s.object({
  // Personal info
  firstName: s.string().trim().min(2).max(50),
  lastName: s.string().trim().min(2).max(50),
  email: s
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
      message: 'Invalid email address',
    }),

  // Contact
  phone: s
    .string()
    .optional()
    .transform((val) => val?.replace(/\D/g, ''))
    .refine((val) => !val || val.length === 10, {
      message: 'Phone number must be 10 digits',
    }),

  // Address
  address: addressSchema.optional(),

  // Preferences
  role: s.enum(['admin', 'editor', 'viewer']).default('viewer'),
  tags: s.array(s.string()).min(1).max(5).unique(),
  isActive: s.boolean().default(true),

  // Metadata
  createdAt: s.date(),
  updatedAt: s.date().optional(),
});

console.log('=== Valid User Profile ===');
const validProfile = {
  firstName: '  John  ',
  lastName: 'Doe',
  email: ' JOHN.DOE@EXAMPLE.COM ',
  phone: '(555) 123-4567',
  address: {
    street: '123 Main St',
    city: 'New York',
    zipCode: '10001',
    country: 'US' as const,
  },
  role: 'admin' as const,
  tags: ['developer', 'typescript', 'node'],
  isActive: true,
  createdAt: new Date(),
};

console.log('Input:', validProfile);
console.log('Parsed:', userProfileSchema.parse(validProfile));

console.log('\n=== Invalid User Profile (missing required fields) ===');
const invalidProfile = {
  firstName: 'John',
  // lastName missing
  email: 'invalid-email',
  tags: [],
  createdAt: new Date(),
};

console.log('Result:', userProfileSchema.safeParse(invalidProfile));

console.log('\n=== Invalid ZIP Code ===');
const invalidZipProfile = {
  ...validProfile,
  address: {
    street: '123 Main St',
    city: 'New York',
    zipCode: 'ABC12', // Invalid: not digits
    country: 'US' as const,
  },
};

console.log('Result:', userProfileSchema.safeParse(invalidZipProfile));

// API response validation
const apiResponseSchema = s.object({
  status: s.enum(['success', 'error']),
  data: s
    .object({
      users: s.array(
        s.object({
          id: s.number().positive().int(),
          name: s.string(),
          email: s.string(),
        }),
      ),
      total: s.number().positive().int(),
    })
    .optional(),
  error: s
    .object({
      code: s.string(),
      message: s.string(),
    })
    .optional(),
});

console.log('\n=== API Response Validation (Success) ===');
const successResponse = {
  status: 'success' as const,
  data: {
    users: [
      { id: 1, name: 'John', email: 'john@example.com' },
      { id: 2, name: 'Jane', email: 'jane@example.com' },
    ],
    total: 2,
  },
};

console.log('Result:', apiResponseSchema.parse(successResponse));

console.log('\n=== API Response Validation (Error) ===');
const errorResponse = {
  status: 'error' as const,
  error: {
    code: 'NOT_FOUND',
    message: 'User not found',
  },
};

console.log('Result:', apiResponseSchema.parse(errorResponse));
