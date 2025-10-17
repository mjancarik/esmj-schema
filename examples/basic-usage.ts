import { s } from '../src/full.ts';

// String validations with transformations
console.log('=== String Validations ===');
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
