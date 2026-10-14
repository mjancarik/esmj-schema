---
name: repo-bugfix
description: "Use when fixing a bug, regression, or failing test in this repository. Establish a retained red regression test and root cause before changing code."
---

# Fix a bug or regression

1. Read [../../../AGENTS.md](../../../AGENTS.md) and
   [../../../agents/WORKFLOW.md](../../../agents/WORKFLOW.md) (bugfix flow)
   and [../../../agents/PROJECT.md](../../../agents/PROJECT.md) (module map,
   to find the owning file).
2. State the expected behavior precisely before touching code.
3. Add or extend a test in `src/__tests__/*.test.mjs` that fails for the
   *expected* reason. Run it (`npm run agent:test:unit -- <file>`) and confirm
   it is red for the right reason — not an unrelated error.
4. Identify the owning module (core `src/index.ts` vs. a type-specific
   extender vs. `src/standard.ts`) and search for existing helpers/callers
   before editing — don't duplicate logic that already exists elsewhere.
5. If the fix is substantial or changes public behavior, get explicit
   approval first (single-maintainer repo — see WORKFLOW.md).
6. Make the narrowest correction that fixes the root cause. Do not refactor
   unrelated code in the same change.
7. Confirm the same regression test goes green, then run the full gate:
   `npm run agent:verify`.
8. Report the retained test name, root cause, and full verification evidence.
