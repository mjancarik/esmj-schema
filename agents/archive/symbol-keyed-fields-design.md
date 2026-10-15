# Symbol-keyed fields — design summary

Historical rationale, condensed from the 2026-10-10–14 implementation notes.
Not an active plan or approval for further changes. Current public behavior is
documented in [the package README](../../README.md#symbol-keyed-object-fields);
historical measurements are in [the verification summary](symbol-keyed-fields-verification.md).

## Problem and chosen approach

Object schemas previously skipped declared Symbol fields, silently losing IDs
and accepting invalid or missing values. Symbol-keyed definition values also
escaped the TypeScript schema constraint. Extend `s.object()` rather than add a
separate primitive: validate declared Symbols by identity and retain precise
unique-Symbol inference.

## Retained design decisions

- Capture a fixed shallow snapshot at construction: enumerable strings in
  `for...in` order (including inherited strings), then own enumerable Symbols.
  Later definition-map, prototype or enumerability edits do not affect it.
- Store keys and schema references in parallel arrays; use indexed parsing.
  Do not capture child `_parse` functions: child modifiers remain live and
  shallow clones share child schemas.
- Evaluate included getters once. Definition mutation during construction is
  unsupported; no extra Symbol-membership pass is needed for getter side effects.
- Describe all captured fields in parsing order, including inherited strings.
  Introspection lazily creates a frozen null-prototype map without freezing input.
- Read declared input fields through normal property access, including inherited
  or non-enumerable input properties. Ignore undeclared Symbols and inherited or
  non-enumerable Symbol definition keys.
- Preserve defaults, context, early exit, shallow cloning and post-parse `derive()`
  semantics. Always-mode overrides retain spread behavior; missing-mode adds own
  enumerable Symbols after its existing string traversal. Overrides are not revalidated.
- Stringify diagnostic keys explicitly without changing the public error shape.
  Diagnostic text is not a lossless Symbol identity/path representation.
- Standard runtime validation supports Symbols. JSON Schema conversion rejects
  declared Symbols in the known composite/recorded pipe graph, including beneath
  replacement hints. Use a separate JSON-only schema for serialization.

## Boundaries and lessons

- Mutable definition maps, prototype-map reconstruction, own-only descriptions
  and two-pass getter-mutation support were superseded; do not restore them from
  earlier proposals.
- JSON graph inspection cannot discover arbitrary callback-generated shapes or
  pipeline stages assembled before adapter registration. It must not execute
  transforms or default factories.
- Composite input inference, output-prototype hardening and non-shared built-in
  Symbol-value error factories were separate concerns, not blanket fixes here.
- Symbols do not solve transport or equality boundaries: JSON and structured
  cloning omit Symbol keys. Consumer migration and release require separate approval.