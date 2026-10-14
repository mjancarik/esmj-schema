import { type Infer, s } from '../index.ts';

const id = Symbol('id');
const optional = Symbol('optional');
const schema = s.object({
  [id]: s.string(),
  [optional]: s.number().optional(),
});
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B
  ? 1
  : 2
  ? true
  : false;
type Expect<T extends true> = T;
export type Keys = Expect<
  Equal<keyof Infer<typeof schema>, typeof id | typeof optional>
>;
export type Value = Expect<Equal<Infer<typeof schema>[typeof id], string>>;
export type Optional = Expect<
  Equal<Infer<typeof schema>[typeof optional], number | undefined>
>;
const nested = s.object({ rows: s.array(schema) });
export type Nested = Expect<
  Equal<Infer<typeof nested>['rows'][number], Infer<typeof schema>>
>;
schema.parse({ [id]: 'id' });
// @ts-expect-error Symbol values must match the declared field schema.
schema.parse({ [id]: 42 });
// @ts-expect-error Symbol definition values must be schemas.
s.object({ [id]: 42 });
schema.derive((row) => ({ [id]: row[id].toUpperCase() }));

const nullable = Symbol('nullish');
const nullish = Symbol('nullish');
const mixed = s.object({
  text: s.string(),
  optionalText: s.string().optional(),
  nullableText: s.string().nullable(),
  nullishText: s.string().nullish(),
  [id]: s.string(),
  [optional]: s.number().optional(),
  [nullable]: s.number().nullable(),
  [nullish]: s.number().nullish(),
});
type MixedOutput = {
  text: string;
  optionalText: string | undefined;
  nullableText: string | null;
  nullishText: string | null | undefined;
  [id]: string;
  [optional]: number | undefined;
  [nullable]: number | null;
  [nullish]: number | null | undefined;
};
export type MixedExact = Expect<Equal<Infer<typeof mixed>, MixedOutput>>;
export type MixedKeys = Expect<
  Equal<keyof Infer<typeof mixed>, keyof MixedOutput>
>;
const derived = mixed.derive(
  (row) => {
    type RowExact = Expect<Equal<typeof row, MixedOutput>>;
    const exact: RowExact = true;
    return exact
      ? { text: row.text, [nullish]: row[nullable] ?? undefined }
      : {};
  },
  { when: 'missing' },
);
export type DerivedExact = Expect<Equal<Infer<typeof derived>, MixedOutput>>;
const mixedNested = s.object({ rows: s.array(mixed) });
export type MixedNestedExact = Expect<
  Equal<Infer<typeof mixedNested>, { rows: MixedOutput[] }>
>;
mixed.parse({ text: 'text', nullableText: null, [id]: 'id', [nullable]: null });
// @ts-expect-error Local Symbols with the same description have distinct key types.
export type DistinctSymbols = Expect<Equal<typeof nullable, typeof nullish>>;
// @ts-expect-error Nullable Symbol fields reject strings.
mixed.parse({ text: 'text', [id]: 'id', [nullish]: 1, [nullable]: 'wrong' });
// @ts-expect-error A nullish Symbol field still rejects values of the wrong non-nullish type.
mixed.parse({ [nullish]: 'wrong' });
