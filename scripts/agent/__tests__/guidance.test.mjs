import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { checkGuidance } from '../lib/guidance.mjs';

function makeValidFixture() {
  const root = mkdtempSync(join(tmpdir(), 'agent-guidance-valid-'));
  mkdirSync(join(root, 'agents'), { recursive: true });
  mkdirSync(join(root, '.agents/skills/repo-verify'), { recursive: true });

  writeFileSync(
    join(root, 'AGENTS.md'),
    '# Policy\n\nSee [agents/README.md](agents/README.md).\n',
  );
  writeFileSync(
    join(root, 'agents/README.md'),
    '# Router\n\nSee [AGENTS.md](../AGENTS.md).\n',
  );
  writeFileSync(
    join(root, '.agents/skills/repo-verify/SKILL.md'),
    '---\nname: repo-verify\ndescription: "Use when verifying."\n---\n\n# Verify\n',
  );
  return root;
}

test('checkGuidance passes on a minimal valid fixture', () => {
  const root = makeValidFixture();
  const { errors } = checkGuidance(root);
  assert.deepEqual(errors, []);
  rmSync(root, { recursive: true, force: true });
});

test('checkGuidance reports a dangling link', () => {
  const root = makeValidFixture();
  writeFileSync(
    join(root, 'AGENTS.md'),
    '# Policy\n\nSee [nope](agents/DOES-NOT-EXIST.md).\n',
  );
  const { errors } = checkGuidance(root);
  assert.ok(errors.some((e) => e.includes('dangling link')));
  rmSync(root, { recursive: true, force: true });
});

test('checkGuidance reports a skill name/folder mismatch', () => {
  const root = makeValidFixture();
  writeFileSync(
    join(root, '.agents/skills/repo-verify/SKILL.md'),
    '---\nname: wrong-name\ndescription: "Use when verifying."\n---\n\n# Verify\n',
  );
  const { errors } = checkGuidance(root);
  assert.ok(errors.some((e) => e.includes('must match folder name')));
  rmSync(root, { recursive: true, force: true });
});

test('checkGuidance reports missing skill frontmatter description', () => {
  const root = makeValidFixture();
  writeFileSync(
    join(root, '.agents/skills/repo-verify/SKILL.md'),
    '---\nname: repo-verify\n---\n\n# Verify\n',
  );
  const { errors } = checkGuidance(root);
  assert.ok(errors.some((e) => e.includes('missing "description"')));
  rmSync(root, { recursive: true, force: true });
});

test('checkGuidance reports a routing cycle back into AGENTS.md', () => {
  const root = makeValidFixture();
  writeFileSync(
    join(root, 'AGENTS.md'),
    '# Policy\n\nSee [CLAUDE.md](CLAUDE.md) and [agents/README.md](agents/README.md).\n',
  );
  const { errors } = checkGuidance(root);
  assert.ok(errors.some((e) => e.includes('routing cycle')));
  rmSync(root, { recursive: true, force: true });
});
