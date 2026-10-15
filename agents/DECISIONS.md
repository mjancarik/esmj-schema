# Decisions

## 2026-10-12 — Initial agent setup (Option 1)

- Chose repository-local canonical guides + portable skills + thin adapters
  (Option 1) over a shared template repo (Option 2, needs a template owner/
  versioning this single-repo setup doesn't justify yet) or per-client forks
  (Option 3, would duplicate policy across three adapters for no benefit here).
- `AGENTS.md` doubles as the Copilot-native bridge file rather than adding
  `.github/copilot-instructions.md` — VS Code's own Copilot docs say to use
  only one of the two, and using both is a documented anti-pattern.
- No `agents/domains/` created — nothing in this repo currently needs a
  domain-specific guide beyond `PROJECT.md`/`TESTING.md`/`WORKFLOW.md`.
- `agent:test:integration` / `agent:test:e2e` marked N/A: this repo has one
  flat `node --test` suite, no integration or e2e suites exist.
- `agent:test:size` added (user-approved) as a **new** gate wrapping the
  already-informally-used `npx @esmj/size` check. Budgets in
  `scripts/size-budgets.json` are an **initial baseline measured against this
  repo's current `dist/` output at setup time** (not a historical or
  cross-project number) — see that file's header comment-equivalent note in
  `TESTING.md`. Expect this file to need adjustment as the in-flight
  symbol-keyed-fields feature lands.
- Node minimum for `agent:doctor` set to 22 (required for
  `--experimental-strip-types`, which the existing `npm test` script already
  depends on), recommended 24 to match CI — not a new constraint, just making
  the existing implicit requirement explicit and checkable.
- Repository-local temp-artifact convention added: agent-created logs and
  scratch files belong under `tmp/` in the repository root, with the directory
  tracked only through its own `.gitignore` so contents stay out of git.

## 2026-10-14 — Temporary artifacts only when needed

- Use terminal output by default, without saving a log for every command.
- Create temporary logs or scratch files only for a concrete need, such as
  comparing results or investigating a failure. When needed, use repository-root
  `tmp/`, not system `/tmp/`, and do not commit their contents.

## 2026-10-15 — Tighten size-budget headroom to 3%

- Owner requested 3% headroom instead of the initial approximately 15% policy.
- Remeasured freshly built published entry points with `@esmj/size` and set
  each fixed budget to `Math.ceil(measuredBytes * 1.03)`.
- Baseline gzip bytes: index 2636, full 3539, string 3074, number 2959,
  array 2969, coerce 2709, standard 4069. Budgets are not automatically rebased.

## 2026-10-15 — Direct agent commands and complete verification

- Owner approved direct `agent:*` execution rather than ad hoc duplicate
  scripts, shell filters or manual exit-code bookkeeping.
- `agent:verify:all` composes preflight, guidance, the unchanged CI-parity
  check order, tooling and staged/unstaged whitespace checks. Existing
  `agent:verify` remains independently available; no CI workflow changes.
- Shared gates print per-step status/exit-code summaries and retain fail-fast
  and signal propagation. Signals may terminate before a summary is printed.
- Agent-only tests use a small native-event adapter around Node's `spec`
  reporter. Built-in `dot` alone was rejected because it lacks detailed
  failure diagnostics and totals. User-facing tests keep their existing output.

## Symbol-keyed object fields

Retained rationale is in the [archived design summary](archive/symbol-keyed-fields-design.md);
historical test, performance and size results are in the
[verification summary](archive/symbol-keyed-fields-verification.md).
These summaries replace the superseded plans and experiment-by-experiment notes.

## Rejected / deferred

- A `.github/copilot-instructions.md` file — would duplicate `AGENTS.md`'s
  role for the same client (see above).
- Formalizing `agent:test:performance` / `agent:check:exports` as gates now —
  no existing performance suite or export-surface budget exists beyond what
  `utils/verifyDtsEntryPoints.mjs` (already part of `npm run build`) checks;
  revisit only if a concrete need appears.
- Wiring `agent:test:size` into `.github/workflows/ci.yml` — out of scope for
  this setup; CI changes need separate review since they affect the required,
  already-green `test` job.
