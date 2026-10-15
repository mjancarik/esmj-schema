---
name: repo-commit
description: "Use when the user explicitly asks to commit changes on the current branch in git-cz / Conventional Commits format. Review scope, verify, stage intended files only, commit without switching branches, and never push. Creating or editing this skill is not a request to commit."
argument-hint: "Optional change scope or commit subject"
---

# Commit on the current branch

## Authorization and scope

- Run this workflow only for an explicit commit request or direct invocation of
  this skill. Requests to prepare a message, review changes or edit this skill
  do not authorize a commit.
- Read [repository policy](../../../AGENTS.md), [workflow](../../../agents/WORKFLOW.md)
  and [verification skill](../repo-verify/SKILL.md). Commit permission does not
  authorize new production fixes, dependency changes or release actions.
- Stay on the current branch. Never create/switch branches, amend, reset, stash,
  rebase, tag, version, publish or push as part of this workflow.

## 1. Inspect before staging

1. Record `git branch --show-current` and `git rev-parse HEAD`. If detached,
   stop and ask for a branch; do not choose one. Stop for unresolved conflicts
   or an in-progress merge/rebase/cherry-pick rather than completing it implicitly.
2. Inspect `git status --short`, `git diff`, `git diff --cached` and recent
   `git log -5 --format=%s`. Read relevant untracked files explicitly.
3. Identify the requested logical change. Preserve unrelated staged and unstaged
   work. If existing staged files or mixed-file hunks make the intended commit
   ambiguous, ask for scope before changing the index. Do not silently include
   another task's changes. An explicit request for all changes can authorize
   multiple logical changes, but not secrets or temporary artifacts.
4. Exclude secrets, dependency trees, temporary logs and repository-root `tmp/`
   artifacts. For archived notes, retain only durable rationale, important
   evidence and limitations; omit session transcripts and superseded plans.

## 2. Verify the intended change

1. Run `npm run agent:verify:all`; require exit 0. This includes doctor,
  guidance, the CI-parity gate, tooling and staged/unstaged whitespace checks.
2. On any failure, report the exact blocker and stop
   without committing; do not bypass checks or repair unrelated work implicitly.
3. Review build-generated changes, including manifest sideEffects updates.
   Include only artifacts belonging to the requested change. If verification
   leaves unrelated changes, preserve them and resolve commit scope explicitly.

## 3. Format and create the commit

Use the installed standalone git-cz entrypoint, not the ambiguous npm bin shim:

```sh
node node_modules/git-cz/bin/git-cz.js --non-interactive --dry-run --type=docs --subject="summarize archived design notes"
```

- In this checkout, `node_modules/.bin/git-cz` resolves to Commitizen's CLI.
  `npm run commit -- --non-interactive ...` therefore opens prompts and forwards
  unsupported flags to Git. Do not use that route for automated commits or change
  the package script/dependencies as part of a commit request.
- First run the standalone command with `--dry-run` and the intended options.
  Confirm the displayed message and that the Git command contains no git-cz-only
  flags. Dry-run formats the message without creating a commit or running hooks;
  it is not a substitute for verification. For the real commit, use the identical
  standalone command with only `--dry-run` removed.
- Choose the type/subject from the actual diff, not the example. Add `--scope`
  only when useful; optional `--body`, `--breaking` and `--issues` must describe
  verified changes or user-provided references, never invented issue numbers.
- Derive routine metadata from the reviewed diff: choose the type and imperative
  subject, omit an unnecessary scope/body, and omit breaking/issue fields unless
  supported by evidence. Ask only for ambiguous scope or information required by
  the user, not confirmation of every message field. If a body needs line breaks,
  pass real newlines rather than literal `\n` sequences.
- Respect the effective git-cz configuration (including any parent configuration)
  and commitlint. Defaults produce `type(scope): emoji subject`: `feat` 🎸,
  `fix` 🐛, `docs` ✏️, `chore` 🤖, `refactor` 💡, `perf` ⚡️, `test` 💍,
  `style` 💄, `ci` 🎡. Keep the subject short, imperative and without a final dot.
  Let git-cz supply the emoji; do not embed it again in `--subject`.
- Stage explicit paths with `git add -- <paths>`; never blanket `git add .`
  or `git add -A`. Inspect the entire staged diff and run `npm run agent:check:whitespace`
  again after staging to check the updated index.
  If nothing intended is staged, report that there is nothing to commit.
- Recheck branch and HEAD against the recorded values immediately before the
  commit, and confirm the index still matches the reviewed staged diff. Stop if
  any changed; do not commit concurrently on another branch or include new work.
- Run the real non-interactive command once. If it unexpectedly prompts, stop
  and diagnose the executable rather than walking through routine questions.
  Keep hooks enabled: no `--no-verify`,
  `HUSKY=0` or similar bypass. If hooks fail or modify files, inspect and report;
  do not blindly retry, restage everything or amend.

## 4. Confirm the result

Check the commit command's exit code, `git log -1 --format=fuller --stat` and
`git status --short`. Confirm the parent is the recorded HEAD and the branch
is unchanged. Report the commit hash, subject, branch, exact checks/counts/exit
codes, and any remaining changes or checks not run. Do not claim a clean tree
unless verified. Do not push.