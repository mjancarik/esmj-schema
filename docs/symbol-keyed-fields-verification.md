# Symbol implementation verification — 2026-10-11

## Describe all captured fields — 2026-10-14

Owner approved removing the description-only inherited-field index array and
its checks. Descriptions now include every captured field in parsing order;
parsing is unchanged. Existing assertions now check inherited fields rather than
hiding them, including snapshot stability and multi-level prototype ordering.
Own-only description requirements in the historical reports below are superseded.

Verification: `npm run agent:doctor` and `npm run agent:verify` passed (exit 0):
508 tests, types, lint (47 files), build/all 7 declaration entrypoints and all
7 gzip budgets (core 2.59 kB). Bundles and generated side-effect chunk hashes
were refreshed. Benchmarks were not rerun.

## Single-pass Symbol capture — 2026-10-14

The owner explicitly dropped support for definition mutation during construction.
Symbol keys and schema references are now captured together in one indexed loop.
The getter hide/expose membership test was removed for this unsupported scenario;
the earlier two-pass requirement and its regression evidence below are historical.
Post-construction snapshots and shared live child schemas remain unchanged.

Verification: `npm run agent:doctor` and `npm run agent:verify` passed (exit 0):
508 tests, types, lint (47 files), build/all 7 declaration entrypoints and all
7 gzip budgets. Build refreshed bundles and generated side-effect chunk hashes.
Benchmarks were not rerun for this simplification; no speedup is claimed.

## Flat arrays simplification — 2026-10-14

Current source replaces prototype-map reconstruction with parallel `keys` and
schema-reference arrays. A separate array of field indices is used only for
descriptions. String capture uses `for...in`; Symbol capture, parsing,
descriptions, introspection and derive Symbol overrides use indexed `for`.
No prototype maps, owner searches, per-field tuples or duplicated parse loops
remain. A null-prototype map is created only for lazy frozen introspection.
Public snapshot behavior and live shared child parsers are unchanged.

Symbol membership is collected before reading Symbol schema getters. A retained
regression test exposed interleaved enumeration/getter capture (20 pass, 1 fail,
exit 1); the two-pass indexed capture fixes both hide/expose cases.

Verification:
- `npm run agent:doctor`: PASS, exit 0.
- Final `npm run agent:verify`: PASS, exit 0; **525 tests passed**, types,
  read-only lint (46 files), build/all 7 declaration entrypoints, published
  subpath gzip budgets all passed. Core reported **2.64 kB gzip**.
- Final verification log: `/tmp/esmj-schema-flat-final-verify.log`.
- Build regenerated sideEffects chunk names; no manual artifact edits or release.

The direct comparison runner now makes every timed result escape through a
global result slot, for both baseline and candidate. Therefore its numbers must
not be numerically combined with the historical discarded-result measurements.
Ten alternating one-second samples remain, with preconstructed schemas for
parse-only workloads. Saved map baseline: `/tmp/esmj-schema-map-before-flat.ts`.

The preliminary flat candidate (before the getter membership correction) showed
nested construction +3.81%, valid parsing +91.31%, invalid parsing +58.29%;
tiny construction -13.99%, so its strict gate FAILED. Raw samples are retained
at `/tmp/esmj-schema-flat-vs-map.log`. This is not the final source's timing.
Final source comparison is retained separately at
`/tmp/esmj-schema-flat-final-vs-map.log`.

Final flat-array comparison completed (exit 1), relative to the saved map:

| Shape | Construction | Valid parsing | Invalid parsing |
| --- | ---: | ---: | ---: |
| Tiny | -9.79% | +421.19% | +93.93% |
| Nested | +5.63% | +82.89% | +54.52% |
| Symbols | +2.59% | +40.70% | +23.14% |

All measured parsing workloads improved over the map candidate. The strict
all-workload non-regression gate still FAILED because tiny construction
regressed. Construction samples were variable; raw samples remain in the log.
These results compare only map versus flat arrays with the same observable
result sink, not flat arrays versus the original tuple or pre-Symbol baseline.

Neither passing current size budgets nor improvement over the failed map
candidate establishes pre-Symbol performance parity. The unchanged full
acceptance benchmark and pinned pre-Symbol comparison have NOT been rerun for
this simplification; the original performance requirement remains unproven.

## Map traversal experiment — 2026-10-12

At the user's request, the current candidate replaces tuple storage with a
captured field map: `for...in` traverses strings and an indexed loop traverses
construction-cached enumerable own Symbol keys. Captured prototype levels
preserve inherited numeric-string ordering; descriptions still include only
own fields. Child parsers remain live. Getter destinations are resolved before
evaluation so self-deleting getters cannot silently discard captured schemas.

`benchmark/snapshot.mjs` compares a saved pre-edit tuple source with the map
candidate through identical in-memory TypeScript loading, in one process.
Parsing uses already-constructed schemas. Each of nine workloads has ten
alternating approximately one-second samples, symmetric warmup and GC before
each sample. Raw sample vectors are retained; the strict all-workload gate is
not relaxed. This is a direct tuple/map experiment, NOT a replacement for the
existing pre-Symbol acceptance benchmark.

Initial map candidate (before getter-destination repair), versus saved tuple:

| Shape | Construction | Valid parsing | Invalid parsing |
| --- | ---: | ---: | ---: |
| Tiny | +0.17% | -85.95% | -51.46% |
| Nested | -7.07% | -44.82% | -36.66% |
| Symbols | -5.09% | -29.43% | -20.06% |

Gate FAILED. Tiny construction's first tuple sample was visibly low, so its
small positive mean is not evidence of a reliable construction improvement.
The final getter-safe candidate is measured separately; do not silently
attribute this initial timing to the final source. Null-prototype map storage,
separated loops and tuple removal changed together; this does not isolate a
V8 root cause or prove that `for...in` is universally slower.

Final getter-safe comparison completed with exit 1, gate FAILED:

| Shape | Construction | Valid parsing | Invalid parsing |
| --- | ---: | ---: | ---: |
| Tiny | +56.74% | -86.78% | -51.03% |
| Nested | -8.69% | -44.21% | -35.65% |
| Symbols | -6.06% | -28.46% | -20.64% |

Tiny construction varies substantially between runs; no reliable improvement
is claimed from that mean. Both direct comparisons show parsing regressions.
Results are specific to this harness/representation; returned results are
discarded during timing, so optimizer elimination is not explicitly prevented.
Do not interpret extreme tiny-schema throughput as isolated loop cost.
The unchanged full acceptance benchmark was NOT rerun for this failed map
experiment. Current source retains the requested map candidate, not a passing
performance optimization.

Correctness: full suite **524/524 passed** and project typecheck passed. After a
test-only reflective-deletion spelling change, both Symbol suites passed
**29/29**. Scoped source/test lint and build (all seven declaration entrypoints)
passed. Repository-wide lint was blocked by unrelated newly appearing agent
scripts; those files were not edited by this experiment.

Matched source probes (esbuild stdin with TypeScript loader, appended
`console.log(s)`, ES2022, ESM, minified, preserving the source's exports):
tuple **8,120 raw / 3,100 gzip**, map **8,516 raw / 3,232 gzip**.
These are not the historical tree-shaken import probes or published-package
sizes; only their within-probe delta (**+396 raw / +132 gzip**) is comparable.
The size-reduction goal remains unmet.

Local evidence:
- Saved tuple source: `/tmp/esmj-schema-tuple-before-map.ts`
- Initial comparison: `/tmp/esmj-schema-map-comparison.log` (FAILED)
- Final getter-safe comparison: `/tmp/esmj-schema-map-final-comparison.log`
- Full tests: `/tmp/esmj-schema-map-final-tests.log`
- Final Symbol tests: `/tmp/esmj-schema-map-final-symbol-tests.log`
- Build: `/tmp/esmj-schema-map-final-build.log`

## Fixed object snapshots — current work

The user approved fixed membership/schema-reference snapshots after clarifying
that external map mutation was not intended. This supersedes the mutable-map
contract in the historical report below, not its failed performance evidence.
**Snapshot acceptance BLOCKED: performance and core gzip-size gates FAILED.**
Correctness passes fresh verification; this is not a release-ready success.
Do not infer acceptance from either the historical or current passing tests.

Construction captures inherited/own enumerable strings in `for...in` order,
then own enumerable Symbols. Child schema references remain shared and mutable;
their current parsers are read per field per parse. Descriptions preserve
original own-only string visibility. Introspection lazily memoizes a frozen
null-prototype map, never the caller's map. Getters execute once at construction.
Map/prototype/enumerability edits cannot affect parsing or JSON introspection;
derive override objects remain parse-time data. Cyclic object coverage now uses
captured union links whose branch lists remain mutable.

### Fresh correctness verification

Environment: macOS, Node **24.18.0**, npm **11.16.0**, TypeScript **6.0.2**,
Biome **1.9.4**, esbuild **0.27.4**. Baseline is immutable pre-Symbol commit
`c335e10b4311e673fd80c1acb3107db6810962a6` (not moving HEAD).

Final commands were sequential; `/usr/bin/time -p` recorded wall times.

| Command/check | Result | Wall time |
| --- | --- | ---: |
| `npm test` | **506/506 passed**, 61 suites; no failures/skips/cancellations/todos; runner 590.349792 ms | 0.81 s |
| `npm run typecheck` | Passed | 1.16 s |
| `npm run lint` | Passed; 33 files, no fixes | 0.48 s |
| `npm run build` | Passed; all **7** declaration entrypoints; 5 generated sideEffects chunks reviewed | 5.84 s |
| Isolated fixture, `--strict` | Passed | 0.49 s |
| Isolated fixture, `--strictNullChecks` | Passed | 0.44 s |
| In-memory strict built declaration consumers | **7/7 passed**, `skipLibCheck: false` | 3.213550625 s |
| Fresh isolated built ESM/CJS runtime processes | **14/14 passed** | 0.704958917 s |
| `git diff --check` | Passed | Not individually timed |

Both isolated fixture commands used:
`node_modules/.bin/tsc --ignoreConfig --noEmit --strict --target es2022 --module es2022 --moduleResolution node --ignoreDeprecations 6.0 --allowImportingTsExtensions --skipLibCheck src/__tests__/object-symbols.types.ts`
and the same command with `--strictNullChecks` replacing `--strict`.
TypeScript 6 initially rejected commands without `--ignoreConfig`; both were
corrected and rerun successfully, not counted as successes on the initial attempt.

Built probes ran `node --input-type=module` with in-memory programs and isolated
child processes, across core/full/string/number/array/coerce/standard in both
formats. They checked captured references, external mutation isolation, frozen
null-prototype introspection, getters once, live child defaults, clone sharing,
invalid Symbol rejection, extension behavior, Standard validation and both JSON
drafts/modes. Declaration consumers checked unique Symbol `keyof`, optional and
nullable inference and expected failures for invalid inputs/definitions. An
initial consumer probe incorrectly imported a declaration filename as a value;
corrected extensionless module imports passed all seven consumers.

The first snapshot test run had **505 pass / 1 fail**: prototype-shadowed input
keys use normal property access, so `{}` supplies inherited `__proto__` rather
than `undefined`. The fixture now uses a null-prototype input. This preserves the
existing input/output prototype behavior instead of expanding scope. Special
snapshot keys `__proto__`, `constructor`, `toString` are retained safely by the
null-prototype introspection map; parsed-output prototype redesign is NOT DONE.

Final core source SHA-256:
`6b677be6df92bdb234780cf047e424f6e7d259341390c8e86864012f7a0329b5`.
The timed candidate preceded the final lint-only split of
`return (snapshot = Object.freeze(map))` into assignment plus return. No timed
parse/construction loop changed; the final spelling was rechecked/rebuilt but
NOT separately rebenchmarked. The failed timing evidence is not upgraded to a
claim about a passing final candidate.

### Fresh full benchmark — FAILED

The unchanged full `npm run benchmark` harness completed all libraries and
workloads, ten approximately one-second samples per participant. Baseline used
`NODE_OPTIONS="--import=data:text/javascript;base64,$preload" /usr/bin/time -p npm run benchmark`:
the in-memory preload calls Node `registerHooks()` to serve
`stripTypeScriptTypes(git show c335e10b4311e673fd80c1acb3107db6810962a6:src/index.ts)`
only for the resolved core source URL, leaving every other import unchanged.
It prints the pinned commit in the log. No source checkout, cherry-pick or
temporary source writes were used. Candidate command: `/usr/bin/time -p npm run benchmark`.

| Existing workload | Baseline ops/s | Snapshot ops/s | Throughput change | Baseline/snapshot latency, microseconds |
| --- | ---: | ---: | ---: | ---: |
| Construction | 641,906.68 | 574,240.05 | **-10.54%** | 1.557859 / 1.741432 |
| Valid parsing | 3,089,668.75 | 2,644,688.30 | **-14.40%** | 0.323659 / 0.378116 |
| Invalid parsing | 2,287,142.90 | 1,984,570.54 | **-13.23%** | 0.437227 / 0.503887 |

Wall times: baseline **360.75 s**, candidate **358.52 s**. No builds/tests or
other benchmark processes overlapped these timings. Existing historical logs
were inspected, but fresh pinned measurements above are the comparison.
An earlier shell-quoting error left an empty preload and started an invalid
baseline run; it was stopped/retained as invalid, never used in acceptance data.

### Retained alternating benchmark — FAILED (exit 1)

Command: `/usr/bin/time -p node --expose-gc benchmark/symbols.ts`.
Wall time **2300.84 s** (observed wall time, not claimed to equal nominal sample
duration). The retained runner pins the same commit, warms both implementations,
alternates order, retains all ten baseline/candidate samples for each workload,
and requires every candidate mean to be at least baseline. No tolerance or
retries were introduced to manufacture a passing result.

| Workload | Baseline ops/s | Snapshot ops/s | Change | Gate |
| --- | ---: | ---: | ---: | --- |
| Nested construction | 2,633,728.67 | 1,915,111.08 | -27.29% | FAIL |
| Nested valid parsing | 3,495,375.65 | 3,832,283.87 | +9.64% | PASS |
| Nested invalid parsing | 4,015,405.78 | 3,982,168.37 | -0.83% | FAIL |
| Empty construction | 15,320,606.11 | 11,114,361.26 | -27.45% | FAIL |
| Empty first parse including construction | 12,142,521.68 | 9,504,177.53 | -21.73% | FAIL |
| Empty valid parsing | 45,315,286.42 | 55,909,681.52 | +23.38% | PASS |
| Empty invalid parsing | 22,542,474.99 | 18,216,848.80 | -19.19% | FAIL |
| Tiny construction | 8,581,210.82 | 6,017,224.22 | -29.88% | FAIL |
| Tiny first parse including construction | 5,971,441.41 | 4,205,259.03 | -29.58% | FAIL |
| Tiny valid parsing | 18,425,486.83 | 20,446,779.50 | +10.97% | PASS |
| Tiny invalid parsing | 12,008,189.09 | 11,222,387.69 | -6.54% | FAIL |
| Defaults construction | 5,504,349.60 | 4,174,870.60 | -24.15% | FAIL |
| Defaults first parse including construction | 3,513,372.53 | 2,658,660.74 | -24.33% | FAIL |
| Defaults valid parsing | 9,555,256.68 | 10,121,861.95 | +5.93% | PASS |
| Defaults invalid parsing | 7,368,577.94 | 6,990,721.29 | -5.13% | FAIL |
| Nested first parse including construction | 1,367,696.67 | 1,170,990.42 | -14.38% | FAIL |

Symbol-only candidate measurements (no equivalent old parser; not a baseline gate):
nested defaults **4,057,551.81 ops/s**, construction **730,101.93**, first parse
including construction **724,859.73**, repeated valid parsing **11,715,911.64**,
invalid parsing **6,358,062.71**. Each measured for approximately one second;
correctness assertions run before timings. Full sample vectors and latency
values are retained in the alternating log rather than cherry-picked.

Local logs (temporary artifacts, not repository files):
- `/tmp/esmj-schema-symbol-snapshot-pinned-baseline-benchmark.log`
- `/tmp/esmj-schema-symbol-snapshot-candidate-benchmark.log`
- `/tmp/esmj-schema-symbol-snapshot-alternating-benchmark.log`
- `/tmp/esmj-schema-symbol-snapshot-final-{test,typecheck,lint,build}.log`

### Matched fresh size evidence — gzip gate FAILED

In-memory esbuild probes: `bundle: true`, `minify: true`, `format: 'esm'`,
`target: 'es2022'`, `write: false`; Node `gzipSync()` defaults. Identical
`import { s } from <entry>; console.log(s);` snippets for core/full; Standard
imports core `s` and the adapter for side effects, then logs `s`. Pinned baseline
source is loaded by an in-memory esbuild plugin reading `git show`; no emitted
baseline files. Built probes use fresh dist modules after `npm run build`.

| Source entry | Pre-Symbol raw/gzip | Mutable-Symbol raw/gzip | Final snapshot raw/gzip |
| --- | ---: | ---: | ---: |
| Core | 7,278 / 2,725 | 7,848 / 2,901 | **7,744 / 2,924** |
| Full | 11,932 / 3,668 | 12,502 / 3,843 | 12,398 / 3,867 |
| Standard | 11,147 / 4,141 | 12,328 / 4,495 | 12,224 / 4,527 |

| Fresh built entry | Mutable-Symbol raw/gzip | Final snapshot raw/gzip | Raw/gzip delta |
| --- | ---: | ---: | ---: |
| Core | 7,848 / 2,889 | **7,744 / 2,912** | **-104 / +23** |
| Full | 12,502 / 3,832 | 12,398 / 3,851 | -104 / +19 |
| Standard | 12,329 / 4,489 | 12,226 / 4,514 | -103 / +25 |

Core source delta versus pre-Symbol: **+466 raw / +199 gzip**. Snapshot raw
size is smaller than mutable-Symbol, but gzip is not: the requested requirement
to reduce BOTH is unmet. A local description/introspection simplification was
attempted, with all measurements retained: initial snapshot core source
**7,720 / 2,929**, built **7,720 / 2,916**; compact expression variant source
**7,742 / 2,923**, built **7,742 / 2,911**; final lint-compliant values above.
No smaller-raw or faster-parsing metric is used to excuse failed gzip or
construction gates. `@esmj/size` published-package measurement was NOT RUN;
README's existing general size claims were not changed using these probes.

### Remaining blockers and boundaries

- Full/alternating performance non-regression: **FAILED**, construction included.
- Core raw-plus-gzip reduction: **FAILED** (raw improves, gzip increases).
- No shared-prototype/method redesign, dynamic compilation, dependencies or
  output-prototype repair was attempted to hide these scoped blockers.
- Remote CI, consumer integration/browser tests, release/publication: **NOT RUN**.
- No commit, tag, version, push, release or consumer changes. Existing unrelated
  edits, including Standard adapter behavior and type fixtures, remain preserved.
- Source edits used patches only; formatter output was read-only before patches.
  Recursive searches excluded `.history`, backup directories, `*.bak` and `*~`.

## Historical mutable-Symbol candidate (before fixed snapshots)

**Status: implementation candidate; acceptance BLOCKED by performance regression.**
Do not release or regard this work as satisfying the requested no-worse benchmark
criterion. No commits, tags, push, publication or consumer updates were performed.

## Implemented

- Explicit own enumerable Symbol definition fields validate and survive parsing.
- String enumeration/order, input property access, context/defaults/modifiers,
  mutable definitions and shallow cloning remain supported.
- Symbol definition values must be schemas; unique Symbol inference is retained.
- Descriptions, missing-mode derive and shared diagnostic formatting support Symbols.
- Standard JSON conversion rejects known Symbol definitions through nested composites,
  replacement hints and tracked pipe stages, including retagged composites.
- Standard clones validate through their own parser.

## Correctness evidence

Environment: macOS, Node 24.18.0, TypeScript 6.0.2.

Retained initial red run: 11 new runtime tests, 9 failures and 2 passes;
`npm run typecheck` failed on an unused expected-error annotation for an invalid
Symbol schema definition. Final suite: **501 passed**, 61 suites, no failures,
skips, cancelled tests or todos. Original 479 assertions remain.

| Command/check | Result | Wall time |
| --- | --- | --- |
| `npm run test` | 501 passed; runner duration 826.892584 ms | 1.79 s |
| `npm run typecheck` | Passed | 0.92 s |
| `npm run lint` | Passed; 33 files, no fixes | 0.49 s |
| `npm run build` | Passed, all 7 declaration entrypoints | 6.27 s |
| Isolated Symbol fixture with `--strictNullChecks` | Passed | Not individually timed |
| Strict in-memory consumers against all 7 built declarations | Passed | Not individually timed |
| ESM/CJS isolated-process subpath smoke checks | All 14 passed | Not individually timed |
| `git diff --check` | Passed | Not individually timed |

Built smoke checks tested core/full/string/number/array/coerce/standard preservation
and invalid Symbol-field rejection, plus Standard runtime validation/JSON rejection.
Build-generated manifest changes are limited to sideEffects chunk hashes; reviewed,
not reset. Generated artifacts were not manually edited.

## Mandatory benchmark — FAILED

The unchanged `npm run benchmark` harness completed before and after production
edits (all libraries/scenarios, ten approximately one-second samples per participant).
Throughput averages for the existing `@esmj/schema` workloads:

| Scenario | Baseline ops/s | Candidate ops/s | Change |
| --- | ---: | ---: | ---: |
| Construction | 645,280.03 | 638,430.69 | -1.06% |
| Valid parsing | 3,039,457.88 | 2,712,884.77 | -10.74% |
| Invalid parsing | 2,244,507.33 | 2,122,357.27 | -5.44% |

The retained `node --expose-gc benchmark/symbols.ts` comparison alternates baseline
and candidate order, preserves all ten samples and fails with exit 1 if any mean
throughput is below baseline. It imports the unchanged HEAD core via an in-memory
transpilation; HEAD must still refer to the pre-feature revision when repeating it.

- First candidate: valid nested parsing -23.74%, invalid -6.71%.
- Lazy error allocation plus isolated Symbol helper: construction -3.10%, valid
  nested parsing -18.98%, invalid -4.33%.
- Additional local option/input access optimization: construction -3.22%, valid
  -19.11%, invalid -3.42%. This unsuccessful optimization was reverted.

All runs failed the gate; none was discarded to claim success. The string-only
path must inspect mutable definitions for newly added Symbols on each successful
parse. Key caching or freezing would violate the approved behavior and was not used.
Further optimization or an explicitly approved contract redesign is needed. No
performance tolerance was added and no benchmark assertions were weakened.

Logs are local temporary artifacts: baseline, candidate, red, build and alternating
comparison logs have the `esmj-schema-symbol-` prefix in the system temporary directory.
Benchmark wall times were not independently recorded; samples/harness duration are
reported rather than inventing timings.

## Size evidence

Identical esbuild ESM minified `console.log(s)` source-bundle probes against HEAD
and candidate, target ES2022 (raw/gzip bytes):

| Entry | Baseline raw/gzip | Candidate raw/gzip | Gzip delta |
| --- | ---: | ---: | ---: |
| Core | 7,278 / 2,725 | 7,848 / 2,901 | +176 |
| Full | 11,932 / 3,668 | 12,502 / 3,843 | +175 |
| Standard | 11,147 / 4,141 | 12,328 / 4,495 | +354 |

These are matched source-bundle measurements, not the established `@esmj/size`
published-package measurement. That tool was NOT RUN; README size claims were
not refreshed from these differently configured measurements.

## Remaining gates

Performance non-regression remains FAILED. CI remote execution, consumer
unit/integration/browser adoption checks and publication were NOT RUN. Pipelines
assembled before adapter registration and arbitrary callback-generated output
remain outside tracked JSON graph introspection. Existing composite input inference
and non-shared built-in Symbol-value message factories are not repaired in this slice.