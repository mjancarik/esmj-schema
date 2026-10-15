# Symbol-keyed fields — verification summary

Historical evidence from 2026-10-11–14, not a verification of the current checkout
or release approval. Superseded candidates are labeled below; their failures do
not establish the performance of later source. See [the design summary](symbol-keyed-fields-design.md)
for retained decisions and [the testing guide](../TESTING.md) for current checks.

## Correctness evidence

- Initial retained regression run: 11 new runtime tests, 9 failed and 2 passed.
  Typecheck exposed an accepted invalid Symbol schema definition through an
  unused expected-error annotation. The mutable-Symbol implementation then
  passed 501 tests, types, lint, build, 7 strict built-declaration consumers and
  14 isolated ESM/CJS entrypoint checks.
- Fixed snapshots passed 506 tests, types, lint, build, strict/strict-null Symbol
  fixtures, all 7 built-declaration consumers and all 14 runtime entrypoint checks.
- The last entry in the old report (describe all captured fields, 2026-10-14)
  records `npm run agent:doctor` and `npm run agent:verify` passing, exit 0:
  508 tests, types, lint (47 files), build, 7 declaration entrypoints and 7 gzip
  budgets; reported core gzip 2.59 kB. Benchmarks were not rerun for that change.

## Performance and size conclusions

Pinned pre-Symbol baseline: `c335e10b4311e673fd80c1acb3107db6810962a6`.
Environment for the snapshot comparison: macOS, Node 24.18.0, npm 11.16.0,
TypeScript 6.0.2, Biome 1.9.4, esbuild 0.27.4.

| Historical candidate / comparison | Important result |
| --- | --- |
| Mutable Symbols vs pre-Symbol, unchanged full benchmark | Construction -1.06%, valid parsing -10.74%, invalid parsing -5.44%; non-regression failed. |
| Initial fixed snapshots vs pinned baseline, unchanged full benchmark | Construction -10.54%, valid parsing -14.40%, invalid parsing -13.23%; non-regression failed. |
| Initial fixed snapshots, retained alternating benchmark | Exit 1; construction/first-parse and several invalid workloads regressed despite some faster valid parsing. |
| Prototype-map experiment vs tuples | Parsing regressed across tiny/nested/Symbol shapes; rejected as a performance improvement. |
| Final flat arrays vs map experiment, observable result sink | Parsing improved across measured shapes; strict gate still exited 1 because tiny construction regressed 9.79%. Not a pre-Symbol comparison. |

Initial fixed-snapshot source core measured 7,744 raw / 2,924 gzip bytes versus
7,278 / 2,725 pre-Symbol. Fresh built core was 7,744 / 2,912 versus mutable-Symbol
7,848 / 2,889: raw decreased but gzip increased. The requested raw-and-gzip
reduction therefore failed for that candidate. These esbuild probes are not
interchangeable with published-subpath `@esmj/size` budgets.

## Interpretation limits

- The original strict no-regression requirement was not proven by these reports.
  Passing correctness or size budgets does not turn a failed performance gate green.
- Earlier discarded-result timings cannot be combined with later observable-sink
  timings. Construction samples were highly variable; means do not prove a V8 cause.
- Later parser-hook optimizations and owner acceptance of trade-offs are outside
  this report's evidence window; do not apply obsolete blocker labels to them.
- Remote CI, consumer integration/browser adoption and publication were not run
  in these reports. Temporary log paths, session transcripts and superseded
  implementation checklists are intentionally omitted; consult Git history if needed.