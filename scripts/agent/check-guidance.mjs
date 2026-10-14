#!/usr/bin/env node
// agent:check:guidance — CLI wrapper. See lib/guidance.mjs for the logic
// (kept separate so scripts/agent/__tests__ can exercise it against isolated
// fixture directories instead of this repo's real guidance files).

import { fileURLToPath } from 'node:url';
import { checkGuidance } from './lib/guidance.mjs';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const { errors, checked, markdownFileCount } = checkGuidance(repoRoot);

console.log(
  `checked ${checked} link(s) across ${markdownFileCount} guidance file(s).`,
);

for (const error of errors) {
  console.error(`\u2716 ${error}`);
}

if (errors.length > 0) {
  console.error(`\nagent:check:guidance found ${errors.length} issue(s).`);
  process.exit(1);
}

console.log(
  'agent:check:guidance: all guidance links, skill metadata, and routes are valid.',
);
