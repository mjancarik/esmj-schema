import { performance } from 'node:perf_hooks';
import { z as zodMini } from '@zod/mini'; // Import Zod Mini
import Joi from 'joi'; // Import Joi
import superStruct from 'superstruct'; // Import Superstruct
import * as yup from 'yup'; // Import Yup
import { z } from 'zod'; // Import Zod
import { s } from '../src/index.ts'; // Import @esmj/schema

function formatTime(time: number) {
  // Convert time to milliseconds
  if (time < 1000) {
    return `${time.toFixed(2)} ms`;
  }
  // Convert to seconds
  const seconds = time / 1000;
  return `${seconds.toFixed(2)} s`;
}

function benchmark(label: string, fn: () => void) {
  const REPEAT = 10;
  let sum = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < REPEAT; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();

    const time = end - start;

    min = Math.min(min, time);
    max = Math.max(max, time);
    sum += time;
  }

  const average = sum / REPEAT;

  console.log(
    `${label} took an average of ${formatTime(average)} over ${REPEAT} iterations. Min: ${formatTime(min)}, Max: ${formatTime(max)}`,
  );

  return formatTime(average);
}

function scenarioParseSchema(testData) {
  // Define a schema using @esmj/schema
  const esmjSchema = s.object({
    username: s.string(),
    password: s.string(),
    age: s.number().optional(),
    address: s.object({
      street: s.string().nullish(),
      city: s.string().nullable(),
      date: s.date().optional(), // Optional date field
    }),
    tags: s.array(s.string()),
  });

  // Define a schema using Zod
  const zodSchema = z.object({
    username: z.string(),
    password: z.string(),
    age: z.number().optional(),
    address: z.object({
      street: z.string().nullish(),
      city: z.string().nullable(),
      date: z.date().optional(), // Optional date field
    }),
    tags: z.array(z.string()),
  });

  // Define a schema using Zod Mini
  const zodMiniSchema = zodMini.object({
    username: zodMini.string(),
    password: zodMini.string(),
    age: zodMini.optional(zodMini.number()),
    address: zodMini.object({
      street: zodMini.nullish(zodMini.string()),
      city: zodMini.nullable(zodMini.string()),
      date: zodMini.optional(zodMini.date()), // Optional date field
    }),
    tags: zodMini.array(zodMini.string()),
  });

  // Define a schema using Yup
  const yupSchema = yup.object({
    username: yup.string().required(),
    password: yup.string().required(),
    age: yup.number().optional(),
    address: yup.object({
      street: yup.string().nullable(),
      city: yup.string().nullable(),
      date: yup.date().optional(), // Optional date field
    }),
    tags: yup.array().of(yup.string().required()).required(),
  });

  // Define a schema using Superstruct
  const superStructSchema = superStruct.object({
    username: superStruct.string(),
    password: superStruct.string(),
    age: superStruct.number(),
    address: superStruct.object({
      street: superStruct.optional(superStruct.string()),
      city: superStruct.optional(superStruct.string()),
      date: superStruct.optional(superStruct.date()), // Optional date field
    }),
    tags: superStruct.array(superStruct.string()),
  });

  // Define a schema using Joi
  const joiSchema = Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required(),
    age: Joi.number().required(),
    address: Joi.object({
      street: Joi.string().optional(), // Allow null for street
      city: Joi.string().optional(),
      date: Joi.date().optional(), // Optional date field
    }),
    tags: Joi.array().items(Joi.string().required()).required(),
  });

  const result = {} as Record<string, object>;

  const esmjSchemaResult = {};
  esmjSchemaResult['1'] = benchmark('@esmj/schema 1', () => {
    for (let i = 0; i < 1; i++) {
      esmjSchema.safeParse(testData);
    }
  });

  esmjSchemaResult['1_000'] = benchmark('@esmj/schema 1_000', () => {
    for (let i = 0; i < 1_000; i++) {
      esmjSchema.safeParse(testData);
    }
  });

  esmjSchemaResult['1_000_000'] = benchmark('@esmj/schema 1_000_000', () => {
    for (let i = 0; i < 1_000_000; i++) {
      esmjSchema.safeParse(testData);
    }
  });
  result.esmjSchema = esmjSchemaResult;

  const zod = {};
  zod['1'] = benchmark('zod 1', () => {
    for (let i = 0; i < 1; i++) {
      zodSchema.safeParse(testData);
    }
  });

  zod['1_000'] = benchmark('zod 1_000', () => {
    for (let i = 0; i < 1_000; i++) {
      zodSchema.safeParse(testData);
    }
  });

  zod['1_000_000'] = benchmark('zod 1_000_000', () => {
    for (let i = 0; i < 1_000_000; i++) {
      zodSchema.safeParse(testData);
    }
  });
  result.zod = zod;

  const zodMiniResult = {};
  zodMiniResult['1'] = benchmark('@zod/mini 1', () => {
    for (let i = 0; i < 1; i++) {
      zodMiniSchema.safeParse(testData);
    }
  });

  zodMiniResult['1_000'] = benchmark('@zod/mini 1_000', () => {
    for (let i = 0; i < 1_000; i++) {
      zodMiniSchema.safeParse(testData);
    }
  });

  zodMiniResult['1_000_000'] = benchmark('@zod/mini 1_000_000', () => {
    for (let i = 0; i < 1_000_000; i++) {
      zodMiniSchema.safeParse(testData);
    }
  });
  result.zodMini = zodMiniResult;

  const yupResult = {};
  yupResult['1'] = benchmark('yup 1', () => {
    for (let i = 0; i < 1; i++) {
      yupSchema.isValidSync(testData);
    }
  });

  yupResult['1_000'] = benchmark('yup 1_000', () => {
    for (let i = 0; i < 1_000; i++) {
      yupSchema.isValidSync(testData);
    }
  });

  yupResult['1_000_000'] = benchmark('yup 1_000_000', () => {
    for (let i = 0; i < 1_000_000; i++) {
      yupSchema.isValidSync(testData);
    }
  });
  result.yup = yupResult;

  const superStructResult = {};
  superStructResult['1'] = benchmark('superStruct 1', () => {
    for (let i = 0; i < 1; i++) {
      superStruct.is(testData, superStructSchema);
    }
  });

  superStructResult['1_000'] = benchmark('superStruct 1_000', () => {
    for (let i = 0; i < 1_000; i++) {
      superStruct.is(testData, superStructSchema);
    }
  });

  superStructResult['1_000_000'] = benchmark('superStruct 1_000_000', () => {
    for (let i = 0; i < 1_000_000; i++) {
      superStruct.is(testData, superStructSchema);
    }
  });
  result.superStruct = superStructResult;

  const joiResult = {};
  joiResult['1'] = benchmark('joi 1', () => {
    for (let i = 0; i < 1; i++) {
      try {
        joiSchema.validate(testData);
      } catch (e) {}
    }
  });

  joiResult['1_000'] = benchmark('joi 1_000', () => {
    for (let i = 0; i < 1_000; i++) {
      try {
        joiSchema.validate(testData);
      } catch (e) {}
    }
  });

  joiResult['1_000_000'] = benchmark('joi 1_000_000', () => {
    for (let i = 0; i < 1_000_000; i++) {
      try {
        joiSchema.validate(testData);
      } catch (e) {}
    }
  });
  result.joi = joiResult;

  return result;
}

function scenarioCreatingSchema() {
  const result = {} as Record<string, object>;
  const esmjSchemaResult = {};
  esmjSchemaResult['1'] = benchmark('@esmj/schema 1', () => {
    for (let i = 0; i < 1; i++) {
      const esmjSchema = s.object({
        username: s.string(),
        password: s.string(),
        age: s.number().optional(),
        address: s.object({
          street: s.string().nullish(),
          city: s.string().nullable(),
          date: s.date().optional(), // Optional date field
        }),
        tags: s.array(s.string()),
      });
    }
  });

  esmjSchemaResult['1_000'] = benchmark('@esmj/schema 1_000', () => {
    for (let i = 0; i < 1_000; i++) {
      const esmjSchema = s.object({
        username: s.string(),
        password: s.string(),
        age: s.number().optional(),
        address: s.object({
          street: s.string().nullish(),
          city: s.string().nullable(),
          date: s.date().optional(), // Optional date field
        }),
        tags: s.array(s.string()),
      });
    }
  });

  esmjSchemaResult['1_000_000'] = benchmark('@esmj/schema 1_000_000', () => {
    for (let i = 0; i < 1_000_000; i++) {
      const esmjSchema = s.object({
        username: s.string(),
        password: s.string(),
        age: s.number().optional(),
        address: s.object({
          street: s.string().nullish(),
          city: s.string().nullable(),
          date: s.date().optional(), // Optional date field
        }),
        tags: s.array(s.string()),
      });
    }
  });
  result.esmjSchema = esmjSchemaResult;

  const zod = {};
  zod['1'] = benchmark('zod 1', () => {
    for (let i = 0; i < 1; i++) {
      const zodSchema = z.object({
        username: z.string(),
        password: z.string(),
        age: z.number().optional(),
        address: z.object({
          street: z.string().nullish(),
          city: z.string().nullable(),
          date: z.date().optional(), // Optional date field
        }),
        tags: z.array(z.string()),
      });
    }
  });

  zod['1_000'] = benchmark('zod 1_000', () => {
    for (let i = 0; i < 1_000; i++) {
      const zodSchema = z.object({
        username: z.string(),
        password: z.string(),
        age: z.number().optional(),
        address: z.object({
          street: z.string().nullish(),
          city: z.string().nullable(),
          date: z.date().optional(), // Optional date field
        }),
        tags: z.array(z.string()),
      });
    }
  });

  zod['1_000_000'] = benchmark('zod 1_000_000', () => {
    for (let i = 0; i < 1_000_000; i++) {
      const zodSchema = z.object({
        username: z.string(),
        password: z.string(),
        age: z.number().optional(),
        address: z.object({
          street: z.string().nullish(),
          city: z.string().nullable(),
          date: z.date().optional(), // Optional date field
        }),
        tags: z.array(z.string()),
      });
    }
  });
  result.zod = zod;

  const zodMiniResult = {};
  zodMiniResult['1'] = benchmark('@zod/mini 1', () => {
    for (let i = 0; i < 1; i++) {
      const zodMiniSchema = zodMini.object({
        username: zodMini.string(),
        password: zodMini.string(),
        age: zodMini.optional(zodMini.number()),
        address: zodMini.object({
          street: zodMini.nullish(zodMini.string()),
          city: zodMini.nullable(zodMini.string()),
          date: zodMini.optional(zodMini.date()), // Optional date field
        }),
        tags: zodMini.array(zodMini.string()),
      });
    }
  });

  zodMiniResult['1_000'] = benchmark('@zod/mini 1_000', () => {
    for (let i = 0; i < 1_000; i++) {
      const zodMiniSchema = zodMini.object({
        username: zodMini.string(),
        password: zodMini.string(),
        age: zodMini.optional(zodMini.number()),
        address: zodMini.object({
          street: zodMini.nullish(zodMini.string()),
          city: zodMini.nullable(zodMini.string()),
          date: zodMini.optional(zodMini.date()), // Optional date field
        }),
        tags: zodMini.array(zodMini.string()),
      });
    }
  });

  zodMiniResult['1_000_000'] = benchmark('@zod/mini 1_000_000', () => {
    for (let i = 0; i < 1_000_000; i++) {
      const zodMiniSchema = zodMini.object({
        username: zodMini.string(),
        password: zodMini.string(),
        age: zodMini.optional(zodMini.number()),
        address: zodMini.object({
          street: zodMini.nullish(zodMini.string()),
          city: zodMini.nullable(zodMini.string()),
          date: zodMini.optional(zodMini.date()), // Optional date field
        }),
        tags: zodMini.array(zodMini.string()),
      });
    }
  });
  result.zodMini = zodMiniResult;

  const yupResult = {};
  yupResult['1'] = benchmark('yup 1', () => {
    for (let i = 0; i < 1; i++) {
      const yupSchema = yup.object({
        username: yup.string().required(),
        password: yup.string().required(),
        age: yup.number().optional(),
        address: yup.object({
          street: yup.string().nullable(),
          city: yup.string().nullable(),
          date: yup.date().optional(), // Optional date field
        }),
        tags: yup.array().of(yup.string().required()).required(),
      });
    }
  });

  yupResult['1_000'] = benchmark('yup 1_000', () => {
    for (let i = 0; i < 1_000; i++) {
      const yupSchema = yup.object({
        username: yup.string().required(),
        password: yup.string().required(),
        age: yup.number().optional(),
        address: yup.object({
          street: yup.string().nullable(),
          city: yup.string().nullable(),
          date: yup.date().optional(), // Optional date field
        }),
        tags: yup.array().of(yup.string().required()).required(),
      });
    }
  });

  yupResult['1_000_000'] = benchmark('yup 1_000_000', () => {
    for (let i = 0; i < 1_000_000; i++) {
      const yupSchema = yup.object({
        username: yup.string().required(),
        password: yup.string().required(),
        age: yup.number().optional(),
        address: yup.object({
          street: yup.string().nullable(),
          city: yup.string().nullable(),
          date: yup.date().optional(), // Optional date field
        }),
        tags: yup.array().of(yup.string().required()).required(),
      });
    }
  });
  result.yup = yupResult;

  const superStructResult = {};
  superStructResult['1'] = benchmark('superStruct 1', () => {
    for (let i = 0; i < 1; i++) {
      const superStructSchema = superStruct.object({
        username: superStruct.string(),
        password: superStruct.string(),
        age: superStruct.number(),
        address: superStruct.object({
          street: superStruct.optional(superStruct.string()),
          city: superStruct.optional(superStruct.string()),
          date: superStruct.optional(superStruct.date()), // Optional date field
        }),
        tags: superStruct.array(superStruct.string()),
      });
    }
  });

  superStructResult['1_000'] = benchmark('superStruct 1_000', () => {
    for (let i = 0; i < 1_000; i++) {
      const superStructSchema = superStruct.object({
        username: superStruct.string(),
        password: superStruct.string(),
        age: superStruct.number(),
        address: superStruct.object({
          street: superStruct.optional(superStruct.string()),
          city: superStruct.optional(superStruct.string()),
          date: superStruct.optional(superStruct.date()), // Optional date field
        }),
        tags: superStruct.array(superStruct.string()),
      });
    }
  });

  superStructResult['1_000_000'] = benchmark('superStruct 1_000_000', () => {
    for (let i = 0; i < 1_000_000; i++) {
      const superStructSchema = superStruct.object({
        username: superStruct.string(),
        password: superStruct.string(),
        age: superStruct.number(),
        address: superStruct.object({
          street: superStruct.optional(superStruct.string()),
          city: superStruct.optional(superStruct.string()),
          date: superStruct.optional(superStruct.date()), // Optional date field
        }),
        tags: superStruct.array(superStruct.string()),
      });
    }
  });
  result.superStruct = superStructResult;

  const joiResult = {};
  joiResult['1'] = benchmark('joi 1', () => {
    for (let i = 0; i < 1; i++) {
      const joiSchema = Joi.object({
        username: Joi.string().required(),
        password: Joi.string().required(),
        age: Joi.number().required(),
        address: Joi.object({
          street: Joi.string().optional(), // Allow null for street
          city: Joi.string().optional(),
          date: Joi.date().optional(), // Optional date field
        }),
        tags: Joi.array().items(Joi.string().required()).required(),
      });
    }
  });

  joiResult['1_000'] = benchmark('joi 1_000', () => {
    for (let i = 0; i < 1_000; i++) {
      const joiSchema = Joi.object({
        username: Joi.string().required(),
        password: Joi.string().required(),
        age: Joi.number().required(),
        address: Joi.object({
          street: Joi.string().optional(), // Allow null for street
          city: Joi.string().optional(),
          date: Joi.date().optional(), // Optional date field
        }),
        tags: Joi.array().items(Joi.string().required()).required(),
      });
    }
  });

  joiResult['1_000_000'] = benchmark('joi 1_000_000', () => {
    for (let i = 0; i < 1_000_000; i++) {
      const joiSchema = Joi.object({
        username: Joi.string().required(),
        password: Joi.string().required(),
        age: Joi.number().required(),
        address: Joi.object({
          street: Joi.string().optional(), // Allow null for street
          city: Joi.string().optional(),
          date: Joi.date().optional(), // Optional date field
        }),
        tags: Joi.array().items(Joi.string().required()).required(),
      });
    }
  });
  result.joi = joiResult;

  return result;
}

const testDataGood = {
  username: 'john_doe',
  password: 'securepassword',
  age: 30,
  address: {
    street: '123 Main St',
    city: 'New York',
    date: new Date(),
  },
  tags: ['developer', 'typescript'],
};

const testDataBad = {
  username: 'john_doe',
  password: 'securepassword',
  age: 30,
  address: {
    street: '123 Main St',
    city: 'New York',
    date: new Date(),
  },
};

console.table(scenarioCreatingSchema());
console.table(scenarioParseSchema(testDataGood));
console.table(scenarioParseSchema(testDataBad));
