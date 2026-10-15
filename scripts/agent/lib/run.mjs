// Shared helpers for scripts/agent/*.mjs wrappers.
// Read-only process execution with correct exit-code / signal propagation.

import { spawnSync } from 'node:child_process';

/**
 * Run a command synchronously, inheriting stdio, and return a numeric exit
 * code. If the child was terminated by a signal (e.g. SIGINT/cancellation),
 * re-raise that signal against this process instead of mapping it to a
 * fake "success" or swallowing it.
 */
export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...options,
  });

  if (result.error) {
    if (result.error.code === 'ENOENT') {
      console.error(`✖ command not found: ${command}`);
      return 127;
    }
    throw result.error;
  }

  if (result.signal) {
    process.kill(process.pid, result.signal);
    return 128;
  }

  return result.status ?? 0;
}

/**
 * Run one named step of a composed gate. Logs a clear header so a failing
 * gate composition (agent:verify) shows exactly which step stopped it.
 */
export function runStep(name, command, args, options) {
  console.log(`\n\u25B6 ${name}: ${[command, ...args].join(' ')}`);
  const code = run(command, args, options);
  if (code !== 0) {
    console.error(`\u2716 ${name} failed (exit ${code})`);
  } else {
    console.log(`\u2713 ${name} passed`);
  }
  return code;
}

/**
 * Run an ordered list of { name, command, args } steps. Stops at the first
 * non-zero exit code and reports every later step as NOT RUN, rather than
 * silently skipping them.
 */
export function runGate(steps) {
  const results = steps.map((step) => ({ name: step.name, code: null }));
  let exitCode = 0;
  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];
    const code = runStep(step.name, step.command, step.args, step.options);
    results[i].code = code;
    if (code !== 0) {
      const notRun = steps.slice(i + 1).map((s) => s.name);
      if (notRun.length > 0) {
        console.error(
          `\nNOT RUN (stopped by "${step.name}" failure): ${notRun.join(', ')}`,
        );
      }
      exitCode = code;
      break;
    }
  }
  console.log('\nGate summary:');
  for (const { name, code } of results) {
    const status = code === null ? 'NOT RUN' : code === 0 ? 'PASS' : 'FAIL';
    console.log(`${status} ${name} (exit ${code === null ? 'N/A' : code})`);
  }
  console.log(`Gate exit code: ${exitCode}`);
  return exitCode;
}
