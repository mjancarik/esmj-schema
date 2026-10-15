---
name: repo-verify
description: "Use when testing, checking lint/types/builds, diagnosing verification failures, preparing CI or reporting completion in this repository. Follow the agent:* npm scripts and report exact evidence."
---

# Verify repository changes

1. Read [../../../AGENTS.md](../../../AGENTS.md) and [../../../agents/TESTING.md](../../../agents/TESTING.md).
2. Preserve the current diff — do not stash, reset, or clean unrelated files.
3. Run `npm run agent:doctor` (read-only preflight).
4. Select appropriate checks via the documented `agent:*` interface:
   - Fast iteration: `npm run agent:verify:quick` (lint + types only — **never
     the final gate**).
    - Complete final gate: `npm run agent:verify:all` (doctor → guidance →
       `agent:verify` → tooling → staged/unstaged whitespace).
    - CI-parity gate for iteration: `npm run agent:verify` (test → types →
       lint → build → size, mirrors CI's job order).
   - Focused tests: `npm run agent:test:unit -- <file-or-dir>` or
     `-- --test-name-pattern "<pattern>"`.
5. Run these predefined commands directly, without shell output filters,
   exit-code bookkeeping or ad hoc duplicate check/measurement scripts. Propose
   extending the owning command if needed. A focused/quick pass only supports
   iteration; reporting "done" requires `agent:verify:all` to have run and passed.
6. Report exact commands run, pass/fail counts, exit codes, and any step that
   did NOT run (e.g. a gate stopped early) — never imply a step passed if it
   wasn't executed.
7. Do not auto-fix failures. Route any required correction through
   [../../../agents/WORKFLOW.md](../../../agents/WORKFLOW.md).
