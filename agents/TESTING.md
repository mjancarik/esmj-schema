# Testing & verification commands

All commands below are npm scripts (see [package.json](../package.json)).
Every `agent:*` script is a thin wrapper around an existing, already-CI-proven
command, or a new read-only script under [../scripts/agent/](../scripts/agent/).
None of them install dependencies, auto-fix code, or kill processes.
Read command output directly in the terminal by default; these commands do
not require saved logs or scratch files. Only create temporary artifacts
when needed, such as for result comparisons or failure investigation. Store
those artifacts under [../tmp/](../tmp/) in the repository root, not system
`/tmp/`; do not commit their contents.

## Interface

| Command | Does | Mutates? |
|---|---|---|
| `npm run agent:doctor` | Read-only preflight: Node/npm versions, `npm ls` dependency-tree integrity, git dirty-tree notice | No |
| `npm run agent:check:guidance` | Validates links/frontmatter across `AGENTS.md`, `CLAUDE.md`, `agents/*.md`, `.agents/skills/*/SKILL.md`, `.claude/skills/*/SKILL.md`, `.cursor/rules/*.mdc` | No |
| `npm run agent:lint` | Alias for `npm run lint` (Biome `check`, no `--fix`) | No |
| `npm run agent:lint:fix` | Alias for `npm run lint:fix`. Never invoked by `agent:verify*`. | Yes (only mode that writes) |
| `npm run agent:types` | Alias for `npm run typecheck` (`tsc --noEmit`) | No |
| `npm run agent:build` | Alias for `npm run build` (`tsup --dts` + sync side effects + verify `.d.ts` entry points). Writes `dist/` (tracked-generated, already the existing convention) and nothing else. | Writes `dist/` only |
| `npm run agent:test:unit [-- <args>]` | Alias for `npm run test:unit`, which runs only `src/__tests__/*.test.mjs` via Node's built-in test runner with `--experimental-strip-types` | No |
| `npm run agent:test:tooling` | Runs only the tooling regression tests under `scripts/agent/__tests__/` | No |
| `npm run agent:test:size` | Requires `dist/` to already exist (run `agent:build` first). Measures real gzip size of every published subpath via `npx --yes @esmj/size --local . --json --code "..."` and compares against [../scripts/size-budgets.json](../scripts/size-budgets.json) | No (network: downloads `@esmj/size` via npx if not cached) |
| `npm run agent:verify:quick` | `agent:lint` + `agent:types` only. **Not a final gate.** | No |
| `npm run agent:verify` | `agent:test:unit` → `agent:types` → `agent:lint` → `agent:build` → `agent:test:size`, same order as CI's `test` job plus the new size gate at the end. Stops at first failure; later steps are reported NOT RUN. | Writes `dist/` (from the build step) |

`agent:test:integration` and `agent:test:e2e` are **N/A** — this repo has a
single flat `node --test` suite under `src/__tests__/**/*.test.mjs`, no
separate integration or browser/e2e suites exist. Do not invent them without a
real need.

## Test selection

`npm run test:unit` / `agent:test:unit` use Node's built-in test runner. To focus:

```bash
npm run agent:test:unit -- src/__tests__/array-edge-cases.test.mjs
npm run agent:test:unit -- --test-name-pattern "nullable"
```

An invalid, empty, or outside-`src/__tests__` selection must fail (Node's
runner itself errors on a non-existent path) — never silently fall back to
running everything.

## Tooling-test placement note

`npm test` / `npm run test:unit` intentionally run only `src/__tests__/*.test.mjs`.
Tooling regression tests under `scripts/agent/__tests__/` are excluded from the
user-facing test command and run only through `npm run agent:test:tooling`.

## Size budgets

[scripts/size-budgets.json](../scripts/size-budgets.json) holds an **initial baseline**
(measured against current `dist/` output at setup time, +~15% headroom), not a
historical or externally-transferred number. Adjust it only via an explicit,
approved change — see [DECISIONS.md](DECISIONS.md).

## CI parity

`.github/workflows/ci.yml`'s `test` job already runs, in order: `npm test` →
`npm run typecheck` → `npm run lint` → `npm run build`. `agent:verify` mirrors
that order exactly and adds `agent:test:size` after the build (CI itself is
not changed by this setup — update CI separately if you want it to also run
`agent:test:size`).

## Bootstrap note

Before `agent:*` existed, the existing plain `npm test` / `npm run typecheck`
/ `npm run lint` / `npm run build` commands (identical to CI) were used
directly to validate this setup. That temporary exception is retired now that
the wrappers exist — use `agent:*` going forward.

## Evidence

See [EVALUATION.md](EVALUATION.md) for the PASS/FAIL/NOT RUN results captured
when this setup was installed.
