// Pure, testable guidance-link/skill-frontmatter validation logic, shared by
// scripts/agent/check-guidance.mjs and its tooling regression tests.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

export function checkGuidance(root) {
  const errors = [];
  let checked = 0;

  function reportError(file, message) {
    errors.push(`${relative(root, file)}: ${message}`);
  }

  function checkMarkdownLinks(file) {
    const text = readFileSync(file, 'utf8');
    const linkPattern = /\]\(([^)]+)\)/g;
    for (const match of text.matchAll(linkPattern)) {
      const target = match[1];
      if (/^([a-z]+:)?\/\//i.test(target) || target.startsWith('mailto:')) {
        continue;
      }
      const [pathPart] = target.split('#');
      if (!pathPart) continue;
      const resolved = join(dirname(file), pathPart);
      checked += 1;
      if (!existsSync(resolved)) {
        reportError(file, `dangling link target: ${target}`);
      }
    }
  }

  function checkSkillFrontmatter(skillFile, expectedFolderName) {
    const text = readFileSync(skillFile, 'utf8');
    const fmMatch = text.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) {
      reportError(skillFile, 'missing YAML frontmatter block (--- ... ---)');
      return;
    }
    const fm = fmMatch[1];
    const nameMatch = fm.match(/^name:\s*(.+)$/m);
    const descMatch = fm.match(/^description:/m);
    if (!nameMatch) {
      reportError(skillFile, 'frontmatter missing "name"');
    } else {
      const name = nameMatch[1].trim().replace(/^['"]|['"]$/g, '');
      if (name !== expectedFolderName) {
        reportError(
          skillFile,
          `frontmatter name "${name}" must match folder name "${expectedFolderName}"`,
        );
      }
      if (!/^[a-z0-9-]{1,64}$/.test(name)) {
        reportError(
          skillFile,
          `frontmatter name "${name}" must be lowercase alphanumeric + hyphens, 1-64 chars`,
        );
      }
    }
    if (!descMatch) {
      reportError(skillFile, 'frontmatter missing "description"');
    }
    checkMarkdownLinks(skillFile);
  }

  function walkSkillDirs(dir) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const subdir = join(dir, entry);
      if (!statSync(subdir).isDirectory()) continue;
      const skillFile = join(subdir, 'SKILL.md');
      if (existsSync(skillFile)) {
        checkSkillFrontmatter(skillFile, entry);
      } else {
        reportError(subdir, 'skill directory missing SKILL.md');
      }
    }
  }

  const markdownFiles = [
    join(root, 'AGENTS.md'),
    join(root, 'CLAUDE.md'),
    join(root, 'agents/README.md'),
    join(root, 'agents/PROJECT.md'),
    join(root, 'agents/TESTING.md'),
    join(root, 'agents/WORKFLOW.md'),
    join(root, 'agents/CLIENTS.md'),
    join(root, 'agents/DECISIONS.md'),
    join(root, 'agents/EVALUATION.md'),
  ].filter(existsSync);

  for (const file of markdownFiles) {
    checkMarkdownLinks(file);
  }

  for (const required of ['AGENTS.md', 'agents/README.md']) {
    if (!existsSync(join(root, required))) {
      reportError(join(root, required), 'required canonical file is missing');
    }
  }

  const agentsMdPath = join(root, 'AGENTS.md');
  if (existsSync(agentsMdPath)) {
    const agentsMd = readFileSync(agentsMdPath, 'utf8');
    for (const bridge of ['CLAUDE.md', 'agent-router.mdc']) {
      if (agentsMd.includes(bridge)) {
        reportError(
          agentsMdPath,
          `must not reference bridge file "${bridge}" (would create a routing cycle)`,
        );
      }
    }
  }

  walkSkillDirs(join(root, '.agents/skills'));
  walkSkillDirs(join(root, '.claude/skills'));

  const cursorRule = join(root, '.cursor/rules/agent-router.mdc');
  if (existsSync(cursorRule)) {
    const text = readFileSync(cursorRule, 'utf8');
    if (!/^---\n[\s\S]*?\n---/.test(text)) {
      reportError(cursorRule, 'missing YAML frontmatter block (--- ... ---)');
    }
    checkMarkdownLinks(cursorRule);
  }

  return { errors, checked, markdownFileCount: markdownFiles.length };
}
