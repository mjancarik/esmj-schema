# Workflow

## Approval

This is a single-maintainer repository — approval means explicit sign-off
from the repository owner (the `author` in `package.json`). No separate
organization policy applies. New runtime dependencies, policy changes, and
production/library behavior fixes need that explicit approval before
implementation; routine test/lint/doc fixes within an already-approved task
do not need a separate round trip.

## Scoping and reuse

Before adding or changing shared behavior:

1. Search `src/` for an existing helper, modifier, or extender that already
   does this (see [PROJECT.md](PROJECT.md) for the module map).
2. Check callers/usages of anything you plan to change (subpath exports are
   public API — a change there is a contract change).
3. Propose the change with the alternative(s) considered if it's substantial
   (new schema primitive, new subpath, new public method) — don't silently
   expand API surface.

## Bugfix flow

1. Reproduce: write/extend a `src/__tests__/*.test.mjs` test that fails for
   the *expected* reason (not an unrelated error).
2. Confirm the test fails for the right reason, keep it red.
3. Identify the owning file (core `index.ts` vs. a type-specific extender vs.
   `standard.ts`) before changing anything.
4. Fix narrowly; do not refactor unrelated code in the same change.
5. Confirm the same test goes green; run the complete `agent:verify:all` gate.

## Refactor flow

1. Identify the owner of the shared API/type and every caller (search
   `src/`, `examples/`, `README.md` code samples, `benchmark/`).
2. Propose the new contract and alternatives considered.
3. Get scoped approval for anything that changes public behavior.
4. Migrate implementation, callers, types, tests, and docs together in one
   change — not split across unrelated commits.
5. Run `agent:verify:all`.

## Verification discipline

- A quick pass (`agent:verify:quick`) is never reported as the final gate.
- Use `agent:verify:all` for complete final verification (preflight, guidance,
   the CI-parity gate, tooling and whitespace). Keep `agent:verify` available
   separately for its existing CI-parity scope.
- Run checks directly through predefined `agent:*` commands, without shell
   output filters, manual exit-code bookkeeping or ad hoc duplicate check scripts.
   Propose an extension to an existing command when its interface is insufficient.
- Composed gates stop at the first failing step; report later steps as
  NOT RUN, never as passed.
- Never weaken a test, raise a budget, or add a retry just to get green —
  that's a reported defect/regression, not a fix.
- Report exact commands run, counts, exit codes, and artifacts (e.g. which
  `dist/` files changed) for every claim of "done" or "passing".
- Read command output directly in the terminal by default. Do not redirect
   or copy every command's output to a file. Create temporary logs or scratch
   files only when needed (e.g. to compare results or investigate a failure);
   put those artifacts in the repository-root `tmp/` directory, not system
   `/tmp/`, and do not commit their contents.

## Red lines

- Commit only on an explicit user request or direct invocation of
   [repo-commit](../.agents/skills/repo-commit/SKILL.md); follow its scope,
   verification and current-branch safeguards. Preparing a skill is not invoking it.
- No blanket `git reset --hard` / `git stash` / cleanup of files you didn't
  create.
- No global tool installs, no editing personal/editor settings.
- No publishing, tagging, or pushing — that's the human's `npm version` /
  CI pipeline.
- No killing processes or reusing a port/service you didn't start (not
  applicable today — no browser/service tests exist — but keep this rule if
  any are added later).
