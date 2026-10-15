# Setup acceptance evidence (2026-10-12)

Commands, counts, and exit codes captured while installing this agent setup.
Node 24.18.0, npm 11.16.0, macOS (local); CI remains ubuntu-latest/Node 24
(unchanged by this setup).

| Check | Result | Evidence |
|---|---|---|
| Working-tree preservation | **PASS** | Pre-existing modified/untracked files (`README.md`, `package.json`, `src/index.ts`, `src/standard.ts`, `docs/`, `benchmark/symbols.ts`, 3 new test files) left untouched; only new files added plus the documented `biome.json`/`package.json` script additions. |
| `agent:doctor` (read-only preflight) | **PASS** | `npm run agent:doctor` → Node 24.18.0 ✓, npm 11.16.0 ✓, `npm ls --depth=0` ✓, dirty-tree notice printed (non-fatal). Exit 0. |
| `agent:check:guidance` | **PASS** | `npm run agent:check:guidance` → "checked 55 link(s) across 9 guidance file(s)", 0 issues. Exit 0. |
| Focused test selection | **PASS** | `npm run agent:test:unit -- src/__tests__/literal.test.mjs` ran exactly that file's `src/__tests__` slice, not the full test surface. |
| Invalid selection fails | **PASS** | `node --test --experimental-strip-types src/__tests__/does-not-exist.test.mjs` → `Could not find '...'`, exit 1. |
| False-green prevention (gate composition) | **PASS** | `scripts/agent/__tests__/run.test.mjs`: a 3-step gate with a failing middle step returns that step's exit code (7) and reports the trailing step as NOT RUN — verified both as a unit test and live in `agent:verify`'s own `b failed … NOT RUN: c` self-check line. |
| Read-only checks don't mutate | **PASS** | `agent:lint`/`agent:doctor`/`agent:check:guidance` use no `--fix`; `git status` unchanged by running them. |
| Gate composition / CI parity | **PASS** | `npm run agent:verify` → test:unit → types → lint → build → test:size, exit 0 for all 5 steps (full log captured locally and not committed; saving logs is optional, and any needed temporary logs belong under repository-root `tmp/`). |
| Full test suite | **PASS** | At setup time, `npm test` passed cleanly. Current behavior is intentionally narrower: `npm test` / `npm run test:unit` cover only `src/__tests__`, while tooling checks run separately via `npm run agent:test:tooling`. |
| Lint | **PASS** | `npm run lint` → "Checked 46 files ... No fixes applied." (Biome `include` extended to cover `scripts/agent/**/*.mjs`.) |
| Types | **PASS** | `npm run typecheck` → `tsc --noEmit`, 0 errors. |
| Build | **PASS** | `npm run build` → tsup + syncSideEffects + verifyDtsEntryPoints, "All 7 declaration entry point(s) typecheck cleanly." |
| Size budgets | **PASS** | `npm run agent:test:size` → all 7 entries within their initial budget (index 2762/3000, full 3657/4000, string 3191/3500, number 3064/3400, array 3081/3400, coerce 2812/3100, standard 4215/4700 bytes gzip). |
| Tooling regression tests | **PASS** | `npm run agent:test:tooling` → 15/15 passed (gate composition, guidance-link/frontmatter validation, size-budget comparison, node-version check — all against isolated fixtures, no real repo files mutated). |
| Guidance integrity (links, skill frontmatter, acyclic routing) | **PASS** | Covered by `agent:check:guidance` above plus dedicated fixture tests (`guidance.test.mjs`) for dangling links, name/folder mismatch, missing description, and routing cycles. |

## Client loading

| Client | Result |
|---|---|
| VS Code + GitHub Copilot | **Native discovery confirmed** via Copilot's own bundled customization docs (`AGENTS.md` at repo root is a recognized agent-instructions file; `.agents/skills/<name>/SKILL.md` is a recognized skill location). Actual in-session loading of this specific `AGENTS.md` body was **not separately re-verified** after creation — recommend confirming via your customization diagnostics in a fresh session. |
| Cursor | **NOT RUN** — Cursor is not installed in this environment. `.cursor/rules/agent-router.mdc` was created per documented `.mdc` + frontmatter convention but its syntax is **not runtime-verified**. |
| Claude Code | **NOT RUN** — Claude Code CLI is not installed in this environment. `CLAUDE.md`'s `@AGENTS.md` import and the `.claude/skills/*/SKILL.md` adapters follow documented conventions but are **not runtime-verified**. |

## Portability

No absolute paths, source-project names, or constants from any other
repository appear in `AGENTS.md`, `agents/*.md`, or `.agents/skills/*/SKILL.md`
— all facts were derived from this repository's own `package.json`,
`tsconfig.json`, `biome.json`, and `.github/workflows/ci.yml`.

## Known gaps / N/A

- `agent:test:integration`, `agent:test:e2e` — N/A, no such suites exist.
- `agent:test:performance`, `agent:check:exports` — N/A for this setup (see
  [DECISIONS.md](DECISIONS.md)); `agent:test:size` was added instead, per
  explicit approval.
- Windows support — not verified (CI only runs `ubuntu-latest`); the `agent:*`
  scripts are plain Node/npm and should work, but this was not tested on
  Windows.
- `.github/workflows/ci.yml` itself is unchanged — `agent:test:size` is not
  yet wired into CI (deferred, see DECISIONS.md).
