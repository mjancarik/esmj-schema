---
name: repo-refactor
description: "Use when changing or deduplicating a shared API/type in this repository. Inspect existing callers and propose the contract change before migrating."
---

# Refactor or deduplicate shared code

1. Read [../../../AGENTS.md](../../../AGENTS.md),
   [../../../agents/WORKFLOW.md](../../../agents/WORKFLOW.md) (refactor flow),
   and [../../../agents/PROJECT.md](../../../agents/PROJECT.md) (module map,
   public API surface definition).
2. Identify the owner of the shared API/type and every caller: search
   `src/`, `examples/`, `README.md` code samples, and `benchmark/`.
3. Propose the new contract and the alternative(s) considered — any change to
   a subpath export (`package.json`'s `exports` map) is a public API change.
4. Get scoped approval before changing anything that affects public behavior
   (single-maintainer repo — see WORKFLOW.md).
5. Migrate the implementation, every caller, types, tests, and docs together
   in one change — not split across unrelated commits.
6. Run the full gate: `npm run agent:verify`.
7. Update the owning guide in `agents/` if the refactor changes a documented
   convention or command.
