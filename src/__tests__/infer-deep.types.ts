/**
 * Compile-time only tests for the `Infer<T>` type helper.
 *
 * This file contains no runtime assertions — it exists purely to be
 * type-checked by `tsc` (see the `typecheck` npm script). It is intentionally
 * NOT named `*.test.ts` so the Node.js test runner does not try to execute it
 * (there is nothing to run; a failure here is a *type* error reported by
 * `npm run typecheck`, not a runtime assertion failure).
 *
 * Coverage: deeply nested `object()`/`array()` schemas combined with every
 * modifier that affects the inferred `Output` type — `optional()`,
 * `nullable()`, `nullish()`, `default()`, `catch()`, `transform()`, `pipe()`,
 * `refine()`, `clone()`, `union()`, `literal()`, `enum()` and `function()`.
 */
import { type Infer, s } from '../index.ts';

// ---------------------------------------------------------------------------
// Type-equality helpers
// ---------------------------------------------------------------------------

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B
  ? 1
  : 2
  ? true
  : false;

type Expect<T extends true> = T;

// ---------------------------------------------------------------------------
// Deeply nested schema (3 levels: user -> address -> geo)
// ---------------------------------------------------------------------------

const cityField = s.string().optional();
const themeField = s.union([s.literal('light'), s.literal('dark')]);
const onEventField = s.function();
const roleField = s.enum(['admin', 'user', 'guest']);

const geoSchema = s.object({
  lat: s.number(),
  lng: s.number(),
});

const addressSchema = s.object({
  street: s.string(),
  city: cityField,
  zip: s.string().nullable(),
  country: s.string().nullish(),
  geo: geoSchema,
});

const settingsSchema = s.object({
  theme: themeField,
  notifications: s.boolean().nullish(),
  volume: s.number().default(50),
});

const userSchema = s.object({
  id: s.number(),
  name: s.string(),
  nickname: s.string().optional(),
  bio: s.string().nullable(),
  status: s.string().nullish(),
  createdAt: s.date(),
  isActive: s.boolean(),
  role: roleField,
  tag: s.union([s.literal('vip'), s.literal('regular')]),
  address: addressSchema,
  addresses: s.array(addressSchema),
  scores: s.array(s.number()),
  settings: settingsSchema,
  onEvent: onEventField,
  age: s.string().transform((val) => Number(val)),
  verifiedAge: s.number().catch(0),
  code: s
    .string()
    .transform((val) => Number(val))
    .pipe(s.number().refine((val) => val > 0)),
});

// ---------------------------------------------------------------------------
// Hand-written expected shapes
// ---------------------------------------------------------------------------

type ExpectedGeo = {
  lat: number;
  lng: number;
};

type ExpectedAddress = {
  street: string;
  city: string | undefined;
  zip: string | null;
  country: string | undefined | null;
  geo: ExpectedGeo;
};

type ExpectedSettings = {
  theme: 'light' | 'dark';
  notifications: boolean | undefined | null;
  volume: number;
};

type ExpectedUser = {
  id: number;
  name: string;
  nickname: string | undefined;
  bio: string | null;
  status: string | undefined | null;
  createdAt: Date;
  isActive: boolean;
  role: 'admin' | 'user' | 'guest';
  tag: 'vip' | 'regular';
  address: ExpectedAddress;
  addresses: ExpectedAddress[];
  scores: number[];
  settings: ExpectedSettings;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  onEvent: Function;
  age: number;
  verifiedAge: number;
  code: number;
};

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

type ActualUser = Infer<typeof userSchema>;

type CheckUser = Expect<Equal<ActualUser, ExpectedUser>>;
type CheckGeo = Expect<Equal<ActualUser['address']['geo'], ExpectedGeo>>;
type CheckAddress = Expect<Equal<ActualUser['address'], ExpectedAddress>>;
type CheckAddresses = Expect<Equal<ActualUser['addresses'], ExpectedAddress[]>>;
type CheckSettings = Expect<Equal<ActualUser['settings'], ExpectedSettings>>;
type CheckScores = Expect<Equal<ActualUser['scores'], number[]>>;

// Individual modifier checks in isolation (outside of an object context)
type CheckOptional = Expect<Equal<Infer<typeof cityField>, string | undefined>>;
const plainStringField = s.string();
type CheckPlainString = Expect<Equal<Infer<typeof plainStringField>, string>>;

// clone() must preserve the inferred Output type
const clonedUserSchema = userSchema.clone();
type CheckClone = Expect<Equal<Infer<typeof clonedUserSchema>, ExpectedUser>>;

// pipe() must preserve the *original* Input type while adopting the new
// Output type (regression check for the pipe() Input-type fix).
const pipedSchema = s
  .string()
  .transform((val) => Number(val))
  .pipe(s.number());
type CheckPipeOutput = Expect<Equal<Infer<typeof pipedSchema>, number>>;
// @ts-expect-error - Input type must remain `string`, not `number`.
pipedSchema.parse(42);
pipedSchema.parse('42'); // must NOT error

// refine() must not change the Output type, and its callback must receive
// the *current* Output type (regression check for the refine() type fix).
const refinedSchema = s
  .string()
  .transform((val) => Number(val))
  .refine((val) => {
    // `val` must be `number` here (the Output at this point in the chain),
    // not the original `string` Input.
    const _check: number = val;
    return val > 0;
  });
type CheckRefine = Expect<Equal<Infer<typeof refinedSchema>, number>>;

// union() of literals narrows to the literal union, not `string`.
type CheckUnionLiteral = Expect<
  Equal<Infer<typeof themeField>, 'light' | 'dark'>
>;

// enum() narrows to the literal union of the provided values, not `string`.
type CheckEnumLiteral = Expect<
  Equal<Infer<typeof roleField>, 'admin' | 'user' | 'guest'>
>;

// function() infers to `Function`.
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type CheckFunction = Expect<Equal<Infer<typeof onEventField>, Function>>;

export type {
  CheckUser,
  CheckGeo,
  CheckAddress,
  CheckAddresses,
  CheckSettings,
  CheckScores,
  CheckOptional,
  CheckPlainString,
  CheckClone,
  CheckPipeOutput,
  CheckRefine,
  CheckUnionLiteral,
  CheckEnumLiteral,
  CheckFunction,
};
