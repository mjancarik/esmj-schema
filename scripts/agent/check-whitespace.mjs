#!/usr/bin/env node
// Read-only checks of unstaged and staged tracked diffs; never stage or fix.
import { runGate } from './lib/run.mjs';

process.exit(
  runGate([
    { name: 'unstaged whitespace', command: 'git', args: ['diff', '--check'] },
    {
      name: 'staged whitespace',
      command: 'git',
      args: ['diff', '--cached', '--check'],
    },
  ]),
);
