# Explicit Symbol-keyed fields: risks and implementation plan

Prepared 2026-10-10 against `@esmj/schema` **0.9.2**.

## Supersession — approved fixed snapshots (2026-10-11)

The original review below is historical. The user clarified that external
definition-map mutation was not intended and approved fixed shallow snapshots.
This supersedes all requirements below to reread mutable object definitions or
avoid key caching. It does not authorize changing mutable union branches, child
schemas, derive overrides, shared prototypes, or release/consumer work.

At construction capture `for...in` string order (including inherited enumerable
strings), then own enumerable Symbols, and their schema references. Evaluate
included getters once; never capture child `_parse` functions. Later external
map edits/prototype/enumerability changes are isolated. Child modifiers remain
live; shallow object clones share captured children. Per the 2026-10-14 owner
simplification, descriptions include all captured fields in parsing order,
including inherited strings; earlier own-only requirements below are historical.
Introspection lazily creates a frozen
null-prototype map from captured references without freezing caller input.

2026-10-14 simplification: definition mutation during construction is unsupported.
Capture each Symbol key and schema together in a single indexed loop; no separate
membership pass is required to accommodate getter side effects.

Use one indexed parse loop, keep existing failure/default/context behavior and
parse-time derive handling, and retain cycle coverage via captured mutable union
or pipe graphs. Verify fresh tests/declarations/built entrypoints and matched
raw/gzip sizes. Performance must be no worse than pinned pre-Symbol commit
`c335e10b4311e673fd80c1acb3107db6810962a6`, including construction; faster parsing
does not excuse slower construction. The mutable-Symbol candidate's earlier
failed measurements remain in [the verification report](symbol-keyed-fields-verification.md).

**Status: planning only.** Option 1 (extend `s.object()`) is recommended,
conditional on the decisions below. This review does not authorize production
edits, release actions, or consumer updates. Only this document was added.

## Verified baseline

- Initial working tree and diff were clean. No tracked repository agent/instruction
  files were found by the instruction audit. Repository memory was consulted and
  checked against current source; old test counts are not the current baseline.
- Local environment: macOS, Node **24.18.0**, TypeScript **6.0.2**. CI uses Node 24.
- Runtime probes imported source with `node --experimental-strip-types
  --input-type=module`. Compiler probes used the installed TypeScript compiler API
  with an in-memory source file; no probe files or generated output were written.
- Searches excluded `.history/`, `backup/`, `*.bak`, `*~`, dependency and build trees.

| Check | Result | Measured wall time |
| --- | --- | --- |
| `npm run test` | 479 tests, 61 suites; 479 passed, 0 failed/skipped/cancelled/todo | 0.72 s; runner reported 474.602292 ms |
| `npm run typecheck` | Passed | 0.94 s |
| `npm run lint` | Passed; 29 files checked, no fixes | 0.53 s; Biome reported 40 ms |
| Source runtime probes | Confirmed failures/behaviors below | Not individually timed |
| In-memory compiler probes | Confirmed typing gaps below | Not individually timed |

**NOT RUN:** retained new regression tests, build, declaration artifact verification,
built ESM/CJS execution, bundle-size measurement, benchmark, CI execution, consumer
unit/integration/browser checks. No red-to-green claim: implementation has not begun.
Node emitted the existing module-type warning while importing source. No manifest
change was made to suppress it.

## Confirmed risks and proposal corrections

### 1. High: silently skipped validation and runtime ID loss

The [object field loop](../src/index.ts#L488-L516) enumerates only string keys.
Source probes with mixed string/Symbol definitions produced:

- Valid Symbol value: success, Symbol stripped.
- Numeric value for a declared Symbol string field: success, Symbol stripped.
- Missing required Symbol field: success.
- Standard validation of an invalid Symbol-only object: `{ value: {} }`.
- Description: only the declared string field appears.

This is a correctness issue, not generic passthrough support. Only declared own
enumerable Symbol definition keys should be added. Match by identity and use the
existing `_parse`/failure pipeline, not unchecked copying.

### 2. High: output inference works, but Symbol schema values are unchecked

The current [object type contract](../src/index.ts#L158-L163) can already infer a
unique Symbol key and its string output, and rejects a numeric *input value* for
that field. However, the compiler accepts `s.object({ [id]: 123 })` while rejecting
`s.object({ text: 123 })`. This was confirmed under both current compiler options
and an isolated strict compiler probe.

The string index constraint does not enforce that Symbol-keyed definition values
are schemas. Adding runtime traversal without closing this hole can turn an
accepted TypeScript program into `definition[key]._parse` failure.

Audit `Record<PropertyKey, SchemaType>` (or a precise self-mapped alternative) in
`object()`, `ObjectSchemaInterface`, recursive `SchemaType` references and internal
accumulators. Preserve inferred `keyof T`; do not replace the actual shape with a
broad symbol index signature. The exact replacement has not yet been compiler-tested
against the whole test matrix.

Two existing type limitations are separate from this repair:

- Object input and output are both mapped from field `parse()` return types.
  A Symbol field transforming string to number currently makes the object call
  reject the actual string input and accept number at compile time. Preserve
  current parity with string fields; fixing composite input inference needs scope.
- `parse()` accepts `Partial<Input>`; missing required fields are not rejected
  statically. Optional output fields are present keys with `undefined` in their
  value type, not optional properties. Existing typecheck is not strict, so add
  isolated strict assertions for meaningful optional/nullish type coverage without
  changing project-wide compiler settings.

### 3. High: key formatting is not the only Symbol-related TypeError

[Error path helpers](../src/index.ts#L289-L337) interpolate the parent key.
Widen their internal parameters and explicitly render `String(key)`, while keeping
public `ErrorStructure.cause.key?: string` unchanged.

There is also a verified pre-existing **value-formatting** problem:
`s.string().safeParse(Symbol('bad'))` throws `TypeError`, because the shared
[default error factory](../src/index.ts#L1076-L1079) interpolates the value. A new
Symbol field with a Symbol *value* can hit this before key formatting occurs.
Approve a small shared factory conversion to `String(value)` and retain unchanged
string-only messages. Test Symbol values as well as numeric invalid values.
This limited repair covers schemas using the shared factory, not all built-in
messages: enum/literal/union/cast have other interpolating factories. Audit and
name those exclusions, or obtain approval for their targeted repair before
claiming ordinary diagnostics for every built-in Symbol-value rejection.
This does not promise to catch arbitrary exceptions from custom callbacks/getters
or user-defined string conversion; broad exception hardening is separate scope.

Dotted paths remain diagnostic text, not Symbol identities. Distinct Symbols with
the same description collide, and descriptions containing dots split into extra
segments in [Standard validation](../src/standard.ts#L117-L133). A string key named
`Symbol(id)` can also collide with a Symbol label. Preserve the current public
shape; do not add `cause.path` or promise lossless Standard paths. The adapter's
declared `PropertyKey[]` path type already permits Symbols, but its current source
does not have identity-preserving path information.

### 4. High: JSON Schema rejection has bypass paths

Current [object conversion](../src/standard.ts#L324-L353) silently omits Symbols;
both input and output probes returned an empty `properties` map for a Symbol-only
definition. Throwing at this owner handles ordinary object/array/union recursion.

However, [output conversion](../src/standard.ts#L388-L422) can return a `pipeTarget`
or replacement `outputHint` without traversing the original definition. Both
bypasses were reproduced. A check only in the object case does **not** guarantee
that every schema containing a Symbol definition rejects output conversion.

Approve one precise policy before coding:

- **Recommended for this proposal:** reject any explicit enumerable Symbol object
  definition in the known source graph or applicable pipe-target graph for either
  conversion mode, including beneath replacement hints. This follows the proposal's
  separate-JSON-projection rule, but requires a small cycle-safe preflight rather
  than only an object-case guard. Use the known composite owners, preserve runtime
  validation, and do not claim introspection of arbitrary callback-generated shapes.
- Alternatively, reject only actually converted definitions and explicitly permit
  documented output projections through hints/pipes. That relaxes the proposal and
  requires approval and dedicated tests; it must not happen accidentally.

Repeated `pipe()` calls are another boundary: runtime retains each wrapped stage,
but the adapter overwrites its single `pipeTarget`. A Symbol-bearing intermediate
target can be invisible after a later pipe. Strict whole-pipeline rejection requires
approved retained-stage metadata; otherwise explicitly limit the guarantee to
currently introspectable definitions and the final tracked target. Test both
Symbol source and Symbol intermediate stages followed by a JSON-only final target.

Ignore inherited/non-enumerable Symbol **definition** keys consistently with the
runtime contract. Do not reject every Symbol returned by `Reflect.ownKeys()`.
Keep unsupported-target behavior and error precedence explicit. Do not evaluate
default factories or transforms during JSON conversion. Symbol keys hidden in
arbitrary `any()` payloads, literal default objects or supplied JSON fragments are
a different JSON-serializability concern, not solved by declaration inspection.

### 5. Medium: definition enumeration does not specify input ownership

For a declared string field, the parser uses `value.data[key]`: inherited and
non-enumerable **input** properties are read and normalized into enumerable own
output properties. Both cases were verified. Object validation accepts non-null,
non-array objects; it is not restricted to plain objects despite some comments.

**Recommended:** extend this same property-access behavior to declared Symbols.
Only the definition must be own enumerable. Thus an inherited/non-enumerable input
Symbol with a declared key is validated; an undeclared one is not accessed/copied.
Requiring own enumerable input Symbols instead creates a new asymmetry and needs
explicit approval. Symbols can be inherited through prototypes; `for...in` simply
does not enumerate them.

### 6. Medium: one universal key iterator changes existing behavior

The current behaviors differ:

| Owner | Current string behavior | Current Symbol behavior |
| --- | --- | --- |
| Field parsing | Own and inherited enumerable strings | None |
| Description | Own enumerable strings via `Object.entries()` | None |
| `derive({ when: 'always' })` | Own enumerable overrides via spread | Own enumerable overrides already copied |
| `derive({ when: 'missing' })` | Own and inherited enumerable overrides via `for...in` | None |

The proposal's request for identical key coverage in all owners conflicts with
unchanged string-only descriptions and preserved inherited behavior. Recommended:
keep each owner's existing string behavior and add own enumerable Symbols after
it. In particular, keep `Object.entries()` description behavior; do not newly
describe inherited string fields. If aligned descriptions are required, approve
and test that observable change separately.

Do not replace the parse loop with `Reflect.ownKeys()`: that loses inherited string
fields and includes non-enumerable keys. Do not refactor the already-working
always-derive spread into a `for...in` loop that gains inherited overrides.

`derive()` is post-validation; returned overrides are not revalidated, and runtime
callbacks can add undeclared fields. Preserve this existing behavior rather than
claiming all Symbol-bearing post-transform/derive output is declaration-stripped.
Reparsing can strip undeclared derived fields or rerun non-idempotent transforms.
The consumer's ID-stability assertion applies to its specific defaulted row schema,
not every schema using transforms/derive.

### 7. Medium: mutable definitions, clone semantics and hot-path cost

Definitions are held by reference and reread on every parse/description/conversion.
A probe adding a required string field after schema construction changed parse
success to failure. Do not cache key lists or freeze definitions in this slice.
Define snapshot timing if mutation occurs during getters/default factories; preserve
existing string behavior and avoid an unrelated proxy/reentrancy redesign.

`clone()` is shallow; nested definitions and field schemas remain shared. Preserve
modifier independence, not deep-clone independence. Keep `derive()` bound to `this`.
Add clone+derive+Standard tests: `derive()` is not currently wrapped by Standard's
modifier tracking, unlike `refine()`/`pipe()`/`transform()`, so independently derived
clones may expose stale adapter binding. Reproduce first; fix only with scoped
approval if it blocks Symbol clone parity, otherwise track separately.

Enumerating Symbol keys allocates even for common string-only definitions. Compare
generator/helper and separate-pass candidates using actual measurements; the source's
15% comment is not a measured baseline for this change. No speculative percentage
or new performance budget is asserted here.

### 8. Release/verification risks outside the runtime change

- [CI](../.github/workflows/ci.yml#L21-L32) uses lockfile-informed `npm install`
  rather than lockfile-enforcing `npm ci`, and caches dependencies by manifest hash
  without the tracked lockfile or Node/npm version in the key. Lockfile-only changes
  can reuse an old dependency cache; cache misses and hits can test different
  resolutions. A missing cache
  in downstream jobs has no install fallback. This is a separate reproducibility
  hardening task, not authorization to change dependencies in this feature.
- [Build artifacts](../.github/workflows/ci.yml#L62-L101) are transferred through a
  cache, including the generated manifest. Immutable caches may retain an earlier
  artifact for the same commit; restore failure is not explicitly checked. Prefer
  a separately approved upload/download artifact handoff with fail-on-missing and
  built-package smoke gates before release.
- Existing CI typechecks source and built declarations, but does not execute the
  proposed built ESM/CJS consumer fixtures. The [declaration verifier](../utils/verifyDtsEntryPoints.mjs)
  checks declaration consistency, not unique-Symbol inference through all exports.
- `postversion` pushes commits and tags; tag pushes activate publish/release jobs.
  Do not run `npm version`, commits, tags, push or publication without approval.

## Approval decisions

Before production edits, approve:

1. Option 1 and the exact own-enumerable definition/normal input property-access
   contract, with Symbols processed after existing string fields.
2. Preserve each owner's existing string behavior, including descriptions and
   always/missing derive asymmetry; no public structured-path change.
3. Strict known-graph JSON conversion rejection versus traversal-only projection
   policy, including output hints/pipes, cycles and error precedence.
4. The limited shared invalid-Symbol-value formatting repair and any reproduced
   clone/adapter binding blocker. Other existing type/adapter issues stay separate.
5. Scoped retained tests, benchmark additions and verification artifacts. Confirm
  performance acceptance criteria before implementation, not after a regression.
  **Required acceptance criterion: benchmarks must not be worse than baseline.**
  Benchmark verification is mandatory, not an optional or NOT RUN delivery gate.

## Implementation sequence after approval

### Phase A — Retained red tests and baseline artifacts

Add focused core runtime and compile-only Symbol fixtures using the existing test
conventions. Keep Standard tests isolated from the core-only import tests because
the adapter registers globally and `full` does not activate it.

Retain the proposal's complete matrix and add these missing assertions:

- Reject non-schema Symbol definition values at compile time; reject wrong parsed
  values; exact unique-Symbol `keyof`, nested/array inference and derive callback types.
- Strict optional/nullish value assertions; document existing `Partial<Input>` and
  composite transform-input limitations rather than silently repairing them.
- Numeric **and Symbol-valued** invalid fields using approved message factories
  return ordinary diagnostics; additional built-in factory exclusions are explicit.
- Inherited/non-enumerable declared input Symbols follow the approved access rule;
  inherited/non-enumerable definition Symbols are ignored. Undeclared input getters
  are not accessed. Include declared `undefined`, not just absent properties.
- String-first order, numeric-looking string keys, inherited string definitions,
  and early exit before a Symbol default runs after a failing string field.
- Distinct Symbols with identical descriptions remain distinct fields despite
  ambiguous diagnostic labels; descriptions with dots do not crash the adapter.
- `derive()` always/missing overrides, defined/null/undefined values, inherited
  overrides, and clone independence preserve their existing contracts.
- Add/delete/change definition Symbols between parses: no hidden cached key list.
- JSON input/output for both supported drafts: direct/nested objects, arrays,
  unions, optionals/defaults/nullables, hints/repeated pipes and ignored definition
  Symbols, with the approved whole-pipeline introspection boundary asserted.
- Adapter validation and derived-clone binding; JSON conversion never runs an ID
  factory. Ordinary string-only JSON conversion remains unchanged.
- Enumerability/spread/JSON omission and reparsing defaulted row IDs. Defaults
  fire once per missing field per parse, not a universal once-only guarantee.

Record exact failing test names/counts and error modes. Some behavior-preservation
and type-inference tests should already pass; do not force them to fail. Capture
fresh build, size and string-only performance baselines before changing production.

### Phase B — Minimal core changes

1. Close the Symbol definition-value typing hole with verified constraints while
   preserving precise mapped keys and the existing public input/output conventions.
2. Keep string loops and append an own-enumerable Symbol pass, or use a measured
   iterator that demonstrably preserves the approved string coverage/order. Reuse
   field validation/failure handling; preserve context, modifiers and abortEarly.
3. Add Symbol descriptions and missing-mode overrides using their existing owners;
   leave always-mode spread semantics and shallow clone behavior unchanged.
4. Widen internal key parameters and explicitly stringify diagnostic keys; apply
   the approved default value-formatting repair without changing the error shape.

### Phase C — Optional Standard adapter

Implement the approved JSON conversion guard/preflight solely in the adapter.
Retain runtime Symbol validation/preservation through the core. If structured
identity-safe paths or new introspection hooks become necessary, stop and present
their exact public/internal contract for approval instead of extending scope silently.

### Phase D — Full verification and independent review

- Run `npm test`, `npm run typecheck`, `npm run lint` (read-only), `npm run build`.
  Build already runs `utils/syncSideEffects.mjs` and
  `utils/verifyDtsEntryPoints.mjs`; review manifest changes rather than resetting them.
- Add approved artifact consumers exercising core/full/standard and affected
  subpaths in isolated ESM/CJS processes; compile strict consumers of actual built
  declarations, not only source fixtures. Do not manually edit generated output.
- Run `npm run benchmark`; capture elapsed time and results. Existing comparative
  scenarios run ten roughly one-second samples per participant and do not cover
  Symbols. Add separately scoped string-only and Symbol/nested/default scenarios,
  with fixed inputs, warmup, repeated baseline/candidate samples on the same runtime,
  throughput/latency and variance. Distinguish schema construction from hot parsing.
- **Blocking performance gate:** existing supported workloads must show no worse
  throughput or latency than the unchanged baseline under identical benchmark
  settings. Capture the baseline before production edits and compare all existing
  `@esmj/schema` scenarios, including construction, successful parsing and failure
  paths where covered. New Symbol workloads must also be measured, but the old
  parser's skipped Symbol validation is not a valid equivalent-work baseline.
  If results regress or measurement variance prevents establishing non-regression,
  optimize and repeat the full comparison or report the gate as unresolved. Do not
  declare verification complete, select only favorable samples, weaken the harness,
  relax the criterion or proceed to release with a failed/unresolved benchmark gate.
- Measure fresh built core/full/standard gzip and raw sizes using the repository's
  established `@esmj/size --local` invocation, pinned/recorded tool version. Compare
  identical import snippets before/after; stale build artifacts are invalid evidence.
- Review the complete diff, ordering, scope, error shape, typings and generated
  sideEffects. Keep all existing assertions; no skipped tests, relaxed budgets,
  retries to conceal failures, unsafe lint fixes or dependency substitutions.
- Deliver exact commands, Node/compiler versions, timings, counts, red-to-green
  evidence, artifact results, performance/size deltas and an explicit NOT RUN list.

### Phase E — Release and consumer gates (separate approval)

Recommend **0.10.0 as a candidate minor**, not an authorized release: formerly
ignored declared fields now validate, JSON conversion becomes rejecting, and type
constraints reject previously accepted invalid definitions. Confirm the library's
pre-1.0 versioning policy before choosing the final version. Do not assume patch.

After an approved upstream release, obtain separate Mrakomor adoption approval.
Consumer paths in the proposal are not files in this checkout and were not audited
here. Keep legacy string-ID migration at its approved input boundary; simplify
List/TtsList only afterward. Rerun consumer unit/integration/browser/full gates.
Symbol-aware validation does not repair JSON/clipboard/structuredClone transport,
identity equality boundaries, or unrelated scheduling behavior. The local probe
confirmed `structuredClone()` drops enumerable Symbol-keyed IDs.