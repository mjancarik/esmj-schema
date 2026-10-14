#!/usr/bin/env node
// agent:verify:quick — fast iteration checks only. Explicitly NOT the final
// gate; use agent:verify for that.

import { runGate } from './lib/run.mjs';

const code = runGate([
  { name: 'lint', command: 'npm', args: ['run', 'lint'] },
  { name: 'types', command: 'npm', args: ['run', 'typecheck'] },
]);

if (code === 0) {
  console.log(
    '\nagent:verify:quick passed — this is NOT the final gate. Run agent:verify before reporting done.',
  );
}

process.exit(code);
