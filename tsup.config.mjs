import { defineConfig } from 'tsup';

export default [
  defineConfig({
    entry: ['src/index.ts', 'src/full.ts', 'src/string.ts', 'src/number.ts', 'src/array.ts'],
    clean: true,
    minify: true,
    target: 'es2022',
    format: ['esm', 'cjs'],
    treeshake: true,
    shims: false,
    dts: true,
  }),
];
