# Agent guide router

Pick the guide(s) relevant to the task. Don't load everything.

| Task | Guide |
|---|---|
| Understand stack, module layout, boundaries | [PROJECT.md](PROJECT.md) |
| Run checks, understand `agent:*` commands, test selection | [TESTING.md](TESTING.md) |
| Planning, approval, scoping, reuse, red→green workflow | [WORKFLOW.md](WORKFLOW.md) |
| Which editor/AI clients are wired and how | [CLIENTS.md](CLIENTS.md) |
| Why something was built/rejected a certain way | [DECISIONS.md](DECISIONS.md) |
| Historical Symbol-field design and verification | [Design summary](archive/symbol-keyed-fields-design.md), [verification summary](archive/symbol-keyed-fields-verification.md) |
| Setup acceptance checks and their results | [EVALUATION.md](EVALUATION.md) |
| Verify a change (test/lint/types/build/CI) | [../.agents/skills/repo-verify/SKILL.md](../.agents/skills/repo-verify/SKILL.md) |
| Fix a bug/regression | [../.agents/skills/repo-bugfix/SKILL.md](../.agents/skills/repo-bugfix/SKILL.md) |
| Refactor/dedupe a shared API | [../.agents/skills/repo-refactor/SKILL.md](../.agents/skills/repo-refactor/SKILL.md) |
| Commit requested changes on the current branch (git-cz) | [../.agents/skills/repo-commit/SKILL.md](../.agents/skills/repo-commit/SKILL.md) |

There is no `agents/domains/` yet — this is a single small package with one
flat test suite; add a domain guide only when a real recurring need justifies it.

Existing project docs this setup links to rather than duplicates:
[README.md](../README.md) (public API, usage), [CHANGELOG.md](../CHANGELOG.md).

[archive/](archive/) holds concise historical summaries, not active instructions
or session logs. Before committing archive material, retain only durable rationale,
important evidence and unresolved limits; omit superseded plans and session detail.
