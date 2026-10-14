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
- Left the uncommitted in-progress symbol-keyed-fields diff (`src/index.ts`,
  `src/standard.ts`, `README.md`, `package.json`, `docs/`, `benchmark/symbols.ts`,
  new `src/__tests__/object-symbols*` files) completely untouched. This setup
  only adds new files; it did not revert, stash, or inspect those changes
  beyond what `git status` already shows.
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

## 2026-10-14 — Single-pass Symbol capture

- Owner rejected supporting definition getters that mutate the definition during
  construction. Capture each enumerable Symbol key and schema together in one
  indexed loop; do not add a separate membership pass for getter side effects.
- Removed the hide/expose getter-membership test for that explicitly unsupported
  scenario. Ordinary getter evaluation, post-construction snapshots, inherited
  strings and live child schemas remain unchanged.

## Rejected / deferred

- 2026-10-14 follow-up: owner approved describing all captured object fields,
  including inherited enumerable strings. Removed description-only ownership
  tracking and filtering; parsing and captured field order are unchanged.
  This supersedes the earlier own-only description requirement below.

- 2026-10-14, in-flight Symbol snapshots: owner approved replacing prototype-map
  reconstruction with flat key/schema arrays and indexed traversal. Preserve
  inherited-string order, own enumerable Symbol membership, getters once,
  shared live child parsers and lazy frozen introspection. Description ownership
  stays outside the parsing loop. See
  [verification evidence](../docs/symbol-keyed-fields-verification.md).
  This simplification does not establish the original performance acceptance.

- A `.github/copilot-instructions.md` file — would duplicate `AGENTS.md`'s
  role for the same client (see above).
- Formalizing `agent:test:performance` / `agent:check:exports` as gates now —
  no existing performance suite or export-surface budget exists beyond what
  `utils/verifyDtsEntryPoints.mjs` (already part of `npm run build`) checks;
  revisit only if a concrete need appears.
- Wiring `agent:test:size` into `.github/workflows/ci.yml` — out of scope for
  this setup; CI changes need separate review since they affect the required,
  already-green `test` job.
