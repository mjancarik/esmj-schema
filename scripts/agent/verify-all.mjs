#!/usr/bin/env node
// Complete agent gate: compose existing checks without shell pipelines.
import { runGate } from './lib/run.mjs';

process.exit(
  runGate(
    [
      'agent:doctor',
      'agent:check:guidance',
      'agent:verify',
      'agent:test:tooling',
      'agent:check:whitespace',
    ].map((name) => ({ name, command: 'npm', args: ['run', name] })),
  ),
);
