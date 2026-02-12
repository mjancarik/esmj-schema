import { s, extend, type StringSchemaInterface } from '@esmj/schema/full';

// Extend StringSchemaInterface to add email and phone validation
declare module '@esmj/schema/full' {
  interface StringSchemaInterface {
    email(options?: { message?: string }): StringSchemaInterface;
    phone(options?: { message?: string }): StringSchemaInterface;
  }
}

// Implement the email and phone extensions
extend((schema, _, options) => {
  if (options?.type === 'string') {
    const stringSchema = schema as StringSchemaInterface;

    // Email validation
    stringSchema.email = function ({ message } = {}) {
      return this.refine(
        (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        {
          message:
            message ||
            ((value: string) => `"${value}" is not a valid email address`),
        },
      );
    };

    // Phone validation (international format with optional + and allows spaces, dashes, parentheses)
    stringSchema.phone = function ({ message } = {}) {
      return this.refine(
        (value) => {
          // Remove common phone formatting characters
          const cleaned = value.replace(/[\s()-]/g, '');
          // Check if it's a valid international phone number
          // Format: optional +, then 1-3 digits country code, then 4-14 digits
          return /^\+?[1-9]\d{1,14}$/.test(cleaned);
        },
        {
          message:
            message ||
            ((value: string) =>
              `"${value}" is not a valid phone number. Use international format (e.g., +1234567890)`),
        },
      );
    };
  }

  return schema;
});

// Registration form schema
const registrationSchema = s
  .object({
    // Username validation
    username: s
      .string()
      .trim()
      .toLowerCase()
      .min(3, { message: 'Username must be at least 3 characters' })
      .max(20, { message: 'Username must be at most 20 characters' })
      .refine((val) => /^[a-z0-9_]+$/.test(val), {
        message:
          'Username can only contain lowercase letters, numbers, and underscores',
      }),

    // Email validation with custom extension
    email: s.string().trim().toLowerCase().email(),

    // Phone number (optional)
    phone: s.string().trim().phone().optional(),

    // Password validation
    password: s
      .string()
      .min(8, { message: 'Password must be at least 8 characters' })
      .refine((val) => /[A-Z]/.test(val), {
        message: 'Password must contain at least one uppercase letter',
      })
      .refine((val) => /[a-z]/.test(val), {
        message: 'Password must contain at least one lowercase letter',
      })
      .refine((val) => /[0-9]/.test(val), {
        message: 'Password must contain at least one number',
      })
      .refine((val) => /[!@#$%^&*(),.?":{}|<>]/.test(val), {
        message: 'Password must contain at least one special character',
      }),

    // Confirm password
    confirmPassword: s.string(),

    // Age validation
    age: s
      .number()
      .int({ message: 'Age must be a whole number' })
      .min(18, { message: 'You must be at least 18 years old' })
      .max(120, { message: 'Please enter a valid age' }),

    // Terms acceptance
    acceptTerms: s
      .boolean()
      .refine((val) => val === true, {
        message: 'You must accept the terms and conditions',
      }),

    // Newsletter subscription (optional)
    newsletter: s.boolean().default(false),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
  });

// Example usage
console.log('=== Valid Registration ===');
const validRegistration = {
  username: '  john_doe  ',
  email: '  JOHN.DOE@EXAMPLE.COM  ',
  phone: '+1 (555) 123-4567',
  password: 'SecurePass123!',
  confirmPassword: 'SecurePass123!',
  age: 25,
  acceptTerms: true,
  newsletter: true,
};

const validResult = registrationSchema.safeParse(validRegistration);
if (validResult.success) {
  console.log('✓ Registration successful!');
  console.log('User data:', validResult.data);
} else {
  console.log('✗ Registration failed:', validResult.error.message);
}

// Example with different phone formats
console.log('\n=== Different Phone Number Formats ===');
const phoneFormats = [
  '+1234567890',
  '+1 234 567 8900',
  '+1-234-567-8900',
  '+1 (234) 567-8900',
  '1234567890',
  '+420123456789',
];

phoneFormats.forEach((phone) => {
  const result = registrationSchema.safeParse({
    ...validRegistration,
    phone,
  });
  console.log(
    `${phone.padEnd(20)} -> ${result.success ? '✓ Valid' : '✗ Invalid'}`,
  );
});

// Example: Invalid registration with multiple errors
console.log('\n=== Invalid Registration (Collecting All Errors) ===');
const invalidRegistration = {
  username: 'ab', // Too short
  email: 'not-an-email', // Invalid email
  phone: 'abc123', // Invalid phone
  password: 'weak', // Doesn't meet requirements
  confirmPassword: 'different', // Doesn't match
  age: 15, // Too young
  acceptTerms: false, // Must be true
};

const invalidResult = registrationSchema.safeParse(invalidRegistration, {
  abortEarly: false,
});

if (!invalidResult.success) {
  console.log('✗ Registration failed with errors:');
  if (invalidResult.errors) {
    invalidResult.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error.message}`);
    });
  } else {
    console.log(`  ${invalidResult.error.message}`);
  }
}

// Example: Registration without optional fields
console.log('\n=== Registration Without Optional Fields ===');
const minimalRegistration = {
  username: 'jane_smith',
  email: 'jane@example.com',
  // phone is optional - not provided
  password: 'StrongPass456!',
  confirmPassword: 'StrongPass456!',
  age: 30,
  acceptTerms: true,
  // newsletter will default to false
};

const minimalResult = registrationSchema.safeParse(minimalRegistration);
if (minimalResult.success) {
  console.log('✓ Minimal registration successful!');
  console.log('User data:', minimalResult.data);
  console.log('Note: phone is undefined, newsletter defaults to false');
} else {
  console.log('✗ Registration failed:', minimalResult.error.message);
}

// Example: Custom error messages
console.log('\n=== Custom Error Messages ===');
const customSchema = s.object({
  email: s
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'Please enter a valid email address' }),
  phone: s
    .string()
    .trim()
    .phone({
      message: 'Please enter a valid phone number (e.g., +1234567890)',
    })
    .optional(),
});

const customResult = customSchema.safeParse({
  email: 'invalid-email',
  phone: 'bad-phone',
});

if (!customResult.success) {
  console.log('✗ Validation failed with custom messages:');
  if (customResult.errors) {
    customResult.errors.forEach((error) => {
      console.log(`  - ${error.message}`);
    });
  }
}

// Type inference example
console.log('\n=== Type Inference ===');
type Registration = ReturnType<typeof registrationSchema.parse>;
console.log('TypeScript type inferred from schema:');
console.log(`{
  username: string,
  email: string,
  phone?: string,
  password: string,
  confirmPassword: string,
  age: number,
  acceptTerms: boolean,
  newsletter: boolean
}`);

// Example: Handling registration in a real application
console.log('\n=== Real Application Example ===');

function handleRegistration(formData: unknown) {
  const result = registrationSchema.safeParse(formData, { abortEarly: false });

  if (!result.success) {
    // Return validation errors to display in UI
    return {
      success: false,
      errors: result.errors?.map((e) => ({
        message: e.message,
        path: e.path,
      })) || [{ message: result.error.message }],
    };
  }

  // In a real app, you would:
  // 1. Hash the password
  // 2. Save to database
  // 3. Send verification email
  // 4. Create user session

  console.log('✓ Would create user account with:');
  console.log(`  - Username: ${result.data.username}`);
  console.log(`  - Email: ${result.data.email}`);
  console.log(`  - Phone: ${result.data.phone || 'Not provided'}`);
  console.log(`  - Age: ${result.data.age}`);
  console.log(`  - Newsletter: ${result.data.newsletter ? 'Yes' : 'No'}`);

  return {
    success: true,
    data: {
      username: result.data.username,
      email: result.data.email,
      phone: result.data.phone,
      age: result.data.age,
      newsletter: result.data.newsletter,
    },
  };
}

const appResult = handleRegistration({
  username: 'new_user_2024',
  email: 'newuser@example.com',
  phone: '+1-555-987-6543',
  password: 'MySecurePassword123!',
  confirmPassword: 'MySecurePassword123!',
  age: 28,
  acceptTerms: true,
  newsletter: true,
});

console.log('\nApplication response:', appResult);
