// Typechecks every generated declaration file listed in package.json's
// `exports` map, in isolation, with `skipLibCheck: false`.
//
// Why this is needed: tsup's DTS bundler (rollup-plugin-dts) can silently
// drop type-only imports that are only referenced from a `declare module`
// augmentation block, producing a `dist/*.d.ts` that references names with
// no import for them (`TS2304: Cannot find name`). This only shows up in
// the bundled *artifact*, not in `src/*.ts` (which typechecks fine on its
// own), so `tsc` against the source is not sufficient to catch it. Running
// with `--skipLibCheck false` against each published entry point (the same
// way a strict consumer project would) is required to catch it.
//
// This script runs after `tsup --dts` as part of `npm run build`.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(fileURLToPath(import.meta.url), '../..');
const pkgPath = path.join(rootDir, 'package.json');
const tscBin = path.join(rootDir, 'node_modules', '.bin', 'tsc');

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

const dtsPaths = Object.entries(pkg.exports ?? {})
  .map(([entry, target]) => [entry, target?.types])
  .filter(([, types]) => typeof types === 'string');

if (dtsPaths.length === 0) {
  console.error('No "types" entries found in package.json "exports" map.');
  process.exit(1);
}

let hasErrors = false;

for (const [entry, types] of dtsPaths) {
  try {
    execFileSync(
      tscBin,
      ['--ignoreConfig', '--noEmit', '--skipLibCheck', 'false', types],
      { cwd: rootDir, stdio: 'pipe' },
    );
    console.log(`✔ ${entry} -> ${types}`);
  } catch (error) {
    hasErrors = true;
    console.error(`✘ ${entry} -> ${types}`);
    console.error(error.stdout?.toString() || error.message);
  }
}

if (hasErrors) {
  console.error(
    '\nType errors found in generated declaration files. See output above.',
  );
  process.exit(1);
}

console.log(
  `\nAll ${dtsPaths.length} declaration entry point(s) typecheck cleanly.`,
);
