# Repository agent policy

Read [agents/README.md](agents/README.md) and only the guides relevant to the task.

- Use the `agent:*` npm scripts documented in [agents/TESTING.md](agents/TESTING.md) for checks.
	Start with `npm run agent:doctor`; a quick pass is never the final gate — see
	[agents/WORKFLOW.md](agents/WORKFLOW.md).
- Run `agent:*` checks directly, without `awk`/`tail` pipelines, shell
	exit-code bookkeeping, or ad hoc duplicate checks/measurement scripts.
	If output or coverage is insufficient, propose extending the owning script.
	Use `npm run agent:verify:all` for complete final verification.
- Preserve existing work, in-progress diffs and test assertions. Never run a
	blanket `git reset`/`stash`/cleanup.
- Search existing helpers, callers and types before adding or changing shared
	behavior (see [agents/PROJECT.md](agents/PROJECT.md) for module layout).
- For bugs: establish an expected failing regression test and identify the
	owning module before changing code — see
	[.agents/skills/repo-bugfix/SKILL.md](.agents/skills/repo-bugfix/SKILL.md).
- For shared-API changes or deduplication, follow
	[.agents/skills/repo-refactor/SKILL.md](.agents/skills/repo-refactor/SKILL.md):
	inspect callers, propose the contract change, migrate callers/types/tests/docs
	together.
- Substantial changes, new dependencies and production fixes need explicit
	approval from the repository owner — see [agents/WORKFLOW.md](agents/WORKFLOW.md).
- Report exact verification scope: commands run, counts, exit codes, and any
	checks not run. Never claim a gate passed without running it.
- Use terminal output by default; do not save logs or create scratch files
	for every command. Only when temporary artifacts are needed, store them
	under [tmp/](tmp/) in the repository root (not system `/tmp/`) and keep
	their contents out of git-tracked content.
- Update the owning guide in [agents/](agents/) in the same change as any
	command, contract or convention change it documents.
