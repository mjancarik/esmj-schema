#!/usr/bin/env node
// agent:verify — the required gate. Mirrors .github/workflows/ci.yml's test
// job order (test -> typecheck -> lint -> build) and adds the size gate
// after the build. Stops at the first failure; later steps are NOT RUN.

import { runGate } from './lib/run.mjs';

const code = runGate([
  { name: 'test:unit', command: 'npm', args: ['run', 'agent:test:unit'] },
  { name: 'types', command: 'npm', args: ['run', 'typecheck'] },
  { name: 'lint', command: 'npm', args: ['run', 'lint'] },
  { name: 'build', command: 'npm', args: ['run', 'build'] },
  { name: 'test:size', command: 'npm', args: ['run', 'agent:test:size'] },
]);

process.exit(code);
