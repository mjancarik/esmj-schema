import { performance } from 'node:perf_hooks';
import { Type } from '@sinclair/typebox'; // Import TypeBox
import { Value } from '@sinclair/typebox/value';
import { z as zodMini } from '@zod/mini'; // Import Zod Mini
import { type } from 'arktype';
import { Schema } from 'effect';
import Joi from 'joi'; // Import Joi
import superStruct from 'superstruct'; // Import Superstruct
import * as yup from 'yup'; // Import Yup
import { late, z } from 'zod'; // Import Zod
import { s } from '../src/index.ts'; // Import @esmj/schema

function fixLength(string: string, length: number) {
  if (string.length >= length) {
    return string;
  }
  return ' '.repeat(length - string.length) + string;
}

function formatNumber(num: number) {
  return `${num
    .toFixed(2)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;
}

function makeStatistics(results: number[]) {
  const sum = results.reduce((a, b) => a + b, 0);
  const average = sum / results.length;
  const min = Math.min(...results);
  const max = Math.max(...results);
  const divergence =
    results
      .map((result) => {
        return Math.abs(result - average);
      })
      .reduce((a, b) => a + b, 0) / results.length;
  return {
    sum,
    min,
    max,
    average,
    divergence,
    toString() {
      return `SUM: ${formatNumber(sum)} | MIN: ${formatNumber(min)} | MAX: ${formatNumber(max)} | AVG: ${formatNumber(average)} ± ${((divergence / average) * 100).toFixed(2)}%`;
    },
  };
}

function benchmark(label: string, fn: () => void) {
  const REPEAT = 10;
  const resultsOperation: number[] = [];
  const resultsLatency: number[] = [];
  let time = 0;

  for (let i = 0; i < REPEAT; i++) {
    const start = performance.now();
    let operation = 0;

    while (true) {
      fn();
      operation += 1;
      if (start + 1000 < performance.now()) {
        break;
      }
    }

    const end = performance.now();
    const interval = end - start;
    time += interval;
    const operationPerSecond = operation / (interval / 1000);
    const latencecy = interval / operation;
    resultsOperation.push(operationPerSecond);
    resultsLatency.push(latencecy);
    global?.gc?.();
  }

  const operation = makeStatistics(resultsOperation);
  const latency = makeStatistics(resultsLatency);

  console.log(
    `${label} results: ${operation.toString()} | ${latency.toString()}`,
  );

  return {
    'Throughput average (ops/s)': `${fixLength(formatNumber(operation.average), 18)} ± ${fixLength(((operation.divergence / operation.average) * 100).toFixed(2), 5)}%`,
    'Latency average (μs)': `${fixLength(formatNumber(latency.average * 1_000), 12)} ± ${fixLength(((latency.divergence / latency.average) * 100).toFixed(2), 5)}%`,
  };
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

  const arktypeSchema = type({
    username: 'string',
    password: 'string',
    age: 'number?',
    address: {
      'street?': 'string',
      'city?': 'string',
      'date?': 'Date',
    },
    tags: 'string[]',
  });

  const typeboxSchema = Type.Object({
    username: Type.String(),
    password: Type.String(),
    age: Type.Optional(Type.Number()),
    address: Type.Object({
      street: Type.Optional(Type.String()),
      city: Type.Optional(Type.String()),
      date: Type.Optional(Type.Date()), // Optional date field
    }),
    tags: Type.Array(Type.String()),
  });

  const effectSchema = Schema.Struct({
    username: Schema.String,
    password: Schema.String,
    age: Schema.optional(Schema.Number),
    address: Schema.Struct({
      street: Schema.optional(Schema.String),
      city: Schema.optional(Schema.String),
      date: Schema.optional(Schema.ValidDateFromSelf),
    }),
    tags: Schema.Array(Schema.String),
  });

  const result = {} as Record<string, object>;

  result['@esmj/schema'] = benchmark('@esmj/schema', () => {
    esmjSchema.safeParse(testData);
  });

  result['zod@3'] = benchmark('zod', () => {
    zodSchema.safeParse(testData);
  });

  result['@zod/mini'] = benchmark('@zod/mini', () => {
    zodMiniSchema.safeParse(testData);
  });

  result.Yup = benchmark('Yup', () => {
    yupSchema.isValidSync(testData);
  });

  result.Superstruct = benchmark('Superstruct', () => {
    superStruct.is(testData, superStructSchema);
  });

  result.Joi = benchmark('Joi', () => {
    try {
      joiSchema.validate(testData);
    } catch (e) {}
  });

  result['@sinclair/typebox'] = benchmark('@sinclair/typebox', () => {
    Value.Parse(typeboxSchema, testData);
  });

  result.ArkType = benchmark('ArkType', () => {
    arktypeSchema(testData);
  });

  result['effect/Schema'] = benchmark('effect/Schema', () => {
    Schema.encodeEither(effectSchema)(testData);
  });

  return result;
}

function scenarioCreatingSchema() {
  const result = {} as Record<string, object>;

  result['@esmj/schema'] = benchmark('@esmj/schema', () => {
    s.object({
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
  });

  result['zod@3'] = benchmark('zod', () => {
    z.object({
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
  });

  result['@zod/mini'] = benchmark('@zod/mini', () => {
    zodMini.object({
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
  });
  result.Yup = benchmark('Yup', () => {
    yup.object({
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
  });

  result.Superstruct = benchmark('Superstruct', () => {
    superStruct.object({
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
  });

  result.Joi = benchmark('Joi', () => {
    Joi.object({
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
  });

  result['@sinclair/typebox'] = benchmark('@sinclair/typebox', () => {
    Type.Object({
      username: Type.String(),
      password: Type.String(),
      age: Type.Optional(Type.Number()),
      address: Type.Object({
        street: Type.Optional(Type.String()),
        city: Type.Optional(Type.String()),
        date: Type.Optional(Type.Date()), // Optional date field
      }),
      tags: Type.Array(Type.String()),
    });
  });

  result.ArkType = benchmark('ArkType', () => {
    type({
      username: 'string',
      password: 'string',
      age: 'number?',
      address: {
        'street?': 'string',
        'city?': 'string',
        'date?': 'Date',
      },
      tags: 'string[]',
    });
  });

  result['effect/Schema'] = benchmark('effect/Schema', () => {
    Schema.Struct({
      username: Schema.String,
      password: Schema.String,
      age: Schema.optional(Schema.Number),
      address: Schema.Struct({
        street: Schema.optional(Schema.String),
        city: Schema.optional(Schema.String),
        date: Schema.optional(Schema.ValidDateFromSelf),
      }),
      tags: Schema.Array(Schema.String),
    });
  });
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
  tags: ['developer', 'typescript', 123], // Invalid tag type
};

setTimeout(() => {
  global?.gc?.();
  const createScenarioResult = scenarioCreatingSchema();
  console.log('Creating schema benchmark results:');
  console.table(createScenarioResult);

  global?.gc?.();
  const parseScenarioResultWithGoodData = scenarioParseSchema(testDataGood);
  console.log('Parsing schema with good data benchmark results:');
  console.table(parseScenarioResultWithGoodData);

  global?.gc?.();
  const parseScenarioResultWithBadData = scenarioParseSchema(testDataBad);
  console.log('Parsing schema with bad data benchmark results:');
  console.table(parseScenarioResultWithBadData);

  console.log('Benchmarking completed.');
}, 1000);
