# Project facts (verified)

## Stack

- Runtime: Node.js. CI pins **Node 24** (`.github/workflows/ci.yml`). Local
  `agent:doctor` requires >= 22 (minimum for `--experimental-strip-types`,
  used by the test runner) and recommends 24 to match CI.
- Package manager: npm (`package-lock.json` is the lockfile of record).
- Language: TypeScript, compiled with `tsc --noEmit` only for type-checking —
  **tsup** (not `tsc`) produces the actual build output (dual ESM/CJS + `.d.ts`).
- Module system: pure ESM source (`src/**/*.ts`), dual ESM/CJS published output.
- Lint/format: [Biome](../biome.json) — single config, `check` is read-only,
  `check --fix --unsafe` is the only mutating variant.
- Git hooks: husky `pre-commit` → `lint-staged` → `npm run lint` on staged
  `ts/js/mjs`; `commit-msg` → commitlint (conventional commits enforced).
- No Windows support has been verified. CI only runs `ubuntu-latest`.

## Module layout

- [src/index.ts](../src/index.ts) — core schema primitives (`object`, `array`,
  `union`, `enumSchema`, `literal`, modifiers: optional/nullable/nullish/
  default/catch/pipe/refine/transform, parse context, `derive()`,
  `contextRef()`, `withContext()`). This is the only file every subpath import
  depends on.
- [src/string.ts](../src/string.ts), [src/number.ts](../src/number.ts),
  [src/array.ts](../src/array.ts) — type-specific constraint extenders,
  imported for side effects (`sideEffects` in [package.json](../package.json)
  lists every file this matters for — keep it in sync with new extender files).
- [src/coerce.ts](../src/coerce.ts) — coercion extender.
- [src/full.ts](../src/full.ts) — convenience bundle of string+number+array+coerce
  only. Does **not** include `standard.ts` (documented, intentional split).
- [src/standard.ts](../src/standard.ts) — opt-in Standard Schema / Standard
  JSON Schema extender (`schema['~standard']`), separate subpath
  `@esmj/schema/standard`, not pulled in by `full`.
- Parser replacements (`union`, `contextRef`) assign `_parse` directly;
  `hookParse` is for wrapping an existing parser. Standard modifier tracking
  shares `wrapMethod`, including transform hint updates and refine's
  clone-binding refresh.
- Subpath exports are declared in `package.json`'s `exports` map — any new
  entry file needs a matching `exports` entry, `tsup.config.mjs` entry, and
  `sideEffects` listing (see [utils/syncSideEffects.mjs](../utils/syncSideEffects.mjs)
  and [utils/verifyDtsEntryPoints.mjs](../utils/verifyDtsEntryPoints.mjs), both
  run automatically as part of `npm run build`).

## Boundaries

- Single maintainer repo (`package.json` `author`). No separate code-owner
  mapping.
- Public API surface = whatever is exported from the subpath entry files above
  plus the `exports` map in `package.json`. Treat changes to either as a
  contract change requiring the refactor workflow.
- Owner-approved breaking change (2026-10-14): removed the `hookOriginal`
  export and its two generic-forwarding compatibility tests. Built-ins use
  private `hookParse(schema, action)`, which wraps only `_parse` and forwards
  `(value, options)`; it is not a public replacement. See the unreleased
  migration note in [CHANGELOG.md](../CHANGELOG.md).
- No runtime dependencies in `dependencies` — only `devDependencies` (including
  comparison libraries like zod/yup/valibot used only in docs/benchmarks, never
  imported by `src/`). Do not add a runtime dependency without separate approval.

## Known in-flight work (do not treat as settled contract)

As of this setup, the working tree has an uncommitted, in-progress
symbol-keyed-fields feature (modified `src/index.ts`, `src/standard.ts`,
`README.md`, `package.json`; new `docs/`, `benchmark/symbols.ts`, and
`src/__tests__/object-symbols*`). This setup does not touch or depend on that
diff; see [DECISIONS.md](DECISIONS.md) for how this was handled during setup.
