# Client adapters

Verified against VS Code's own Copilot customization documentation at setup
time (bundled skill reference, 2026-10-12). Not independently re-verified
against Cursor's or Claude Code's install on this machine beyond what's noted.

| Client | Route | Status |
|---|---|---|
| VS Code + GitHub Copilot | `AGENTS.md` (native discovery, root) → `agents/README.md`. Skills at `.agents/skills/<name>/SKILL.md` (native Copilot skill location). | Native discovery confirmed via bundled docs; **do not also add `.github/copilot-instructions.md`** — Copilot's own guidance says use only one of `copilot-instructions.md` / `AGENTS.md`, and using both is a documented anti-pattern. |
| Cursor | `.cursor/rules/agent-router.mdc` (`alwaysApply: true`) → `AGENTS.md` → `agents/README.md`. No native skill discovery assumed; the rule links directly to the skill files under `.agents/skills/`. | Format proposed per current Cursor rule conventions (`.mdc` + frontmatter); **not runtime-verified** — no Cursor installed in this environment. Verify rule syntax against the installed Cursor version before relying on it. |
| Claude Code | Root import `CLAUDE.md` (`@AGENTS.md`) → `AGENTS.md` → `agents/README.md`. Thin per-skill adapters at `.claude/skills/<name>/SKILL.md` that only restate the skill's frontmatter and point back to the canonical `.agents/skills/<name>/SKILL.md` body (no duplicated body). | `@file` import syntax and `.claude/skills/` native discovery path are per Anthropic's documented conventions; **not runtime-verified** — no Claude Code CLI installed in this environment. |

## What "verified" means here

- *Native discovery confirmed*: the client's own bundled/official docs state
  it reads that file/path automatically.
- *Not runtime-verified*: the file was created per documented convention, but
  no actual client session was run in this environment to confirm the body
  loads. Treat as NOT RUN until you confirm it in that client.

## No duplicate policy

`AGENTS.md` is the only file with actual policy content. `CLAUDE.md` and
`.cursor/rules/agent-router.mdc` are bridges only — each is a few lines
pointing back to `AGENTS.md`. `.claude/skills/*/SKILL.md` adapters
(if ever needed because Claude Code doesn't scan `.agents/skills/`) must stay
metadata-only, referencing the canonical skill body, not copying it.
