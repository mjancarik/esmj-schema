#!/usr/bin/env node
// test:size / agent:test:size — measures real gzip bundle size of every published
// subpath against scripts/size-budgets.json. Requires dist/ to already exist
// (run agent:build first) — this script never builds or installs anything.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateBudgets } from './lib/size.mjs';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const distDir = join(repoRoot, 'dist');
const outputBytes = process.argv.includes('--bytes');

function formatSize(bytes) {
  return outputBytes ? `${bytes} bytes` : `${(bytes / 1024).toFixed(2)} kB`;
}

if (!existsSync(distDir)) {
  console.error(
    '\u2716 dist/ not found. Run "npm run agent:build" first — test:size never builds.',
  );
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
const budgets = JSON.parse(
  readFileSync(join(repoRoot, 'scripts/size-budgets.json'), 'utf8'),
);

const entries = Object.keys(pkg.exports ?? {}).map((subpath) =>
  subpath === '.' ? 'index' : subpath.replace(/^\.\//, ''),
);

const measurements = {};
let measurementFailed = false;

for (const entry of entries) {
  const importSpecifier = entry === 'index' ? pkg.name : `${pkg.name}/${entry}`;
  const code = `import { s } from '${importSpecifier}'; console.log(s);`;

  const result = spawnSync(
    'npx',
    ['--yes', '@esmj/size', '--local', '.', '--json', '--code', code],
    { cwd: repoRoot, encoding: 'utf8' },
  );

  if (result.error || result.status !== 0) {
    console.error(
      `\u2716 ${entry}: failed to measure size (${result.error?.message ?? result.stderr})`,
    );
    measurementFailed = true;
    continue;
  }

  try {
    measurements[entry] = JSON.parse(result.stdout).bundle.gzip.size;
  } catch {
    console.error(`\u2716 ${entry}: could not parse @esmj/size output`);
    measurementFailed = true;
  }
}

const { results, failed } = evaluateBudgets(measurements, budgets);

for (const r of results) {
  if (r.status === 'informational') {
    console.log(
      `\u26A0 ${r.entry}: ${formatSize(r.size)} gzip (no budget set — informational only)`,
    );
  } else if (r.status === 'fail') {
    console.error(
      `\u2716 ${r.entry}: ${formatSize(r.size)} gzip exceeds budget of ${formatSize(r.budget)}`,
    );
  } else {
    console.log(
      `\u2713 ${r.entry}: ${formatSize(r.size)} gzip (budget ${formatSize(r.budget)})`,
    );
  }
}

if (failed || measurementFailed) {
  console.error(
    '\ntest:size: one or more entries exceeded their budget or could not be measured.',
  );
  process.exit(1);
}

console.log('\ntest:size: all entries within budget.');
